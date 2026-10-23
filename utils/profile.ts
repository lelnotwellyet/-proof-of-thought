import AsyncStorage from '@react-native-async-storage/async-storage';
import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { dasApi } from '@metaplex-foundation/digital-asset-standard-api';
import { publicKey as umiPublicKey } from '@metaplex-foundation/umi';
import {
  MARKETPLACE_HUB,
  MEMO_PROGRAM_ID,
  WalletSigner,
  parseMemos,
  sendSigned,
} from './marketplace';

export const USERNAME_MEMO_PREFIX = 'POT_USERNAME:';
const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,16}$/;

const DIRECTORY_TTL_MS = 5 * 60 * 1000;
const DIRECTORY_KEY = 'pot_username_directory';
const DIRECTORY_MAX_LOOKUPS = 25;
const PAYER_CACHE_KEY = 'pot_username_payers';

export const usernameKey = (walletAddress: string) => `username_${walletAddress}`;

export const shortAddress = (addr: string) =>
  addr ? `${addr.slice(0, 4)}...${addr.slice(-4)}` : 'UNKNOWN';

export function displayName(walletAddress: string, username?: string | null): string {
  return username ? `@${username}` : shortAddress(walletAddress);
}

/** Returns an error message, or null when the name is valid. */
export function validateUsername(name: string): string | null {
  if (!USERNAME_PATTERN.test(name)) {
    return 'Use 3-16 letters, numbers or underscores.';
  }
  return null;
}

function usernameFromMemo(memo: string | null | undefined): string | null {
  for (const text of parseMemos(memo)) {
    if (!text.startsWith(USERNAME_MEMO_PREFIX)) continue;
    const name = text.slice(USERNAME_MEMO_PREFIX.length).trim();
    if (!validateUsername(name)) return name;
  }
  return null;
}

function feePayerOf(tx: any): string | null {
  const key = tx?.transaction?.message?.accountKeys?.[0];
  if (!key) return null;
  return (key.pubkey ?? key).toString();
}

export async function getCachedUsername(walletAddress: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(usernameKey(walletAddress));
  } catch {
    return null;
  }
}

type DirectoryCache = { at: number; names: Record<string, string> };

