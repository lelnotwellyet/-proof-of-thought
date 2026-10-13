import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThoughtData } from '../types/thought';
import { PROGRAM_ID } from './verifyThought';

// Official Solana Memo Program v2
export const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

// Shared Marketplace hub address
export const MARKETPLACE_HUB = new PublicKey('8fCUzqY4XYj7Gkc8PGkumb58iiecS9bWX9mmjnPRdRS6');

// Known sellers / listing creators on Devnet
export const KNOWN_LISTING_SOURCES = [
  new PublicKey('avwQ7BH6Naxoe6pGmVGtCRXeWseLemKwxKgEFxcQaqK'),
  MARKETPLACE_HUB,
];

const STORAGE_PREFIX = 'pot_listing_';

export type WalletSigner = {
  publicKey: PublicKey;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
};

export type ListingInfo = {
  seller: string;
  mint: string;
  priceLamports: bigint;
  priceSol: number;
};

export function getListingPda(mintPublicKey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('listing'), mintPublicKey.toBuffer()],
    PROGRAM_ID
  );
}

export function formatSol(amount: number): string {
  if (amount >= 1) return amount.toFixed(2);
  if (amount >= 0.01) return amount.toFixed(3);
  return amount.toFixed(4);
}

export async function fetchTokenOwner(
  connection: Connection,
  mintAddress: string
): Promise<string | null> {
  try {
    const largest = await connection.getTokenLargestAccounts(new PublicKey(mintAddress));
    const top = largest.value.find((row) => (row.uiAmount || 0) > 0);
    if (!top) return null;
    const info = await connection.getParsedAccountInfo(top.address);
    const parsed = info.value?.data;
    if (!parsed || !('parsed' in parsed)) return null;
    return parsed.parsed?.info?.owner ?? null;
  } catch {
    return null;
  }
}

async function sendSigned(
  connection: Connection,
  wallet: WalletSigner,
  tx: Transaction
): Promise<string> {
  tx.feePayer = wallet.publicKey;
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  const signed = await wallet.signTransaction(tx);
  const signature = await connection.sendRawTransaction(signed.serialize());
  const result = await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    'confirmed'
  );
  if (result.value.err) throw new Error('Transaction failed on devnet');
  return signature;
}

export async function getActiveListingsFromChain(
  connection: Connection
): Promise<Map<string, ListingInfo>> {
  const map = new Map<string, ListingInfo>();
  const sources = [...KNOWN_LISTING_SOURCES];

  for (const source of sources) {
    try {
      const sigs = await connection.getSignaturesForAddress(source, { limit: 40 });
      // Traverse backwards (oldest to newest) to reflect latest status
      for (const s of sigs.reverse()) {
        if (!s.memo) continue;
        const cleanMemo = s.memo.replace(/^\[\d+\]\s*/, '').trim();
        if (cleanMemo.startsWith('POT:LIST:')) {
          const parts = cleanMemo.split(':');
          const mint = parts[2];
          const price = parseFloat(parts[3]);
          if (mint && !isNaN(price)) {
            map.set(mint, {
              seller: source.toBase58(),
              mint,
              priceLamports: BigInt(Math.round(price * LAMPORTS_PER_SOL)),
              priceSol: price,
            });
          }
        } else if (cleanMemo.startsWith('POT:CANCEL:')) {
          const parts = cleanMemo.split(':');
          if (parts[2]) map.delete(parts[2]);
        } else if (cleanMemo.startsWith('POT:BUY:')) {
          const parts = cleanMemo.split(':');
          if (parts[2]) map.delete(parts[2]);
        }
      }
    } catch (e) {
      console.warn('Error reading on-chain listings for source:', source.toBase58(), e);
    }
  }

  return map;
}

export async function fetchListing(
  connection: Connection,
  mintAddress: string
): Promise<ListingInfo | null> {
  // 1. Check local persistent storage first
  try {
    const raw = await AsyncStorage.getItem(STORAGE_PREFIX + mintAddress);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.isForSale) {
        return {
          seller: parsed.seller,
          mint: mintAddress,
          priceLamports: BigInt(Math.round(parsed.priceSol * LAMPORTS_PER_SOL)),
          priceSol: parsed.priceSol,
        };
      }
    }
  } catch {}

  // 2. Check active listings parsed from on-chain signatures
  try {
    const activeMap = await getActiveListingsFromChain(connection);
    const onChainListing = activeMap.get(mintAddress);
    if (onChainListing) {
      // Cache locally
      await AsyncStorage.setItem(
        STORAGE_PREFIX + mintAddress,
        JSON.stringify({
          mint: mintAddress,
          seller: onChainListing.seller,
          priceSol: onChainListing.priceSol,
          isForSale: true,
          updatedAt: new Date().toISOString(),
        })
      );
      return onChainListing;
    }
  } catch {}

  // 3. Check signatures directly on the mint account
  try {
    const sigs = await connection.getSignaturesForAddress(new PublicKey(mintAddress), { limit: 10 });
    for (const s of sigs) {
      if (!s.memo) continue;
      const cleanMemo = s.memo.replace(/^\[\d+\]\s*/, '').trim();
      if (cleanMemo.startsWith('POT:LIST:')) {
        const parts = cleanMemo.split(':');
        const price = parseFloat(parts[3]);
        if (!isNaN(price)) {
          return {
            seller: KNOWN_LISTING_SOURCES[0].toBase58(),
            mint: mintAddress,
            priceLamports: BigInt(Math.round(price * LAMPORTS_PER_SOL)),
            priceSol: price,
          };
        }
      } else if (cleanMemo.startsWith('POT:CANCEL:') || cleanMemo.startsWith('POT:BUY:')) {
        return null;
      }
    }
  } catch {}

  return null;
}

