import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  RefreshControl,
  ImageBackground,
} from 'react-native';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { dasApi } from '@metaplex-foundation/digital-asset-standard-api';
import { publicKey } from '@metaplex-foundation/umi';
import { useAudioPlayer } from 'expo-audio';
import { useWalletStore } from '../stores/walletStore';
import { styles } from './MyThoughtsScreen.styles';

interface Thought {
  mintAddress: string;
  name: string;
  thought: string;
  timestamp: string;
  author: string;
  audioUri?: string;
}

function ThoughtCard({ item, index }: { item: Thought; index: number }) {
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
      {/* Card header */}
      <View style={styles.cardHeader}>
        <Text style={styles.cardIndex}>THOUGHT #{String(index + 1).padStart(3, '0')}</Text>
        <Text style={styles.cardDate}>
          {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : 'UNKNOWN DATE'}
        </Text>
      </View>

      {/* Thought content */}
      <Text style={styles.thoughtText}>{item.thought}</Text>

      {/* Voice playback */}
      {item.audioUri && (
        <TouchableOpacity style={styles.playButton} onPress={handlePlay}>
          <Text style={styles.playButtonText}>
            {playing ? '⏸ PAUSE VOICE' : '▶ PLAY VOICE'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Card footer */}
      <View style={styles.cardFooter}>
        <TouchableOpacity
          onPress={() =>
            Linking.openURL(
              `https://explorer.solana.com/address/${item.mintAddress}?cluster=devnet`
            )
          }
        >
          <Text style={styles.explorerLink}>VIEW ON EXPLORER →</Text>
        </TouchableOpacity>
        <View style={styles.mintBadge}>
          <Text style={styles.mintBadgeText}>NFT</Text>
        </View>
      </View>
    </View>
  );
}

export default function MyThoughtsScreen() {
  const { publicKey: walletPublicKey } = useWalletStore();
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchThoughts = async () => {
    if (!walletPublicKey) return;
    setLoading(true);
    try {
      const umi = createUmi('https://api.devnet.solana.com');
      umi.use(dasApi());
      const rpc = umi.rpc as any;
      const assets = await rpc.getAssetsByOwner({
        owner: publicKey(walletPublicKey.toString()),
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
              name: json.name || 'Proof of Thought',
              thought: json.thought || '',
              timestamp: json.timestamp || '',
              author: json.author || '',
              audioUri: json.audioUri || null,
            };
          } catch {
            return {
              mintAddress: asset.id,
              name: 'Proof of Thought',
              thought: 'Could not load thought',
              timestamp: '',
              author: '',
            };
          }
        })
      );

      setThoughts(fetched.reverse());
    } catch (e) {
      console.error('Failed to fetch thoughts:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchThoughts();
  }, [walletPublicKey]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchThoughts();
  };

  if (!walletPublicKey) {
    return (
      <ImageBackground
        source={require('../assets/bg-scanlines.jpg')}
        style={styles.center}
        imageStyle={{ opacity: 0.35 }}
      >
        <Text style={styles.emptyIcon}>🧠</Text>
        <Text style={styles.emptyTitle}>NOT CONNECTED</Text>
        <Text style={styles.emptyText}>Connect your wallet to see your thoughts</Text>
      </ImageBackground>
    );
  }

  if (loading && !refreshing) {
    return (
      <ImageBackground
        source={require('../assets/bg-scanlines.jpg')}
        style={styles.center}
        imageStyle={{ opacity: 0.35 }}
      >
        <ActivityIndicator size="large" color="#FF6B00" />
        <Text style={styles.loadingText}>LOADING THOUGHTS...</Text>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require('../assets/bg-scanlines.jpg')}
      style={styles.container}
      imageStyle={{ opacity: 0.35 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>MY THOUGHTS</Text>
        <Text style={styles.subtitle}>
          {thoughts.length} THOUGHT{thoughts.length !== 1 ? 'S' : ''} MINTED ON CHAIN
        </Text>
      </View>

      {thoughts.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>✍️</Text>
          <Text style={styles.emptyTitle}>NO THOUGHTS YET</Text>
          <Text style={styles.emptyText}>
            Go to Home and mint your first thought!
          </Text>
        </View>
      ) : (
        <FlatList
          data={thoughts}
          keyExtractor={(item) => item.mintAddress}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FF6B00"
            />
          }
          renderItem={({ item, index }) => (
            <ThoughtCard item={item} index={index} />
          )}
        />
      )}
    </ImageBackground>
  );
}