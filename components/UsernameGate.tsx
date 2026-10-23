import React, { useEffect, useRef, useState } from 'react';
import UsernameModal from './UsernameModal';
import { useWalletStore } from '../stores/walletStore';
import { notifyUsernameChanged, resolveUsername } from '../utils/profile';

const RETRY_DELAYS_MS = [0, 3000, 8000];

/**
 * Asks a connected wallet that has no username to claim one, wherever the user
 * is in the app. Lookups that fail (offline, rate limited) are retried rather
 * than treated as "no username", so an existing handle is never re-prompted.
 */
export default function UsernameGate() {
  const publicKey = useWalletStore((s) => s.publicKey);
  const connection = useWalletStore((s) => s.connection);
  const address = publicKey?.toBase58() || null;
  const [visible, setVisible] = useState(false);
  const prompted = useRef(new Set<string>());

  useEffect(() => {
    if (!address || prompted.current.has(address)) return;
    let cancelled = false;
    (async () => {
      for (const delay of RETRY_DELAYS_MS) {
        if (delay) await new Promise((r) => setTimeout(r, delay));
        if (cancelled) return;
        const name = await resolveUsername(connection, address);
        if (cancelled) return;
        if (name === undefined) continue; // lookup failed, try again
        if (name === null && !prompted.current.has(address)) {
          prompted.current.add(address);
          setVisible(true);
        }
        return;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address, connection]);

  return (
    <UsernameModal
      visible={visible}
      current={null}
      onClose={() => setVisible(false)}
      onSaved={(name) => {
        setVisible(false);
        if (address) notifyUsernameChanged(address, name);
      }}
    />
  );
}
