import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplTokenMetadata, createNft } from '@metaplex-foundation/mpl-token-metadata';
import { createSignerFromWalletAdapter } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { generateSigner, percentAmount, publicKey } from '@metaplex-foundation/umi';
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

    const CREATOR_ADDRESS = '8fCUzqY4XYj7Gkc8PGkumb58iiecS9bWX9mmjnPRdRS6';

    await createNft(umi, {
      mint,
      name: `Proof of Thought`,
      uri: ipfsUrl,
      // 5% (500 basis points) resale royalty to the minter; paid out in settleBid().
      sellerFeeBasisPoints: percentAmount(5),
      symbol: 'POT',
      creators: [
        { address: publicKey(CREATOR_ADDRESS), verified: false, share: 0 },
        { address: signer.publicKey, verified: true, share: 100 },
      ],
    }).sendAndConfirm(umi);

    return mint.publicKey.toString();
  } catch (e) {
    console.error('Minting failed:', e);
    throw e;
  }
};