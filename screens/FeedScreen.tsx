import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  RefreshControl,
  ImageBackground,
  TextInput,
} from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useAudioPlayer } from 'expo-audio';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useWalletStore } from '../stores/walletStore';
import { ThoughtData } from '../types/thought';
import PixelCard from '../components/PixelCard';
import ErrorBanner from '../components/ErrorBanner';
import SkeletonCard from '../components/SkeletonCard';
import { styles } from './FeedScreen.styles';
import BidPanel, { RoyaltyBadge } from '../components/BidPanel';
import { BidBoard, BidRound, fetchBidBoard } from '../utils/bidding';
import { displayName, fetchUsernameDirectory } from '../utils/profile';
import {
  FEED_PAGE_SIZE,
  applyVerification,
  assetToThought,
  fetchFeedIndex,
  loadFeedPage,
  readFeedCache,
  writeFeedCache,
} from '../utils/fetchThoughts';

function ThoughtCard({
  item,
  walletPublicKey,
  index,
  usernames,
  round,
  onBidChanged,
}: {
  item: ThoughtData;
  walletPublicKey: any;
  index: number;
  usernames: Record<string, string>;
  round?: BidRound;
  onBidChanged: () => void;
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
      entering={FadeInDown.delay((index % FEED_PAGE_SIZE) * 60).springify()}
      style={cardStyle}
    >
      <PixelCard onPress={() => navigation.navigate('ThoughtDetail', { thought: item })}>
        {/* Card header */}
        <View style={styles.cardHeader}>
          <TouchableOpacity
            style={styles.authorBadge}
            disabled={!item.author}
            onPress={() => navigation.navigate('UserProfile', { wallet: item.author })}
          >
            <View style={[styles.authorDot, isYou && styles.authorDotYou]} />
            <Text style={[styles.authorText, isYou && styles.authorTextYou]}>
              {item.author ? displayName(item.author, usernames[item.author]) : 'UNKNOWN'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.cardDate}>
            {item.timestamp
              ? new Date(item.timestamp).toLocaleDateString()
              : 'UNKNOWN'}
          </Text>
        </View>

        {/* Ownership changes hands on a sale; the header keeps the original creator. */}
        {owner && item.author && owner !== item.author && (
          <TouchableOpacity
            style={styles.ownerRow}
            onPress={() => navigation.navigate('UserProfile', { wallet: owner })}
          >
            <Text style={styles.ownerLabel}>OWNER</Text>
            <Text style={[styles.ownerName, isYou && styles.authorTextYou]}>
              {displayName(owner, usernames[owner])}
            </Text>
          </TouchableOpacity>
        )}

        {/* Thought */}
        <Text style={styles.thoughtText}>{item.thought}</Text>
        <View style={styles.tagRow}>
          {item.isVerified && <Text style={styles.verifiedTag}>[✓ VERIFIED]</Text>}
          <RoyaltyBadge />
        </View>

        {/* Bids */}
        <BidPanel
          thought={item}
          round={round}
          usernames={usernames}
          compact
          onChanged={onBidChanged}
        />

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

const BID_POLL_MS = 15 * 1000;
// Every Nth bid poll also re-reads the index: new mints and NFT ownership after a sale.
const INDEX_EVERY_N_POLLS = 4;

type SortOrder = 'newest' | 'oldest';

const timeOf = (t: ThoughtData) => (t.timestamp ? new Date(t.timestamp).getTime() || 0 : 0);

export default function FeedScreen() {
  const { publicKey: walletPublicKey } = useWalletStore();
  const [thoughts, setThoughts] = useState<ThoughtData[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [board, setBoard] = useState<BidBoard>(new Map());
  const [usernames, setUsernames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortOrder>('newest');

  const walletAddress = walletPublicKey ? walletPublicKey.toString() : null;
  const hasMore = thoughts.length < assets.length;

  // Interval callbacks read the latest lists through refs.
  const thoughtsRef = useRef(thoughts);
  const assetsRef = useRef(assets);
  thoughtsRef.current = thoughts;
  assetsRef.current = assets;
  const pollCount = useRef(0);

  const connection = () => useWalletStore.getState().connection;
  const hydrate = (page: ThoughtData[]) => applyVerification(connection(), page);

  const refreshBids = () =>
    fetchBidBoard(connection(), true)
      .then(setBoard)
      .catch((e) => console.warn('Bid board failed:', e));

  const refreshNames = () =>
    fetchUsernameDirectory(connection())
      .then(setUsernames)
      .catch((e) => console.warn('Username directory failed:', e));

  /** Re-reads the index: updates owners of loaded thoughts and prepends new mints. */
  const refreshIndex = async () => {
    const index = await fetchFeedIndex(walletAddress);
    const ownerById = new Map<string, string>(index.map((a: any) => [a.id, a.ownership?.owner]));
    const knownIds = new Set(assetsRef.current.map((a: any) => a.id));
    const fresh = await hydrate(
      await Promise.all(index.filter((a: any) => !knownIds.has(a.id)).map(assetToThought))
    );
    const updated = thoughtsRef.current.map((t) => {
      const owner = ownerById.get(t.mintAddress);
      return owner && owner !== t.currentOwner ? { ...t, currentOwner: owner } : t;
    });
    const all = [...fresh, ...updated];
    setAssets(index);
    setThoughts(all);
    writeFeedCache({ at: Date.now(), wallet: walletAddress, assets: index, thoughts: all });
  };

  /** Live sync: bids and names every time, the index when asked. */
  const sync = async (withIndex = false) => {
    setSyncing(true);
    try {
      await Promise.all([
        refreshBids(),
        refreshNames(),
        withIndex ? refreshIndex().catch((e) => console.warn('Index sync failed:', e)) : null,
      ]);
      setLastSync(Date.now());
    } finally {
      setSyncing(false);
    }
  };

  const fetchFeed = async (force = false) => {
    setError(null);
    const sideTasks = Promise.all([refreshBids(), refreshNames()]);
    try {
      if (!force) {
        const cached = await readFeedCache(walletAddress);
        if (cached) {
          setAssets(cached.assets);
          setThoughts(cached.thoughts);
          await sideTasks;
          setLastSync(Date.now());
          return;
        }
      }
      setLoading(true);
      const index = await fetchFeedIndex(walletAddress);
      const firstPage = await hydrate(await loadFeedPage(index, 0));
      setAssets(index);
      setThoughts(firstPage);
      writeFeedCache({ at: Date.now(), wallet: walletAddress, assets: index, thoughts: firstPage });
      await sideTasks;
      setLastSync(Date.now());
    } catch (e) {
      console.error('Failed to fetch feed:', e);
      setError('Network error while loading the feed.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadPages = async (all: boolean) => {
    if (loadingMore || thoughtsRef.current.length >= assetsRef.current.length) return;
    setLoadingMore(true);
    try {
      let loaded = thoughtsRef.current;
      do {
        const page = Math.ceil(loaded.length / FEED_PAGE_SIZE);
        const next = await hydrate(await loadFeedPage(assetsRef.current, page));
        if (next.length === 0) break;
        loaded = [...loaded, ...next];
        setThoughts(loaded);
      } while (all && loaded.length < assetsRef.current.length);
      writeFeedCache({ at: Date.now(), wallet: walletAddress, assets: assetsRef.current, thoughts: loaded });
    } catch (e) {
      console.error('Failed to load more:', e);
      setError('Could not load more thoughts.');
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, [walletAddress]);

  // Live while the feed is on screen: sync on return, then poll.
  useFocusEffect(
    useCallback(() => {
      if (thoughtsRef.current.length > 0) sync(true);
      const id = setInterval(() => {
        pollCount.current += 1;
        sync(pollCount.current % INDEX_EVERY_N_POLLS === 0);
      }, BID_POLL_MS);
      return () => clearInterval(id);
    }, [walletAddress])
  );

  // Searching or sorting oldest-first needs every thought's content, not just page 1.
  const searching = query.trim().length > 0;
  useEffect(() => {
    if ((searching || sort === 'oldest') && hasMore) loadPages(true);
  }, [searching, sort, assets.length]);

  const visibleThoughts = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^@/, '');
    const matches = (t: ThoughtData) => {
      if (!q) return true;
      const owner = t.currentOwner || '';
      return [t.thought, t.author, usernames[t.author], owner, usernames[owner]].some(
        (field) => field && field.toLowerCase().includes(q)
      );
    };
    return thoughts
      .filter(matches)
      .sort((x, y) => (sort === 'newest' ? timeOf(y) - timeOf(x) : timeOf(x) - timeOf(y)));
  }, [thoughts, query, sort, usernames]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFeed(true);
  };

  const secondsAgo = lastSync ? Math.max(0, Math.round((Date.now() - lastSync) / 1000)) : null;

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
        <View style={styles.headerRow}>
          <Text style={styles.title}>PUBLIC FEED</Text>
          <TouchableOpacity
            style={styles.syncBtn}
            onPress={() => sync(true)}
            disabled={syncing || loading}
          >
            {syncing ? (
              <ActivityIndicator size="small" color="#00FFD1" />
            ) : (
              <Text style={styles.syncBtnText}>↻ SYNC</Text>
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>
          {loading && assets.length === 0
            ? 'SYNCING CHAIN...'
            : `${assets.length} THOUGHT${assets.length !== 1 ? 'S' : ''} ON CHAIN`}
        </Text>
        <Text style={styles.liveText}>
          ● LIVE{secondsAgo != null ? ` · SYNCED ${secondsAgo < 5 ? 'JUST NOW' : `${secondsAgo}S AGO`}` : ''}
        </Text>

        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="search thoughts or @creators..."
          placeholderTextColor="#3D2F6B"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>SORT:</Text>
          {(['newest', 'oldest'] as SortOrder[]).map((order) => (
            <TouchableOpacity
              key={order}
              style={[styles.sortChip, sort === order && styles.sortChipActive]}
              onPress={() => setSort(order)}
            >
              <Text style={[styles.sortChipText, sort === order && styles.sortChipTextActive]}>
                {order === 'newest' ? 'NEWEST ↓' : 'OLDEST ↑'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {loading && !refreshing && thoughts.length === 0 ? (
        <View style={styles.listContent}>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </View>
      ) : thoughts.length === 0 ? (
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
          data={visibleThoughts}
          keyExtractor={(item) => item.mintAddress}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FF6B00"
            />
          }
          ListEmptyComponent={
            loadingMore ? null : (
              <Text style={styles.emptyText}>No thoughts match "{query.trim()}".</Text>
            )
          }
          ListFooterComponent={
            loadingMore ? (
              <SkeletonCard />
            ) : hasMore && !searching ? (
              <TouchableOpacity style={styles.loadMoreBtn} onPress={() => loadPages(false)}>
                <Text style={styles.loadMoreText}>
                  {'> LOAD MORE_'} [{thoughts.length}/{assets.length}]
                </Text>
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item, index }) => (
            <ThoughtCard
              item={item}
              walletPublicKey={walletPublicKey}
              index={index}
              usernames={usernames}
              round={board.get(item.mintAddress)}
              onBidChanged={() => sync(true)}
            />
          )}
        />
      )}
    </ImageBackground>
  );
}
