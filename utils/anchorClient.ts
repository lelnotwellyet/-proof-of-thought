import {
  clusterApiUrl,
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { hashThought } from './hashThought';
import { getThoughtPda, PROGRAM_ID } from './verifyThought';

type WalletAdapter = {
  publicKey: PublicKey;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
};

/** First 8 bytes of sha256("global:register_thought") — Anchor instruction discriminator. */
function registerDiscriminator(): Uint8Array {
  return hashThought('global:register_thought').slice(0, 8);
}

export async function registerThought(
  walletAdapter: WalletAdapter,
  mintAddress: string,
  contentHash: Uint8Array
): Promise<string> {
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  const mint = new PublicKey(mintAddress);
  const [pda] = getThoughtPda(mint);

  const data = new Uint8Array(8 + 32);
  data.set(registerDiscriminator(), 0);
  data.set(contentHash.slice(0, 32), 8);

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: pda, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: walletAdapter.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });

  const tx = new Transaction().add(ix);
  tx.feePayer = walletAdapter.publicKey;
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;

  const signed = await walletAdapter.signTransaction(tx);
  const signature = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction(signature, 'confirmed');
  return pda.toBase58();
}
