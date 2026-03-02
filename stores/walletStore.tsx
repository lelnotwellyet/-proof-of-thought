import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../src/lib/storage';
import { transact, Web3MobileWallet } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { Connection, PublicKey, clusterApiUrl, Transaction } from '@solana/web3.js';

const APP_IDENTITY = {
  name: 'Proof of Thought',
  uri: 'https://proofofthought.app',
  icon: '/favicon.ico',
};

export interface WalletStore {
  publicKey: PublicKey | null;
  publicKeyString: string | null;
  connecting: boolean;
  connection: Connection;
  connect: () => Promise<void>;
  disconnect: () => void;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
}

export const useWalletStore = create<WalletStore>()(
  persist(
    (set, get) => ({
      publicKey: null,
      publicKeyString: null,
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
            set({
              publicKey: pubkey,
              publicKeyString: pubkey.toString(),
            });
          });
        } catch (e) {
          console.error('Wallet connection failed:', e);
        } finally {
          set({ connecting: false });
        }
      },

      disconnect: () => set({ publicKey: null, publicKeyString: null }),

      signTransaction: async (transaction: Transaction) => {
        return await transact(async (wallet: Web3MobileWallet) => {
          await wallet.authorize({
            chain: 'solana:devnet',
            identity: APP_IDENTITY,
          });
          const signed = await wallet.signTransactions({
            transactions: [transaction],
          });
          return signed[0];
        });
      },

      signAllTransactions: async (transactions: Transaction[]) => {
        return await transact(async (wallet: Web3MobileWallet) => {
          await wallet.authorize({
            chain: 'solana:devnet',
            identity: APP_IDENTITY,
          });
          const signed = await wallet.signTransactions({ transactions });
          return signed;
        });
      },
    }),
    {
      name: 'wallet-storage',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        publicKeyString: state.publicKeyString,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.publicKeyString) {
          state.publicKey = new PublicKey(state.publicKeyString);
        }
      },
    }
  )
);