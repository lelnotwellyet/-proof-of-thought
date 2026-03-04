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
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { dasApi } from '@metaplex-foundation/digital-asset-standard-api';
import { publicKey } from '@metaplex-foundation/umi';
import { useAudioPlayer } from 'expo-audio';
import { useWalletStore } from '../stores/walletStore';
import { styles } from './FeedScreen.styles';

interface Thought {
  mintAddress: string;
  thought: string;
  timestamp: string;
  author: string;
  audioUri?: string;
}

const CREATOR_ADDRESS = '8fCUzqY4XYj7Gkc8PGkumb58iiecS9bWX9mmjnPRdRS6';
const shortAddress = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`;

function ThoughtCard({
  item,
  walletPublicKey,
  index,
}: {
  item: Thought;
  walletPublicKey: any;
  index: number;
}) {
  const player = useAudioPlayer(item.audioUri || '');
  const [playing, setPlaying] = useState(false);
  const isYou = walletPublicKey && item.author === walletPublicKey.toString();

  const scale = useSharedValue(1);
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

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
    <Animated.View
      entering={FadeInDown.delay(index * 60).springify()}
      style={cardStyle}
    >
      <View style={styles.card}>
        {/* Card header */}
        <View style={styles.cardHeader}>
          <View style={styles.authorBadge}>
            <View style={[styles.authorDot, isYou && styles.authorDotYou]} />
            <Text style={[styles.authorText, isYou && styles.authorTextYou]}>
              {item.author ? shortAddress(item.author) : 'UNKNOWN'}
            </Text>
          </View>
          <Text style={styles.cardDate}>
            {item.timestamp
              ? new Date(item.timestamp).toLocaleDateString()
              : 'UNKNOWN'}
          </Text>
        </View>

        {/* Thought */}
        <Text style={styles.thoughtText}>{item.thought}</Text>

        {/* Voice */}
        {item.audioUri && (
          <TouchableOpacity style={styles.playButton} onPress={handlePlay}>
            <Text style={styles.playButtonText}>
              {playing ? '⏸ PAUSE VOICE' : '▶ PLAY VOICE'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Footer */}
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
          {isYou && (
            <View style={styles.youBadge}>
              <Text style={styles.youBadgeText}>YOU</Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
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
      <ImageBackground
        source={require('../assets/bg-scanlines.jpg')}
        style={styles.center}
        imageStyle={{ opacity: 0.35 }}
      >
        <ActivityIndicator size="large" color="#FF6B00" />
        <Text style={styles.loadingText}>LOADING FEED...</Text>
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
      <Animated.View
        entering={FadeInDown.delay(0).springify()}
        style={styles.header}
      >
        <Text style={styles.title}>PUBLIC FEED</Text>
        <Text style={styles.subtitle}>
          {thoughts.length} THOUGHT{thoughts.length !== 1 ? 'S' : ''} ON CHAIN
        </Text>
      </Animated.View>

      {thoughts.length === 0 ? (
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          style={styles.center}
        >
          <Text style={styles.emptyIcon}>🌐</Text>
          <Text style={styles.emptyTitle}>NO THOUGHTS YET</Text>
          <Text style={styles.emptyText}>Be the first to mint a thought!</Text>
        </Animated.View>
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
            <ThoughtCard
              item={item}
              walletPublicKey={walletPublicKey}
              index={index}
            />
          )}
        />
      )}
    </ImageBackground>
  );
}