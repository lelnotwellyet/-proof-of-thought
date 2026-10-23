import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { ThoughtData } from '../types/thought';
import {
  MARKETPLACE_HUB,
  MEMO_PROGRAM_ID,
  WalletSigner,
  fetchTokenOwner,
  parseMemos,
  sendSigned,
} from './marketplace';

/**
 * Bidding on devnet is Memo v1 only (the ThouGhtReg1stry program isn't deployed).
 * Every memo tags the marketplace hub so a single hub scan rebuilds the board:
 *
 *   POT_BID_OPEN:<mint>:<minPrice>                                 owner opens a round
 *   POT_BID:<mint>:<amountSol>:<bidder>                            bidder places/raises a bid
 *   POT_BID_CLOSE:<mint>                                           owner closes without selling
 *   POT_BID_ACCEPTED:<mint>:<winner>:<amountSol>                   owner sends the NFT to the winner
 *   POT_BID_SETTLED:<mint>:<amountSol>:<seller>:<creator>:<royalty> winner pays seller + creator royalty
 *
 * There is no on-chain escrow account without a deployed program, so a sale is
 * two signatures: the owner's accept moves the NFT, then the winner's settle
 * moves the SOL. Settling first checks the NFT really arrived.
 */

export const ROYALTY_BASIS_POINTS = 500; // 5%, matches sellerFeeBasisPoints at mint

const BOARD_TTL_MS = 20 * 1000;

export type Bid = {
  bidder: string;
  amountSol: number;
  signature: string;
};

export type BidRound = {
  mint: string;
  status: 'open' | 'accepted' | 'settled' | 'closed';
  minPrice: number;
  /** Highest first, one (latest) bid per bidder. */
  bids: Bid[];
  winner?: string;
  winningAmount?: number;
  acceptSignature?: string;
};

export type BidBoard = Map<string, BidRound>;

let boardCache: { at: number; board: BidBoard } | null = null;

export function invalidateBidBoard() {
  boardCache = null;
}

export function royaltySplit(amountSol: number, seller: string, creator: string) {
  const totalLamports = Math.round(amountSol * LAMPORTS_PER_SOL);
  // No royalty on a primary sale: the creator is the seller.
  const royaltyLamports =
    creator && creator !== seller
      ? Math.floor((totalLamports * ROYALTY_BASIS_POINTS) / 10000)
      : 0;
  return {
    totalLamports,
    royaltyLamports,
    sellerLamports: totalLamports - royaltyLamports,
  };
}

function memoInstruction(
  signer: PublicKey,
  text: string,
  tagged: PublicKey[]
): TransactionInstruction {
  const seen = new Set([signer.toBase58()]);
  const extra = tagged.filter((key) => {
    const id = key.toBase58();
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  return new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: [
      { pubkey: signer, isSigner: true, isWritable: false },
      ...extra.map((pubkey) => ({ pubkey, isSigner: false, isWritable: false })),
    ],
    data: Buffer.from(text, 'utf-8'),
  });
}

function sortBids(bids: Map<string, Bid>): Bid[] {
  return Array.from(bids.values()).sort((a, b) => b.amountSol - a.amountSol);
}

/** Replays every bidding memo on the hub (oldest first) into the current state per mint. */
export async function fetchBidBoard(connection: Connection, force = false): Promise<BidBoard> {
  if (!force && boardCache && Date.now() - boardCache.at < BOARD_TTL_MS) {
    return boardCache.board;
  }

  const sigs = await connection.getSignaturesForAddress(MARKETPLACE_HUB, { limit: 1000 });
  const rounds = new Map<string, BidRound & { bidMap: Map<string, Bid> }>();

  for (const s of sigs.reverse()) {
    if (s.err) continue;
    for (const memo of parseMemos(s.memo)) {
      if (!memo.startsWith('POT_BID')) continue;
      const parts = memo.split(':');
      const [kind, mint] = parts;
      if (!mint) continue;

      if (kind === 'POT_BID_OPEN') {
        const minPrice = parseFloat(parts[2]);
        rounds.set(mint, {
          mint,
          status: 'open',
          minPrice: isNaN(minPrice) ? 0 : minPrice,
          bids: [],
          bidMap: new Map(),
        });
        continue;
      }

      const round = rounds.get(mint);
      if (!round) continue;

      if (kind === 'POT_BID' && round.status === 'open') {
        const amountSol = parseFloat(parts[2]);
        const bidder = parts[3];
        if (bidder && !isNaN(amountSol) && amountSol > 0 && amountSol >= round.minPrice) {
          round.bidMap.set(bidder, { bidder, amountSol, signature: s.signature });
        }
      } else if (kind === 'POT_BID_CLOSE' && round.status === 'open') {
        round.status = 'closed';
      } else if (kind === 'POT_BID_ACCEPTED' && round.status === 'open') {
        round.status = 'accepted';
        round.winner = parts[2];
        round.winningAmount = parseFloat(parts[3]);
        round.acceptSignature = s.signature;
      } else if (kind === 'POT_BID_SETTLED' && round.status === 'accepted') {
        round.status = 'settled';
      }
    }
  }

  const board: BidBoard = new Map();
  rounds.forEach(({ bidMap, ...round }) => {
    board.set(round.mint, { ...round, bids: sortBids(bidMap) });
  });
  boardCache = { at: Date.now(), board };
  return board;
}

