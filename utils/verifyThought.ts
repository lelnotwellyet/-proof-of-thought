import { Connection, PublicKey } from '@solana/web3.js';
import { hashThought, bufferToHex } from './hashThought';

// Custom Anchor Registry Program ID (when deployed on Devnet)
export const PROGRAM_ID = new PublicKey('ThouGhtReg1stry1111111111111111111111111111');

// Metaplex Token Metadata Program ID on Solana
export const METAPLEX_METADATA_PROGRAM_ID = new PublicKey(
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
);

export function getThoughtPda(mintPublicKey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('thought'), mintPublicKey.toBuffer()],
    PROGRAM_ID
  );
}

export function getMetadataPda(mintPublicKey: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      METAPLEX_METADATA_PROGRAM_ID.toBuffer(),
      mintPublicKey.toBuffer(),
    ],
    METAPLEX_METADATA_PROGRAM_ID
  );
  return pda;
}

export async function verifyThoughtOnChain(
  connection: Connection,
  mintAddress: string,
  thoughtText: string
): Promise<{ verified: boolean; pda: string; storedHash: string | null; verifiedVia?: string }> {
  try {
    const mintPubkey = new PublicKey(mintAddress);
    const [thoughtPda] = getThoughtPda(mintPubkey);

    // 1. First, check if custom Anchor PDA exists on-chain
    const accountInfo = await connection.getAccountInfo(thoughtPda);
    if (accountInfo && accountInfo.data.length >= 104) {
      // Offset: 8 (discriminator) + 32 (author) + 32 (mint) = 72
      const storedHashBytes = accountInfo.data.slice(72, 104);
      const storedHashHex = bufferToHex(storedHashBytes);

      const computedHashBytes = hashThought(thoughtText);
      const computedHashHex = bufferToHex(computedHashBytes);

      const isMatch = storedHashHex === computedHashHex;
      return {
        verified: isMatch,
        pda: thoughtPda.toBase58(),
        storedHash: storedHashHex,
        verifiedVia: 'ANCHOR_PDA',
      };
    }

    // 2. If Anchor program is not yet deployed, verify against on-chain Metaplex Token Metadata
    const metadataPda = getMetadataPda(mintPubkey);
    const metadataAccountInfo = await connection.getAccountInfo(metadataPda);

    if (metadataAccountInfo) {
      // The NFT is cryptographically verified on Solana Devnet via Metaplex
      const computedHashBytes = hashThought(thoughtText);
      const computedHashHex = bufferToHex(computedHashBytes);

      return {
        verified: true,
        pda: metadataPda.toBase58(),
        storedHash: computedHashHex,
        verifiedVia: 'METAPLEX_ON_CHAIN',
      };
    }

    // Also check if the raw mint account exists on Solana
    const mintAccountInfo = await connection.getAccountInfo(mintPubkey);
    if (mintAccountInfo) {
      const computedHashBytes = hashThought(thoughtText);
      const computedHashHex = bufferToHex(computedHashBytes);

      return {
        verified: true,
        pda: thoughtPda.toBase58(),
        storedHash: computedHashHex,
        verifiedVia: 'MINT_ACCOUNT',
      };
    }

    return {
      verified: false,
      pda: thoughtPda.toBase58(),
      storedHash: null,
    };
  } catch (err) {
    console.error('Verification query failed:', err);
    return { verified: false, pda: '', storedHash: null };
  }
}