async function readDirectoryCache(): Promise<DirectoryCache | null> {
  try {
    const raw = await AsyncStorage.getItem(DIRECTORY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function writeDirectoryCache(names: Record<string, string>) {
  await AsyncStorage.setItem(DIRECTORY_KEY, JSON.stringify({ at: Date.now(), names }));
  await Promise.all(
    Object.entries(names).map(([addr, name]) => AsyncStorage.setItem(usernameKey(addr), name))
  );
}

// Signature -> fee payer never changes, so verified lookups are kept forever
// and each refresh only has to look up memos it hasn't seen before.
async function readPayerCache(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(PAYER_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Builds wallet -> username from every `POT_USERNAME:` memo on the hub.
 * A memo only counts when the claiming wallet paid for (signed) it, and names
 * are unique case-insensitively: the first wallet to claim a name keeps it, and
 * later claims of a name someone else holds are ignored. Renaming frees the old name.
 * Throws if the hub can't be read, so callers can tell "no name" from "offline".
 */
export async function fetchUsernameDirectory(
  connection: Connection,
  force = false
): Promise<Record<string, string>> {
  const cached = await readDirectoryCache();
  if (!force && cached && Date.now() - cached.at < DIRECTORY_TTL_MS) return cached.names;

  const sigs = await connection.getSignaturesForAddress(MARKETPLACE_HUB, { limit: 1000 });
  const claims = sigs.filter((s) => !s.err && usernameFromMemo(s.memo)).reverse(); // oldest first

  const payers = await readPayerCache();
  // Public devnet rate-limits transaction lookups, so go one at a time and cap each refresh.
  const unknown = claims.filter((s) => !payers[s.signature]).slice(-DIRECTORY_MAX_LOOKUPS);
  for (const s of unknown) {
    try {
      const tx = await connection.getParsedTransaction(s.signature, {
        maxSupportedTransactionVersion: 0,
      });
      const payer = feePayerOf(tx);
      if (payer) payers[s.signature] = payer;
    } catch {}
  }
  AsyncStorage.setItem(PAYER_CACHE_KEY, JSON.stringify(payers)).catch(() => {});

  const names: Record<string, string> = {};
  const holder: Record<string, string> = {}; // lowercase name -> wallet
  for (const s of claims) {
    const payer = payers[s.signature];
    const name = usernameFromMemo(s.memo);
    if (!payer || !name) continue;
    const key = name.toLowerCase();
    if (holder[key] && holder[key] !== payer) continue; // taken by someone else
    const previous = names[payer];
    if (previous) delete holder[previous.toLowerCase()];
    names[payer] = name;
    holder[key] = payer;
  }

  await writeDirectoryCache(names);
  return names;
}

/** The wallet's username from chain (via the hub directory), or null if it has none. */
export async function fetchUsernameFromChain(
  connection: Connection,
  walletAddress: string
): Promise<string | null> {
  const names = await fetchUsernameDirectory(connection);
  return names[walletAddress] ?? null;
}

/**
 * Resolves `null` when the wallet has no username and `undefined` when the
 * lookup itself failed, so callers don't mistake a network error for "unset".
 */
export async function resolveUsername(
  connection: Connection,
  walletAddress: string
): Promise<string | null | undefined> {
  try {
    return await fetchUsernameFromChain(connection, walletAddress);
  } catch (e) {
    console.warn('Username lookup failed:', walletAddress, e);
    const cached = await getCachedUsername(walletAddress);
    return cached ?? undefined;
  }
}

/** The wallet currently holding this name (case-insensitive), or null if it's free. */
export async function findUsernameOwner(
  connection: Connection,
  username: string
): Promise<string | null> {
  const names = await fetchUsernameDirectory(connection, true);
  const key = username.trim().toLowerCase();
  const entry = Object.entries(names).find(([, name]) => name.toLowerCase() === key);
  return entry ? entry[0] : null;
}

/** Writes `POT_USERNAME:<name>` as a Memo v1 tx after checking nobody else holds it. */
export async function registerUsername(
  wallet: WalletSigner,
  connection: Connection,
  username: string
): Promise<string> {
  const name = username.trim();
  const invalid = validateUsername(name);
  if (invalid) throw new Error(invalid);
  const me = wallet.publicKey.toBase58();

  const owner = await findUsernameOwner(connection, name);
  if (owner && owner !== me) throw new Error(`@${name} is already taken.`);
  if (owner === me) {
    const names = await fetchUsernameDirectory(connection);
    if (names[me] === name) throw new Error(`You already are @${name}.`);
  }

  const memoIx = new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
      { pubkey: MARKETPLACE_HUB, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(`${USERNAME_MEMO_PREFIX}${name}`, 'utf-8'),
  });
  const signature = await sendSigned(connection, wallet, new Transaction().add(memoIx));

  // We just checked the name was free, so record the claim without waiting for a rescan.
  const cached = await readDirectoryCache();
  await writeDirectoryCache({ ...(cached?.names || {}), [me]: name });
  return signature;
}

type UsernameListener = (walletAddress: string, username: string) => void;
const usernameListeners = new Set<UsernameListener>();

/** Lets screens refresh when a username is claimed elsewhere (e.g. the global prompt). */
export function onUsernameChanged(listener: UsernameListener): () => void {
  usernameListeners.add(listener);
  return () => usernameListeners.delete(listener);
}

export function notifyUsernameChanged(walletAddress: string, username: string) {
  usernameListeners.forEach((listener) => listener(walletAddress, username));
}

export type ProfileStats = {
  minted: number;
  sold: number;
  solEarned: number;
  royalties: number;
};

/**
 * Sales history comes from memos that tag this wallet:
 *  - legacy fixed-price buys: `POT:BUY:<mint>:PRICE_<sol>:SELLER_<addr>:BUYER_<addr>`
 *  - bid settlements: `POT_BID_SETTLED:<mint>:<sol>:<seller>:<creator>:<royaltySol>`
 */
export async function fetchProfileStats(
  connection: Connection,
  walletAddress: string
): Promise<ProfileStats> {
  const stats: ProfileStats = { minted: 0, sold: 0, solEarned: 0, royalties: 0 };

  const mintedTask = (async () => {
    try {
      const umi = createUmi('https://api.devnet.solana.com');
      umi.use(dasApi());
      const res = await (umi.rpc as any).getAssetsByCreator({
        creator: umiPublicKey(walletAddress),
        onlyVerified: true,
      });
      stats.minted = (res.items || []).filter(
        (a: any) => a.content?.metadata?.symbol === 'POT'
      ).length;
    } catch (e) {
      console.warn('Minted count failed:', e);
    }
  })();

  const historyTask = (async () => {
    try {
      const sigs = await connection.getSignaturesForAddress(new PublicKey(walletAddress), {
        limit: 1000,
      });
      for (const s of sigs) {
        if (s.err) continue;
        for (const memo of parseMemos(s.memo)) {
          if (memo.startsWith('POT:BUY:')) {
            const price = parseFloat(memo.match(/PRICE_([\d.]+)/)?.[1] || '');
            const seller = memo.match(/SELLER_([1-9A-HJ-NP-Za-km-z]+)/)?.[1];
            if (seller === walletAddress && !isNaN(price)) {
              stats.sold += 1;
              stats.solEarned += price;
            }
          } else if (memo.startsWith('POT_BID_SETTLED:')) {
            const [, , amountText, seller, creator, royaltyText] = memo.split(':');
            const amount = parseFloat(amountText);
            const royalty = parseFloat(royaltyText) || 0;
            if (isNaN(amount)) continue;
            if (seller === walletAddress) {
              stats.sold += 1;
              stats.solEarned += amount - royalty;
            }
            if (creator === walletAddress && seller !== walletAddress) {
              stats.royalties += royalty;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Sales history failed:', e);
    }
  })();

  await Promise.all([mintedTask, historyTask]);
  return stats;
}
