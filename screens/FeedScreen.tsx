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
import { useNavigation } from '@react-navigation/native';
import { useWalletStore } from '../stores/walletStore';
import { ThoughtData } from '../types/thought';
import PixelCard from '../components/PixelCard';
import ErrorBanner from '../components/ErrorBanner';
import { styles } from './FeedScreen.styles';
import { applyListingState, formatSol } from '../utils/marketplace';

const CREATOR_ADDRESS = '8fCUzqY4XYj7Gkc8PGkumb58iiecS9bWX9mmjnPRdRS6';
const shortAddress = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`;

function ThoughtCard({
  item,
  walletPublicKey,
  index,
}: {
  item: ThoughtData;
  walletPublicKey: any;
  index: number;
}) {
  const navigation = useNavigation<any>();
  const player = useAudioPlayer(item.audioUri || '');
  const [playing, setPlaying] = useState(false);
  const owner = item.currentOwner || item.author;
  const isYou = walletPublicKey && owner === walletPublicKey.toString();

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
      <PixelCard onPress={() => navigation.navigate('ThoughtDetail', { thought: item })}>
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
        {item.isForSale && item.priceSol != null && (
          <Text style={styles.saleTag}>[ {formatSol(item.priceSol)} SOL ]</Text>
        )}

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
      </PixelCard>
    </Animated.View>
  );
}

export default function FeedScreen() {
  const { publicKey: walletPublicKey } = useWalletStore();
  const [thoughts, setThoughts] = useState<ThoughtData[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = async () => {
    setLoading(true);
    setError(null);
    try {
      const umi = createUmi('https://api.devnet.solana.com');
      umi.use(dasApi());
      const rpc = umi.rpc as any;

      const creatorsToQuery = Array.from(
        new Set([
          CREATOR_ADDRESS,
          'avwQ7BH6Naxoe6pGmVGtCRXeWseLemKwxKgEFxcQaqK',
          ...(walletPublicKey ? [walletPublicKey.toString()] : []),
        ])
      );

      const allItems: any[] = [];
      const seenIds = new Set<string>();

      for (const c of creatorsToQuery) {
        try {
          const res = await rpc.getAssetsByCreator({
            creator: publicKey(c),
            onlyVerified: false,
          });
          for (const item of (res.items || [])) {
            if (item.content?.metadata?.symbol === 'POT' && !seenIds.has(item.id)) {
              seenIds.add(item.id);
              allItems.push(item);
            }
          }
        } catch (err) {
          console.warn('Failed querying creator:', c, err);
        }
      }

      const potAssets = allItems;

      const fetched: ThoughtData[] = await Promise.all(
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
              currentOwner: asset.ownership?.owner || json.author || '',
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

      const listed = await applyListingState(useWalletStore.getState().connection, fetched);
      setThoughts(listed.reverse());
    } catch (e) {
      console.error('Failed to fetch feed:', e);
      setError('Network error while loading the feed.');
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
      {error && <ErrorBanner message={error} onRetry={onRefresh} />}
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