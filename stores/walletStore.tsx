import { create } from 'zustand';
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';

const APP_IDENTITY = {
  name: 'Proof of Thought',
  uri: 'https://proofofthought.app',
  icon: '/favicon.ico',
};

interface WalletStore {
  publicKey: PublicKey | null;
  connecting: boolean;
  connection: Connection;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export const useWalletStore = create<WalletStore>((set) => ({
  publicKey: null,
  connecting: false,
  connection: new Connection(clusterApiUrl('devnet'), 'confirmed'),

  connect: async () => {
    set({ connecting: true });
    try {
      await transact(async (wallet) => {
        const { accounts } = await wallet.authorize({
          chain: 'solana:devnet',
          identity: APP_IDENTITY,
        });
        const pubkey = new PublicKey(
          Buffer.from(accounts[0].address, 'base64')
        );
        set({ publicKey: pubkey });
      });
    } catch (e) {
      console.error('Wallet connection failed:', e);
    } finally {
      set({ connecting: false });
    }
  },

  disconnect: () => set({ publicKey: null }),
}));