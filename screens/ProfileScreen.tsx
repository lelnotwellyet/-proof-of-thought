import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import PixelCard from '../components/PixelCard';
import PixelButton from '../components/PixelButton';
import ErrorBanner from '../components/ErrorBanner';
import UsernameModal from '../components/UsernameModal';
import { useWalletStore } from '../stores/walletStore';
import { ThoughtData } from '../types/thought';
import { fetchThoughtsByOwner } from '../utils/fetchThoughts';
import { formatSol } from '../utils/marketplace';
import { RoyaltyBadge } from '../components/BidPanel';
import { BidBoard, BidRound, fetchBidBoard } from '../utils/bidding';
import {
  ProfileStats,
  fetchProfileStats,
  notifyUsernameChanged,
  onUsernameChanged,
  resolveUsername,
  shortAddress,
} from '../utils/profile';
import { styles } from './ProfileScreen.styles';

// Reputation is computed only from verifiable on-chain activity (the stats below),
// so a rank can't be faked locally and anyone viewing a profile sees the same rank.
const REP_PER_MINT = 10;
const REP_PER_SALE = 25;
const REP_PER_SOL = 100; // earned from sales + royalties

const RANKS = [
  { name: 'NEW MIND', min: 0 },
  { name: 'THINKER', min: 50 },
  { name: 'VISIONARY', min: 150 },
  { name: 'ORACLE', min: 400 },
  { name: 'LEGEND', min: 1000 },
];

function reputationOf(stats: ProfileStats) {
  const rep = Math.floor(
    stats.minted * REP_PER_MINT +
      stats.sold * REP_PER_SALE +
      (stats.solEarned + stats.royalties) * REP_PER_SOL
  );
  const tier = RANKS.reduce((best, r, i) => (rep >= r.min ? i : best), 0);
  const next = RANKS[tier + 1];
  const progress = next ? (rep - RANKS[tier].min) / (next.min - RANKS[tier].min) : 1;
  return { rep, rank: RANKS[tier], tier, next, progress };
}

function bidStatus(round: BidRound | undefined): { text: string; hot: boolean } {
  if (!round || round.status === 'closed' || round.status === 'settled') {
    return { text: 'NOT LISTED', hot: false };
  }
  if (round.status === 'accepted') {
    return { text: `SOLD · ${formatSol(round.winningAmount || 0)} SOL · AWAITING PAYMENT`, hot: true };
  }
  const top = round.bids[0];
  return top
    ? { text: `TOP BID: ${formatSol(top.amountSol)} SOL · ${round.bids.length} BID${round.bids.length !== 1 ? 'S' : ''}`, hot: true }
    : { text: 'OPEN FOR BIDS', hot: true };
}

function StatTile({ value, label, index }: { value: string; label: string; index: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(120 + index * 80).springify()} style={styles.statTile}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
}