export async function fetchBids(connection: Connection, mintAddress: string): Promise<BidRound | null> {
  const board = await fetchBidBoard(connection, true);
  return board.get(mintAddress) ?? null;
}

async function feePayerOf(connection: Connection, signature: string): Promise<string | null> {
  const tx = await connection.getParsedTransaction(signature, {
    maxSupportedTransactionVersion: 0,
  });
  const key: any = tx?.transaction?.message?.accountKeys?.[0];
  return key ? (key.pubkey ?? key).toString() : null;
}

/** Owner opens a bidding round. minPrice 0 means "any bid". */
export async function openForBids(
  wallet: WalletSigner,
  connection: Connection,
  mintAddress: string,
  minPrice: number
): Promise<string> {
  if (!Number.isFinite(minPrice) || minPrice < 0) throw new Error('Enter a valid minimum.');
  const owner = await fetchTokenOwner(connection, mintAddress);
  if (owner && owner !== wallet.publicKey.toBase58()) {
    throw new Error('Only the current owner can open bidding.');
  }
  const mint = new PublicKey(mintAddress);
  const tx = new Transaction().add(
    memoInstruction(wallet.publicKey, `POT_BID_OPEN:${mintAddress}:${minPrice}`, [
      MARKETPLACE_HUB,
      mint,
    ])
  );
  const signature = await sendSigned(connection, wallet, tx);
  invalidateBidBoard();
  return signature;
}

export async function closeBidding(
  wallet: WalletSigner,
  connection: Connection,
  mintAddress: string
): Promise<string> {
  const tx = new Transaction().add(
    memoInstruction(wallet.publicKey, `POT_BID_CLOSE:${mintAddress}`, [
      MARKETPLACE_HUB,
      new PublicKey(mintAddress),
    ])
  );
  const signature = await sendSigned(connection, wallet, tx);
  invalidateBidBoard();
  return signature;
}

export async function placeBid(
  wallet: WalletSigner,
  connection: Connection,
  thought: ThoughtData,
  amountSol: number
): Promise<string> {
  if (!Number.isFinite(amountSol) || amountSol <= 0) throw new Error('Enter a bid above zero.');
  const me = wallet.publicKey.toBase58();
  const round = await fetchBids(connection, thought.mintAddress);
  if (!round || round.status !== 'open') throw new Error('This thought is not open for bids.');
  if ((thought.currentOwner || thought.author) === me) {
    throw new Error('You cannot bid on your own thought.');
  }
  if (amountSol < round.minPrice) {
    throw new Error(`Minimum bid is ${round.minPrice} SOL.`);
  }
  const top = round.bids[0];
  if (top && top.bidder !== me && amountSol <= top.amountSol) {
    throw new Error(`Bid more than the top bid of ${top.amountSol} SOL.`);
  }
  const balance = await connection.getBalance(wallet.publicKey);
  if (balance < Math.round(amountSol * LAMPORTS_PER_SOL) + 10000) {
    throw new Error('Not enough devnet SOL to back this bid.');
  }

  const tx = new Transaction().add(
    memoInstruction(wallet.publicKey, `POT_BID:${thought.mintAddress}:${amountSol}:${me}`, [
      MARKETPLACE_HUB,
      new PublicKey(thought.mintAddress),
    ])
  );
  const signature = await sendSigned(connection, wallet, tx);
  invalidateBidBoard();
  return signature;
}

/**
 * Owner accepts the highest genuine bid: transfers the NFT to the winner and
 * writes `POT_BID_ACCEPTED`. A bid only counts if the bidder signed it and
 * still has the SOL, so a spoofed or unfunded memo can't win.
 */
