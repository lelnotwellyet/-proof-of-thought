import React, { createContext, useContext, useState, ReactNode } from 'react';
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { PublicKey } from '@solana/web3.js';

interface SolanaContextType {
  publicKey: PublicKey | null;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const SolanaContext = createContext<SolanaContextType>({
  publicKey: null,
  connecting: false,
  connect: async () => {},
  disconnect: () => {},
});

export function SolanaProvider({ children }: { children: ReactNode }) {
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [connecting, setConnecting] = useState(false);

  const connect = async () => {
    setConnecting(true);
    try {
      await transact(async (wallet) => {
        const { accounts } = await wallet.authorize({
          chain: 'solana:devnet',
          identity: {
            name: 'Proof of Thought',
            uri: 'https://proofofthought.app',
            icon: '/favicon.ico',
          },
        });
        const address = accounts[0].address;
        const pubkey = new PublicKey(Buffer.from(address, 'base64'));
        setPublicKey(pubkey);
      });
    } catch (e) {
      console.error('Wallet connection failed:', e);
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = () => setPublicKey(null);

  return (
    <SolanaContext.Provider value={{ publicKey, connecting, connect, disconnect }}>
      {children}
    </SolanaContext.Provider>
  );
}

export const useSolana = () => useContext(SolanaContext);