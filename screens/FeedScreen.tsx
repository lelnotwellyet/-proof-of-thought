import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  RefreshControl,
} from 'react-native';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { dasApi } from '@metaplex-foundation/digital-asset-standard-api';
import { publicKey } from '@metaplex-foundation/umi';
import { useAudioPlayer } from 'expo-audio';
import { useWalletStore } from '../stores/walletStore';

interface Thought {
  mintAddress: string;
  thought: string;
  timestamp: string;
  author: string;
  audioUri?: string;
}

const CREATOR_ADDRESS = '8fCUzqY4XYj7Gkc8PGkumb58iiecS9bWX9mmjnPRdRS6';

const shortAddress = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`;

function ThoughtCard({ item, walletPublicKey }: { item: Thought; walletPublicKey: any }) {
  const player = useAudioPlayer(item.audioUri || '');
  const [playing, setPlaying] = useState(false);

  const handlePlay = async () => {
    if (playing) {
      player.pause();
      setPlaying(false);
    } else {
      player.play();
      setPlaying(true);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.thoughtText}>{item.thought}</Text>
      {item.audioUri && (
        <TouchableOpacity style={styles.playButton} onPress={handlePlay}>
          <Text style={styles.playButtonText}>
            {playing ? '⏸️ Pause Voice' : '▶️ Play Voice'}
          </Text>
        </TouchableOpacity>
      )}
      <View style={styles.cardMeta}>
        <View>
          <Text style={styles.author}>
            {item.author ? shortAddress(item.author) : 'Unknown'}
            {walletPublicKey && item.author === walletPublicKey.toString() ? ' (you)' : ''}
          </Text>
          <Text style={styles.timestamp}>
            {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : ''}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() =>
            Linking.openURL(
              `https://explorer.solana.com/address/${item.mintAddress}?cluster=devnet`
            )
          }
        >
          <Text style={styles.explorerLink}>View →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function FeedScreen() {
  const { publicKey: walletPublicKey } = useWalletStore();
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFeed = async () => {
    setLoading(true);
    try {
      const umi = createUmi('https://api.devnet.solana.com');
      umi.use(dasApi());
      const rpc = umi.rpc as any;

      const assets = await rpc.getAssetsByCreator({
        creator: publicKey(CREATOR_ADDRESS),
        onlyVerified: false,
      });

      const potAssets = assets.items.filter(
        (a: any) => a.content?.metadata?.symbol === 'POT'
      );

      const fetched: Thought[] = await Promise.all(
        potAssets.map(async (asset: any) => {
          try {
            const uri = asset.content?.json_uri;
            const res = await fetch(uri);
            const json = await res.json();
            return {
              mintAddress: asset.id,
              thought: json.thought || '',
              timestamp: json.timestamp || '',
              author: json.author || '',
              audioUri: json.audioUri || null,
            };
          } catch {
            return {
              mintAddress: asset.id,
              thought: 'Could not load thought',
              timestamp: '',
              author: '',
            };
          }
        })
      );

      setThoughts(fetched.reverse());
    } catch (e) {
      console.error('Failed to fetch feed:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFeed();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#9945FF" />
        <Text style={styles.loadingText}>Loading feed...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Public Feed</Text>
      <Text style={styles.subtitle}>
        {thoughts.length} thought{thoughts.length !== 1 ? 's' : ''} on chain
      </Text>

      {thoughts.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🌐</Text>
          <Text style={styles.emptyTitle}>No thoughts yet</Text>
          <Text style={styles.emptyText}>Be the first to mint a thought!</Text>
        </View>
      ) : (
        <FlatList
          data={thoughts}
          keyExtractor={(item) => item.mintAddress}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#9945FF" />
          }
          renderItem={({ item }) => (
            <ThoughtCard item={item} walletPublicKey={walletPublicKey} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', padding: 24, paddingTop: 60 },
  center: { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#555', marginBottom: 24 },
  loadingText: { color: '#555', marginTop: 16 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  emptyText: { color: '#555', fontSize: 14, textAlign: 'center' },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  thoughtText: { color: '#fff', fontSize: 16, lineHeight: 24, marginBottom: 12 },
  playButton: {
    backgroundColor: '#9945FF20',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#9945FF',
    alignSelf: 'flex-start',
  },
  playButtonText: { color: '#9945FF', fontSize: 13, fontWeight: '600' },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  author: { color: '#9945FF', fontSize: 12, fontFamily: 'monospace', marginBottom: 2 },
  timestamp: { color: '#555', fontSize: 11 },
  explorerLink: { color: '#9945FF', fontSize: 12 },
});