export async function acceptBid(
  wallet: WalletSigner,
  connection: Connection,
  thought: ThoughtData
): Promise<{ signature: string; winner: string; amountSol: number }> {
  const me = wallet.publicKey;
  const mint = new PublicKey(thought.mintAddress);
  const round = await fetchBids(connection, thought.mintAddress);
  if (!round || round.status !== 'open') throw new Error('Bidding is not open on this thought.');
  if (round.bids.length === 0) throw new Error('No bids to accept yet.');

  const held = await connection.getParsedTokenAccountsByOwner(me, { mint });
  const source = held.value.find(
    (acc) => Number(acc.account.data.parsed?.info?.tokenAmount?.amount || 0) >= 1
  );
  if (!source) throw new Error('This wallet does not hold the NFT.');

  let winning: Bid | null = null;
  for (const bid of round.bids) {
    if (bid.bidder === me.toBase58()) continue;
    try {
      const payer = await feePayerOf(connection, bid.signature);
      if (payer !== bid.bidder) continue;
      const balance = await connection.getBalance(new PublicKey(bid.bidder));
      if (balance < Math.round(bid.amountSol * LAMPORTS_PER_SOL)) continue;
      winning = bid;
      break;
    } catch {}
  }
  if (!winning) throw new Error('No valid funded bid found.');

  const winner = new PublicKey(winning.bidder);
  const winnerAta = getAssociatedTokenAddressSync(mint, winner);
  const tx = new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(me, winnerAta, winner, mint),
    createTransferInstruction(source.pubkey, winnerAta, me, 1),
    memoInstruction(
      me,
      `POT_BID_ACCEPTED:${thought.mintAddress}:${winning.bidder}:${winning.amountSol}`,
      [MARKETPLACE_HUB, mint, winner]
    )
  );
  const signature = await sendSigned(connection, wallet, tx);
  invalidateBidBoard();
  return { signature, winner: winning.bidder, amountSol: winning.amountSol };
}

/**
 * Winner pays for an accepted bid. 5% goes to the original creator on resales
 * (ROYALTY_BASIS_POINTS), the rest to the seller who accepted.
 */
export async function settleBid(
  wallet: WalletSigner,
  connection: Connection,
  thought: ThoughtData
): Promise<{ signature: string; royaltySol: number }> {
  const me = wallet.publicKey.toBase58();
  const round = await fetchBids(connection, thought.mintAddress);
  if (!round || round.status !== 'accepted' || !round.acceptSignature) {
    throw new Error('There is no accepted bid waiting for payment.');
  }
  if (round.winner !== me) throw new Error('Only the winning bidder can pay.');
  const amountSol = round.winningAmount || 0;
  if (!(amountSol > 0)) throw new Error('Accepted amount is invalid.');

  // getTokenLargestAccounts is heavily rate-limited on public devnet, so
  // check the winner's own token accounts instead.
  const held = await connection.getParsedTokenAccountsByOwner(wallet.publicKey, {
    mint: new PublicKey(thought.mintAddress),
  });
  const arrived = held.value.some(
    (acc) => Number(acc.account.data.parsed?.info?.tokenAmount?.amount || 0) >= 1
  );
  if (!arrived) throw new Error('The NFT has not arrived in your wallet yet.');
  const seller = await feePayerOf(connection, round.acceptSignature);
  if (!seller) throw new Error('Could not find who accepted this bid.');
  const creator = thought.author || seller;

  const { totalLamports, royaltyLamports, sellerLamports } = royaltySplit(
    amountSol,
    seller,
    creator
  );
  const balance = await connection.getBalance(wallet.publicKey);
  if (balance < totalLamports + 10000) throw new Error('Not enough devnet SOL to pay.');

  const sellerKey = new PublicKey(seller);
  const creatorKey = new PublicKey(creator);
  const royaltySol = royaltyLamports / LAMPORTS_PER_SOL;
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: sellerKey,
      lamports: sellerLamports,
    })
  );
  if (royaltyLamports > 0) {
    tx.add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: creatorKey,
        lamports: royaltyLamports,
      })
    );
  }
  tx.add(
    memoInstruction(
      wallet.publicKey,
      `POT_BID_SETTLED:${thought.mintAddress}:${amountSol}:${seller}:${creator}:${royaltySol}`,
      [MARKETPLACE_HUB, new PublicKey(thought.mintAddress), sellerKey, creatorKey]
    )
  );
  const signature = await sendSigned(connection, wallet, tx);
  invalidateBidBoard();
  return { signature, royaltySol };
}