function PulseDot() {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.2, { duration: 700 }), -1, true);
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.onlineDot, style]} />;
}

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const connection = useWalletStore((s) => s.connection);
  const myKey = useWalletStore((s) => s.publicKey);

  const myAddress = myKey?.toBase58() || null;
  const viewedAddress: string | null = route.params?.wallet || myAddress;
  const isOwn = !!viewedAddress && viewedAddress === myAddress;
  const isPushed = !!route.params?.wallet;

  const [username, setUsername] = useState<string | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [thoughts, setThoughts] = useState<ThoughtData[]>([]);
  const [board, setBoard] = useState<BidBoard>(new Map());
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(async () => {
    if (!viewedAddress) return;
    setLoading(true);
    setError(null);
    try {
      const [name, profileStats, owned, bidBoard] = await Promise.all([
        resolveUsername(connection, viewedAddress),
        fetchProfileStats(connection, viewedAddress),
        fetchThoughtsByOwner(viewedAddress).catch((e) => {
          console.warn('Owned thoughts failed:', e);
          return [] as ThoughtData[];
        }),
        fetchBidBoard(connection).catch(() => new Map() as BidBoard),
      ]);
      setBoard(bidBoard);
      // A failed lookup (undefined) keeps whatever name is already showing.
      if (name !== undefined) setUsername(name);
      setStats(profileStats);
      setThoughts(owned);
    } catch (e) {
      console.error('Profile load failed:', e);
      setError('Network error while loading this profile.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [connection, viewedAddress, isOwn]);

  useEffect(() => {
    load();
  }, [load]);

  // The first-time prompt lives in UsernameGate; pick up names claimed there.
  useEffect(
    () =>
      onUsernameChanged((addr, name) => {
        if (addr === viewedAddress) setUsername(name);
      }),
    [viewedAddress]
  );

  // Re-sync when coming back (e.g. after buying or selling a thought).
  const firstFocus = React.useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      load();
    }, [load])
  );

  if (!viewedAddress) {
    return (
      <ImageBackground
        source={require('../assets/bg-scanlines.jpg')}
        style={styles.center}
        imageStyle={{ opacity: 0.35 }}
      >
        <Text style={styles.emptyTitle}>NO NEURAL ID</Text>
        <Text style={styles.emptyText}>Connect your wallet to load your profile</Text>
      </ImageBackground>
    );
  }

  const minted = stats?.minted ?? 0;
  const sold = stats?.sold ?? 0;
  const reputation = stats ? reputationOf(stats) : null;

  return (
    <ImageBackground
      source={require('../assets/bg-scanlines.jpg')}
      style={styles.container}
      imageStyle={{ opacity: 0.35 }}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor="#FF6B00"
          />
        }
      >
        {isPushed && (
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>{'< BACK'}</Text>
          </TouchableOpacity>
        )}
        {error && <ErrorBanner message={error} onRetry={load} />}

        {/* Identity */}
        <Animated.View entering={FadeInDown.springify()} style={styles.idCard}>
          <View style={styles.idHeader}>
            <Text style={styles.idLabel}>[ NEURAL ID ]</Text>
            <View style={styles.onlineRow}>
              <PulseDot />
              <Text style={styles.onlineText}>{isOwn ? 'YOU' : 'ON CHAIN'}</Text>
            </View>
          </View>
          <View style={styles.nameRow}>
            <Text style={styles.username} numberOfLines={1}>
              {username ? `@${username}` : shortAddress(viewedAddress)}
            </Text>
            {isOwn && (
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => setEditOpen(true)}
              >
                <Text style={styles.editText}>{username ? '[EDIT]' : '[CLAIM]'}</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.wallet}>wallet: {shortAddress(viewedAddress)}</Text>

          <View style={styles.levelRow}>
            <Text style={styles.levelText}>
              RANK {reputation ? reputation.tier + 1 : '-'}: {reputation ? reputation.rank.name : 'SYNCING'}
            </Text>
            <Text style={styles.levelText}>
              {reputation
                ? reputation.next
                  ? `${reputation.rep}/${reputation.next.min} REP`
                  : `${reputation.rep} REP · MAX`
                : '--'}
            </Text>
          </View>
          <View style={styles.xpTrack}>
            <View
              style={[styles.xpFill, { width: `${(reputation?.progress ?? 0) * 100}%` as any }]}
            />
          </View>
          <Text style={styles.repHint}>
            REP FROM ON-CHAIN ACTIVITY: +{REP_PER_MINT}/MINT · +{REP_PER_SALE}/SALE · +1 PER 0.01 SOL
            EARNED{reputation?.next ? ` · NEXT: ${reputation.next.name}` : ''}
          </Text>
        </Animated.View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatTile index={0} value={stats ? String(minted) : '--'} label={'MINTED'} />
          <StatTile index={1} value={stats ? String(sold) : '--'} label={'SOLD'} />
          <StatTile
            index={2}
            value={stats ? formatSol(stats.solEarned) : '--'}
            label={'SOL\nEARNED'}
          />
        </View>
        <View style={styles.royaltyBar}>
          <Text style={styles.royaltyText}>
            ROYALTIES COLLECTED: {stats ? formatSol(stats.royalties) : '--'} SOL
          </Text>
        </View>

        {/* Thoughts */}
        <Text style={styles.sectionLabel}>[ {isOwn ? 'MY THOUGHTS' : 'THOUGHTS'} ]</Text>
        {loading && !refreshing && thoughts.length === 0 ? (
          <View style={{ alignItems: 'center' }}>
            <ActivityIndicator color="#FF6B00" />
            <Text style={styles.loadingText}>SYNCING...</Text>
          </View>
        ) : thoughts.length === 0 ? (
          <Text style={styles.emptyText}>No thoughts held by this wallet.</Text>
        ) : (
          thoughts.map((item) => (
            <PixelCard
              key={item.mintAddress}
              onPress={() => navigation.navigate('ThoughtDetail', { thought: item })}
            >
              <View style={styles.thoughtRow}>
                <Text style={styles.thoughtText} numberOfLines={3}>
                  "{item.thought}"
                </Text>
                <Text style={styles.thoughtIcon}>◈</Text>
              </View>
              <Text style={[styles.thoughtMeta, bidStatus(board.get(item.mintAddress)).hot && styles.thoughtMetaHot]}>
                {bidStatus(board.get(item.mintAddress)).text}
              </Text>
              <View style={styles.thoughtFooter}>
                <Text style={styles.thoughtMeta}>
                  {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : 'UNKNOWN DATE'}
                </Text>
                <RoyaltyBadge />
              </View>
            </PixelCard>
          ))
        )}
      </ScrollView>

      <UsernameModal
        visible={editOpen}
        current={username}
        onClose={() => setEditOpen(false)}
        onSaved={(name) => {
          setEditOpen(false);
          setUsername(name);
          if (myAddress) notifyUsernameChanged(myAddress, name);
        }}
      />
    </ImageBackground>
  );
}
