import React, { useEffect, useState } from 'react';
import {
  Alert,
  ImageBackground,
  Linking,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import { useNavigation, useRoute } from '@react-navigation/native';
import PixelCard from '../components/PixelCard';
import PixelButton from '../components/PixelButton';
import VerificationBadge from '../components/VerificationBadge';
import { useWalletStore } from '../stores/walletStore';
import { ThoughtData } from '../types/thought';
import { verifyThoughtOnChain } from '../utils/verifyThought';
import {
  buyThought,
  cancelListing,
  createListing,
  fetchListing,
  fetchTokenOwner,
  formatSol,
} from '../utils/marketplace';
import { styles } from './ThoughtDetailScreen.styles';

export default function ThoughtDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const thought = route.params?.thought as ThoughtData;
  const connection = useWalletStore((s) => s.connection);
  const publicKey = useWalletStore((s) => s.publicKey);
  const signTransaction = useWalletStore((s) => s.signTransaction);
  const player = useAudioPlayer(thought?.audioUri || '');
  const [playing, setPlaying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [pda, setPda] = useState(thought?.registryPda || '');
  const [checking, setChecking] = useState(true);
  const [owner, setOwner] = useState(thought?.currentOwner || '');
  const [forSale, setForSale] = useState(!!thought?.isForSale);
  const [priceSol, setPriceSol] = useState(thought?.priceSol);
  const [seller, setSeller] = useState(thought?.sellerAddress || '');
  const [listOpen, setListOpen] = useState(false);
  const [priceInput, setPriceInput] = useState('0.05');
  const [busy, setBusy] = useState(false);

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

  const loadMarket = async () => {
    if (!thought?.mintAddress) return;
    const listing = await fetchListing(connection, thought.mintAddress);
    if (listing) {
      setForSale(true);
      setPriceSol(listing.priceSol);
      setSeller(listing.seller);
      setOwner(listing.seller);
      return;
    }
    const tokenOwner = await fetchTokenOwner(connection, thought.mintAddress);
    setForSale(false);
    setPriceSol(undefined);
    setSeller('');
    setOwner(tokenOwner || thought.currentOwner || thought.author || '');
  };

  useEffect(() => {
    loadMarket().catch((err) => console.error('Market lookup failed:', err));
  }, [connection, thought?.mintAddress]);

  const wallet = publicKey ? { publicKey, signTransaction } : null;
  const ownsIt = !!publicKey && owner === publicKey.toBase58();

  const handleList = async () => {
    if (!wallet || !thought) return;
    const price = Number(priceInput);
    setBusy(true);
    try {
      await createListing(wallet, connection, thought.mintAddress, price);
      setListOpen(false);
      setForSale(true);
      setPriceSol(price);
      setSeller(publicKey!.toBase58());
      setOwner(publicKey!.toBase58());
      Alert.alert('LISTED', `This thought is escrowed at ${formatSol(price)} SOL.`);
    } catch (err) {
      Alert.alert('LISTING FAILED', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleBuy = () => {
    if (!thought || priceSol == null) return;
    if (!wallet) {
      Alert.alert('NOT CONNECTED', 'Connect your wallet before buying.');
      return;
    }
    Alert.alert('BUY IP RIGHTS', `Pay ${formatSol(priceSol)} SOL and take on-chain ownership?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Buy',
        onPress: async () => {
          setBusy(true);
          try {
            const signature = await buyThought(wallet, connection, {
              ...thought,
              sellerAddress: seller,
              priceSol,
              isForSale: true,
            });
            setForSale(false);
            setPriceSol(undefined);
            setSeller('');
            setOwner(publicKey!.toBase58());
            Alert.alert(
              'OWNERSHIP TRANSFERRED',
              'You are now the on-chain owner of this thought. View the transaction on Explorer.',
              [
                {
                  text: 'Explorer',
                  onPress: () =>
                    Linking.openURL(`https://explorer.solana.com/tx/${signature}?cluster=devnet`),
                },
                { text: 'OK' },
              ]
            );
          } catch (err) {
            Alert.alert('PURCHASE FAILED', err instanceof Error ? err.message : 'Try again.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const handleCancel = async () => {
    if (!wallet || !thought) return;
    setBusy(true);
    try {
      await cancelListing(wallet, connection, thought.mintAddress);
      setForSale(false);
      setPriceSol(undefined);
      setSeller('');
      setOwner(publicKey!.toBase58());
      Alert.alert('LISTING CANCELLED', 'The NFT is back in your wallet.');
    } catch (err) {
      Alert.alert('CANCEL FAILED', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

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
          <Text style={styles.metaVal}>{thought.author || 'UNKNOWN'}</Text>
          <Text style={styles.metaKey}>OWNER</Text>
          <Text style={styles.metaVal}>{owner || 'UNKNOWN'}</Text>
          <Text style={styles.metaKey}>MINT</Text>
          <Text style={styles.metaVal}>{thought.mintAddress}</Text>
          <Text style={styles.metaKey}>TIMESTAMP</Text>
          <Text style={styles.metaVal}>
            {thought.timestamp ? new Date(thought.timestamp).toLocaleString() : 'UNKNOWN'}
          </Text>
        </PixelCard>

        {forSale && priceSol != null && (
          <View style={[styles.saleBadge]}>
            <Text style={styles.saleText}>[ FOR SALE: {formatSol(priceSol)} SOL ]</Text>
          </View>
        )}
        {ownsIt && (
          <View style={[styles.saleBadge, styles.ownedBadge]}>
            <Text style={[styles.saleText, styles.ownedText]}>[ OWNED BY YOU ]</Text>
          </View>
        )}

        {ownsIt && !forSale && (
          <PixelButton
            label="LIST FOR SALE"
            variant="outline"
            style={styles.action}
            disabled={busy}
            onPress={() => setListOpen(true)}
          />
        )}
        {ownsIt && forSale && (
          <PixelButton
            label="CANCEL LISTING"
            variant="outline"
            style={styles.action}
            loading={busy}
            onPress={handleCancel}
          />
        )}
        {!ownsIt && forSale && priceSol != null && (
          <PixelButton
            label={`BUY IP RIGHTS: ${formatSol(priceSol)} SOL`}
            style={styles.action}
            loading={busy}
            onPress={handleBuy}
          />
        )}

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

      <Modal visible={listOpen} transparent animationType="fade" onRequestClose={() => setListOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.headerTitle}>LIST FOR SALE</Text>
            <Text style={styles.label}>PRICE IN SOL</Text>
            <TextInput
              style={styles.priceInput}
              value={priceInput}
              onChangeText={setPriceInput}
              keyboardType="decimal-pad"
              placeholder="0.05"
              placeholderTextColor="#3D2F6B"
            />
            <PixelButton label="CONFIRM LISTING" onPress={handleList} loading={busy} />
            <PixelButton
              label="CLOSE"
              variant="outline"
              style={styles.action}
              onPress={() => setListOpen(false)}
              disabled={busy}
            />
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}
