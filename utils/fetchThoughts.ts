import AsyncStorage from '@react-native-async-storage/async-storage';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { dasApi } from '@metaplex-foundation/digital-asset-standard-api';
import { publicKey } from '@metaplex-foundation/umi';
import { Connection, PublicKey } from '@solana/web3.js';
import { ThoughtData } from '../types/thought';
import { getMetadataPda } from './verifyThought';

const RPC_ENDPOINT = 'https://api.devnet.solana.com';
// IPFS JSON is content-addressed, so a thought's content never changes.
const CONTENT_PREFIX = 'pot_content_';

// The DAS plugin is what adds getAssetsByOwner / getAssetsByCreator to umi.rpc.
// Without it those methods are undefined and every feed query fails silently.
// Both methods are served by the free api.devnet.solana.com endpoint.
export function getUmi(): any {
  return createUmi(RPC_ENDPOINT).use(dasApi());
}

export const isPotAsset = (asset: any) => asset?.content?.metadata?.symbol === 'POT';

/** Turns a Metaplex asset into a ThoughtData, reading the IPFS JSON (cached forever). */
export async function assetToThought(asset: any): Promise<ThoughtData> {
  const owner = asset.ownership?.owner || '';
  const uri = asset.content?.json_uri;
  try {
    let json: any = null;
    try {
      const raw = await AsyncStorage.getItem(CONTENT_PREFIX + asset.id);
      if (raw) json = JSON.parse(raw);
    } catch {}
    if (!json) {
      const res = await fetch(uri);
      json = await res.json();
      AsyncStorage.setItem(CONTENT_PREFIX + asset.id, JSON.stringify(json)).catch(() => {});
    }
    return {
      mintAddress: asset.id,
      name: json.name || 'Proof of Thought',
      thought: json.thought || '',
      timestamp: json.timestamp || '',
      author: json.author || '',
      audioUri: json.audioUri || undefined,
      currentOwner: owner || json.author || '',
    };
  } catch {
    return {
      mintAddress: asset.id,
      name: 'Proof of Thought',
      thought: 'Could not load thought',
      timestamp: '',
      author: '',
      currentOwner: owner,
    };
  }
}

export async function fetchThoughtsByOwner(ownerAddress: string): Promise<ThoughtData[]> {
  const umi = getUmi();
  const res = await umi.rpc.getAssetsByOwner({ owner: publicKey(ownerAddress) });
  const assets = (res.items || []).filter(isPotAsset);
  const thoughts = await Promise.all(assets.map(assetToThought));
  return thoughts.reverse();
}

// ---------------------------------------------------------------------------
// Feed: one parallel index query, then content loaded a page at a time.
// ---------------------------------------------------------------------------

export const FEED_PAGE_SIZE = 10;
const FEED_CACHE_KEY = 'pot_feed_cache_v2';
const FEED_CACHE_TTL_MS = 5 * 60 * 1000;

// mintNft.ts lists the hub as a (share 0) creator on every thought, so querying
// by this creator returns every thought ever minted, whoever holds it now.
const FEED_HUB_CREATOR = '8fCUzqY4XYj7Gkc8PGkumb58iiecS9bWX9mmjnPRdRS6';
// Owners also queried, in case a thought was minted before the hub creator existed.
export const FEED_OWNERS = [
  '8fCUzqY4XYj7Gkc8PGkumb58iiecS9bWX9mmjnPRdRS6',
  'avwQ7BH6Naxoe6pGmVGtCRXeWseLemKwxKgEFxcQaqK',
];

export type FeedCache = {
  at: number;
  wallet: string | null;
  assets: any[];
  thoughts: ThoughtData[];
};

/** Every POT asset, newest first. All queries run in parallel; one failing doesn't empty the feed. */
export async function fetchFeedIndex(walletAddress: string | null): Promise<any[]> {
  const rpc = getUmi().rpc;
  const owners = Array.from(new Set([...FEED_OWNERS, ...(walletAddress ? [walletAddress] : [])]));
  const queries = [
    rpc.getAssetsByCreator({ creator: publicKey(FEED_HUB_CREATOR), onlyVerified: false, limit: 1000 }),
    ...owners.map((o) => rpc.getAssetsByOwner({ owner: publicKey(o), limit: 1000 })),
  ];
  const results = await Promise.allSettled(queries);
  if (results.every((r) => r.status === 'rejected')) {
    throw (results[0] as PromiseRejectedResult).reason;
  }

  const seen = new Set<string>();
  const assets: any[] = [];
  for (const res of results) {
    if (res.status === 'rejected') {
      console.warn('Feed query failed:', res.reason);
      continue;
    }
    for (const item of res.value.items || []) {
      if (isPotAsset(item) && !seen.has(item.id)) {
        seen.add(item.id);
        assets.push(item);
      }
    }
  }
  return assets.reverse();
}

/** Loads IPFS content for one page of the index, all in parallel. */
export async function loadFeedPage(assets: any[], page: number): Promise<ThoughtData[]> {
  const slice = assets.slice(page * FEED_PAGE_SIZE, (page + 1) * FEED_PAGE_SIZE);
  return Promise.all(slice.map(assetToThought));
}

/**
 * Marks thoughts verified when their Metaplex metadata account exists on chain,
 * using a single getMultipleAccountsInfo call instead of one lookup per NFT.
 */
export async function applyVerification(
  connection: Connection,
  thoughts: ThoughtData[]
): Promise<ThoughtData[]> {
  if (thoughts.length === 0) return thoughts;
  try {
    const pdas = thoughts.map((t) => getMetadataPda(new PublicKey(t.mintAddress)));
    const infos = await connection.getMultipleAccountsInfo(pdas);
    return thoughts.map((t, i) => ({ ...t, isVerified: !!infos[i] }));
  } catch (e) {
    console.warn('Batch verification failed:', e);
    return thoughts;
  }
}

export async function readFeedCache(walletAddress: string | null): Promise<FeedCache | null> {
  try {
    const raw = await AsyncStorage.getItem(FEED_CACHE_KEY);
    if (!raw) return null;
    const cache: FeedCache = JSON.parse(raw);
    if (cache.wallet !== walletAddress) return null;
    if (Date.now() - cache.at > FEED_CACHE_TTL_MS) return null;
    return cache;
  } catch {
    return null;
  }
}

export async function writeFeedCache(cache: FeedCache): Promise<void> {
  try {
    // Keep only what the feed needs from each asset.
    const assets = cache.assets.map((a) => ({
      id: a.id,
      content: { json_uri: a.content?.json_uri, metadata: { symbol: 'POT' } },
      ownership: { owner: a.ownership?.owner },
    }));
    await AsyncStorage.setItem(FEED_CACHE_KEY, JSON.stringify({ ...cache, assets }));
  } catch {}
}
