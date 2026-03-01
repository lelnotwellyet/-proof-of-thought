import { create } from 'zustand';
import { transact, Web3MobileWallet } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { Connection, PublicKey, clusterApiUrl, Transaction } from '@solana/web3.js';

const APP_IDENTITY = {
  name: 'Proof of Thought',
  uri: 'https://proofofthought.app',
  icon: '/favicon.ico',
};

export interface WalletStore {
  publicKey: PublicKey | null;
  connecting: boolean;
  connection: Connection;
  connect: () => Promise<void>;
  disconnect: () => void;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
}

export const useWalletStore = create<WalletStore>((set, get) => ({
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

  signTransaction: async (transaction: Transaction) => {
    const { publicKey } = get();
    if (!publicKey) throw new Error('Wallet not connected');

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
    const { publicKey } = get();
    if (!publicKey) throw new Error('Wallet not connected');

    return await transact(async (wallet: Web3MobileWallet) => {
      await wallet.authorize({
        chain: 'solana:devnet',
        identity: APP_IDENTITY,
      });
      const signed = await wallet.signTransactions({
        transactions,
      });
      return signed;
    });
  },
}));