export async function applyListingState(
  connection: Connection,
  thoughts: ThoughtData[]
): Promise<ThoughtData[]> {
  if (thoughts.length === 0) return thoughts;
  try {
    const activeMap = await getActiveListingsFromChain(connection);
    return thoughts.map((thought) => {
      const listing = activeMap.get(thought.mintAddress);
      if (!listing) return thought;
      return {
        ...thought,
        isForSale: true,
        priceSol: listing.priceSol,
        sellerAddress: listing.seller,
        currentOwner: listing.seller,
      };
    });
  } catch {
    return thoughts;
  }
}

export async function createListing(
  wallet: WalletSigner,
  connection: Connection,
  mintAddress: string,
  priceSol: number
): Promise<string> {
  if (!Number.isFinite(priceSol) || priceSol <= 0) {
    throw new Error('Enter a price greater than zero.');
  }

  const mint = new PublicKey(mintAddress);
  const memoText = `POT:LIST:${mintAddress}:${priceSol}`;

  // Tag both seller, hub, and mint account so any phone can query on-chain
  const memoIx = new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
      { pubkey: MARKETPLACE_HUB, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(memoText, 'utf-8'),
  });

  const tx = new Transaction().add(memoIx);
  const signature = await sendSigned(connection, wallet, tx);

  // Save listing state persistently
  await AsyncStorage.setItem(
    STORAGE_PREFIX + mintAddress,
    JSON.stringify({
      mint: mintAddress,
      seller: wallet.publicKey.toBase58(),
      priceSol,
      isForSale: true,
      signature,
      updatedAt: new Date().toISOString(),
    })
  );

  return signature;
}

export async function buyThought(
  wallet: WalletSigner,
  connection: Connection,
  thought: ThoughtData
): Promise<string> {
  const listing = await fetchListing(connection, thought.mintAddress);
  if (!listing) throw new Error('This thought is not listed for sale.');
  if (wallet.publicKey.toBase58() === listing.seller) {
    throw new Error('You cannot buy your own thought.');
  }

  const balance = await connection.getBalance(wallet.publicKey);
  const priceLamports = Number(listing.priceLamports);
  if (balance < priceLamports + 5000) {
    throw new Error('Not enough SOL on devnet for this purchase.');
  }

  const seller = new PublicKey(listing.seller);
  const mint = new PublicKey(thought.mintAddress);

  // 1. Transfer SOL payment from Buyer to Seller
  const paymentIx = SystemProgram.transfer({
    fromPubkey: wallet.publicKey,
    toPubkey: seller,
    lamports: priceLamports,
  });

  // 2. On-chain Memo documenting the IP ownership swap
  const memoText = `POT:BUY:${thought.mintAddress}:PRICE_${listing.priceSol}:SELLER_${listing.seller}:BUYER_${wallet.publicKey.toBase58()}`;
  const memoIx = new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
      { pubkey: seller, isSigner: false, isWritable: false },
      { pubkey: MARKETPLACE_HUB, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(memoText, 'utf-8'),
  });

  const tx = new Transaction().add(paymentIx, memoIx);
  const signature = await sendSigned(connection, wallet, tx);

  // Update listing state (mark as sold, update owner)
  await AsyncStorage.setItem(
    STORAGE_PREFIX + thought.mintAddress,
    JSON.stringify({
      mint: thought.mintAddress,
      seller: listing.seller,
      currentOwner: wallet.publicKey.toBase58(),
      priceSol: listing.priceSol,
      isForSale: false,
      soldSignature: signature,
      soldAt: new Date().toISOString(),
    })
  );

  return signature;
}

export async function cancelListing(
  wallet: WalletSigner,
  connection: Connection,
  mintAddress: string
): Promise<string> {
  const mint = new PublicKey(mintAddress);
  const memoText = `POT:CANCEL:${mintAddress}`;
  const memoIx = new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
      { pubkey: MARKETPLACE_HUB, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(memoText, 'utf-8'),
  });

  const tx = new Transaction().add(memoIx);
  const signature = await sendSigned(connection, wallet, tx);

  await AsyncStorage.removeItem(STORAGE_PREFIX + mintAddress);
  return signature;
}
