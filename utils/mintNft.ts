import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplTokenMetadata, createNft } from '@metaplex-foundation/mpl-token-metadata';
import { createSignerFromWalletAdapter } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { generateSigner, percentAmount } from '@metaplex-foundation/umi';
import { clusterApiUrl } from '@solana/web3.js';

export const mintThoughtNFT = async (
  walletAdapter: any,
  ipfsUrl: string,
  thought: string
) => {
  try {
    const umi = createUmi(clusterApiUrl('devnet'))
      .use(mplTokenMetadata());

    const signer = createSignerFromWalletAdapter(walletAdapter);
    umi.use({ install(umi) { umi.identity = signer; umi.payer = signer; } });

    const mint = generateSigner(umi);

    await createNft(umi, {
      mint,
      name: `Proof of Thought`,
      uri: ipfsUrl,
      sellerFeeBasisPoints: percentAmount(0),
      symbol: 'POT',
    }).sendAndConfirm(umi);

    return mint.publicKey.toString();
  } catch (e) {
    console.error('Minting failed:', e);
    throw e;
  }
};