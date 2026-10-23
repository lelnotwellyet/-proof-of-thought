import React, { useCallback, useEffect, useState } from 'react';
import {
  ImageBackground,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { publicKey as umiPublicKey } from '@metaplex-foundation/umi';
import PixelCard from '../components/PixelCard';
import PixelButton from '../components/PixelButton';
import VerificationBadge from '../components/VerificationBadge';
import { useWalletStore } from '../stores/walletStore';
import { ThoughtData } from '../types/thought';
import { verifyThoughtOnChain } from '../utils/verifyThought';
import { getUmi } from '../utils/fetchThoughts';
import BidPanel, { RoyaltyBadge } from '../components/BidPanel';
import { BidRound, fetchBids } from '../utils/bidding';
import { displayName, fetchUsernameDirectory } from '../utils/profile';
import { styles } from './ThoughtDetailScreen.styles';

export default function ThoughtDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const thought = route.params?.thought as ThoughtData;
  const connection = useWalletStore((s) => s.connection);
  const publicKey = useWalletStore((s) => s.publicKey);
  const player = useAudioPlayer(thought?.audioUri || '');
  const [playing, setPlaying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [pda, setPda] = useState(thought?.registryPda || '');
  const [checking, setChecking] = useState(true);
  const [owner, setOwner] = useState(thought?.currentOwner || '');
  const [round, setRound] = useState<BidRound | null | undefined>(undefined);
  const [usernames, setUsernames] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!thought?.mintAddress) {
        setChecking(false);
        return;
      }
      const result = await verifyThoughtOnChain(connection, thought.mintAddress, thought.thought || '');
      if (cancelled) return;
      setVerified(result.verified);
      setPda(result.pda);
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [connection, thought?.mintAddress, thought?.thought]);

  const [syncing, setSyncing] = useState(false);

  // Owner comes from DAS: getTokenLargestAccounts is heavily rate-limited on devnet.
  const fetchOwner = async (mint: string): Promise<string | null> => {
    try {
      const asset = await getUmi().rpc.getAsset(umiPublicKey(mint));
      return asset?.ownership?.owner?.toString() || null;
    } catch {
      return null;
    }
  };

  const loadMarket = async () => {
    if (!thought?.mintAddress) return;
    const [tokenOwner, bidRound, names] = await Promise.all([
      fetchOwner(thought.mintAddress),
      fetchBids(connection, thought.mintAddress).catch(() => null),
      fetchUsernameDirectory(connection).catch(() => ({} as Record<string, string>)),
    ]);
    if (tokenOwner) setOwner(tokenOwner);
    else setOwner((prev) => prev || thought.currentOwner || thought.author || '');
    setRound(bidRound);
    if (Object.keys(names).length > 0) setUsernames(names);
  };

  const syncNow = async () => {
    setSyncing(true);
    try {
      await loadMarket();
    } catch (err) {
      console.error('Market lookup failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  // Live while open: bids and ownership re-sync on focus and every 10s.
  useFocusEffect(
    useCallback(() => {
      syncNow();
      const id = setInterval(() => loadMarket().catch(() => {}), 10 * 1000);
      return () => clearInterval(id);
    }, [connection, thought?.mintAddress])
  );

  const ownsIt = !!publicKey && owner === publicKey.toBase58();

  const togglePlay = () => {
    if (playing) {
      player.pause();
      setPlaying(false);
    } else {
      player.play();
      setPlaying(true);
    }
  };

  if (!thought) {
    return (
      <View style={styles.container}>
        <Text style={styles.thought}>Missing thought.</Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require('../assets/bg-scanlines.jpg')}
      style={styles.container}
      imageStyle={{ opacity: 0.35 }}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>{'< BACK'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ENTRY</Text>
          <View style={{ width: 48 }} />
        </View>

        <PixelCard>
          <Text style={styles.thought}>{thought.thought}</Text>
        </PixelCard>

        <Text style={styles.label}>// ON-CHAIN CHECK</Text>
        {checking ? (
          <Text style={styles.pda}>CHECKING REGISTRY...</Text>
        ) : (
          <VerificationBadge verified={verified} />
        )}
        {!!pda && <Text style={styles.pda}>{pda}</Text>}

        {thought.audioUri ? (
          <>
            <Text style={styles.label}>// VOICE</Text>
            <PixelButton
              label={playing ? 'PAUSE VOICE' : 'PLAY VOICE'}
              onPress={togglePlay}
              variant="outline"
              style={styles.play}
            />
          </>
        ) : null}

        <Text style={styles.label}>// METADATA</Text>
        <PixelCard>
          <Text style={styles.metaKey}>AUTHOR</Text>
          <Text
            style={styles.metaVal}
            onPress={() => thought.author && navigation.navigate('UserProfile', { wallet: thought.author })}
          >
            {thought.author ? `${displayName(thought.author, usernames[thought.author])}  ${thought.author}` : 'UNKNOWN'}
          </Text>
          <Text style={styles.metaKey}>OWNER</Text>
          <Text
            style={styles.metaVal}
            onPress={() => owner && navigation.navigate('UserProfile', { wallet: owner })}
          >
            {owner ? `${displayName(owner, usernames[owner])}  ${owner}` : 'UNKNOWN'}
          </Text>
          <Text style={styles.metaKey}>MINT</Text>
          <Text style={styles.metaVal}>{thought.mintAddress}</Text>
          <Text style={styles.metaKey}>TIMESTAMP</Text>
          <Text style={styles.metaVal}>
            {thought.timestamp ? new Date(thought.timestamp).toLocaleString() : 'UNKNOWN'}
          </Text>
        </PixelCard>

        <View style={styles.badgeRow}>
          <RoyaltyBadge />
        </View>
        {ownsIt && (
          <View style={[styles.saleBadge, styles.ownedBadge]}>
            <Text style={[styles.saleText, styles.ownedText]}>[ OWNED BY YOU ]</Text>
          </View>
        )}

        <View style={styles.bidsHeader}>
          <Text style={styles.label}>// BIDS · LIVE</Text>
          <TouchableOpacity style={styles.syncBtn} onPress={syncNow} disabled={syncing}>
            <Text style={styles.syncBtnText}>{syncing ? 'SYNCING...' : '↻ REFRESH'}</Text>
          </TouchableOpacity>
        </View>
        <PixelCard>
          {round === undefined ? (
            <Text style={styles.pda}>SCANNING BIDS...</Text>
          ) : (
            <BidPanel
              thought={{ ...thought, currentOwner: owner }}
              round={round}
              usernames={usernames}
              onChanged={syncNow}
            />
          )}
        </PixelCard>

        <PixelButton
          label="OPEN IN SOLANA EXPLORER"
          variant="outline"
          onPress={() =>
            Linking.openURL(
              `https://explorer.solana.com/address/${thought.mintAddress}?cluster=devnet`
            )
          }
        />
      </ScrollView>

    </ImageBackground>
  );
}
