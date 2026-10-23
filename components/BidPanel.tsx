import React, { useEffect, useState } from 'react';
import { Alert, Linking, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import PixelButton from './PixelButton';
import { useWalletStore } from '../stores/walletStore';
import { ThoughtData } from '../types/thought';
import {
  BidRound,
  ROYALTY_BASIS_POINTS,
  acceptBid,
  closeBidding,
  openForBids,
  placeBid,
  royaltySplit,
  settleBid,
} from '../utils/bidding';
import { formatSol } from '../utils/marketplace';
import { displayName, shortAddress } from '../utils/profile';
import { colors, fonts, spacing } from '../styles/theme';

type Props = {
  thought: ThoughtData;
  round: BidRound | null | undefined;
  usernames: Record<string, string>;
  /** Feed cards show the top 3 bids; the detail screen shows all. */
  compact?: boolean;
  onChanged: () => void;
};

export function RoyaltyBadge() {
  return (
    <View style={styles.royaltyBadge}>
      <Text style={styles.royaltyBadgeText}>[{ROYALTY_BASIS_POINTS / 100}% ROYALTY]</Text>
    </View>
  );
}

function explorerTx(signature: string) {
  Linking.openURL(`https://explorer.solana.com/tx/${signature}?cluster=devnet`);
}

export default function BidPanel({ thought, round, usernames, compact, onChanged }: Props) {
  const connection = useWalletStore((s) => s.connection);
  const publicKey = useWalletStore((s) => s.publicKey);
  const signTransaction = useWalletStore((s) => s.signTransaction);
  const me = publicKey?.toBase58() || null;
  const owner = thought.currentOwner || thought.author;
  const isOwner = !!me && owner === me;
  const wallet = publicKey ? { publicKey, signTransaction } : null;

  const [modal, setModal] = useState<'bid' | 'open' | null>(null);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  const glow = useSharedValue(0.4);
  useEffect(() => {
    glow.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
  }, []);
  const glowStyle = useAnimatedStyle(() => ({ shadowOpacity: glow.value, opacity: 0.75 + glow.value * 0.25 }));

  const name = (addr: string) => displayName(addr, usernames[addr]);

  const run = async (label: string, task: () => Promise<string | void>) => {
    if (!wallet) {
      Alert.alert('NOT CONNECTED', 'Connect your wallet first.');
      return;
    }
    setBusy(true);
    try {
      const signature = await task();
      setModal(null);
      setAmount('');
      onChanged();
      Alert.alert(label, 'Confirmed on devnet.', [
        ...(signature ? [{ text: 'Explorer', onPress: () => explorerTx(signature) }] : []),
        { text: 'OK' },
      ]);
    } catch (err) {
      Alert.alert('FAILED', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  const submitModal = () => {
    const value = Number(amount);
    if (modal === 'open') {
      run('BIDDING OPEN', () => openForBids(wallet!, connection, thought.mintAddress, value || 0));
    } else {
      run('BID PLACED', () => placeBid(wallet!, connection, thought, value));
    }
  };

  const confirmAccept = () => {
    const top = round?.bids[0];
    if (!top) return;
    Alert.alert(
      'ACCEPT TOP BID',
      `Send this NFT to ${name(top.bidder)} for ${formatSol(top.amountSol)} SOL?\n\nThey pay you when they claim it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: () =>
            run('BID ACCEPTED', async () => (await acceptBid(wallet!, connection, thought)).signature),
        },
      ]
    );
  };

  const confirmSettle = () => {
    const amountSol = round?.winningAmount || 0;
    const { royaltyLamports } = royaltySplit(amountSol, owner, thought.author);
    const royaltyNote = royaltyLamports > 0
      ? `\n\nIncludes ${ROYALTY_BASIS_POINTS / 100}% creator royalty to ${name(thought.author)}.`
      : '';
    Alert.alert('PAY & CLAIM', `Pay ${formatSol(amountSol)} SOL for this thought?${royaltyNote}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Pay',
        onPress: () =>
          run('OWNERSHIP SETTLED', async () => (await settleBid(wallet!, connection, thought)).signature),
      },
    ]);
  };

  const status = round?.status;
  const bids = round?.bids || [];
  const top = bids[0];
  const others = compact ? bids.slice(1, 4) : bids.slice(1);

  let body: React.ReactNode = null;
  if (status === 'open') {
    body = (
      <>
        {top ? (
          <Animated.View style={[styles.topBid, glowStyle]}>
            <Text style={styles.topBidAmount}>🏆 TOP BID: {formatSol(top.amountSol)} SOL</Text>
            <Text style={styles.topBidBy}>
              by {name(top.bidder)}
              {usernames[top.bidder] ? ` (${shortAddress(top.bidder)})` : ''}
            </Text>
          </Animated.View>
        ) : (
          <Text style={styles.openText}>
            [ OPEN FOR BIDS{round!.minPrice > 0 ? ` · MIN ${formatSol(round!.minPrice)} SOL` : ''} ]
          </Text>
        )}
        {others.length > 0 && (
          <View style={styles.others}>
            <Text style={styles.othersLabel}>other bids:</Text>
            {others.map((bid) => (
              <Text key={bid.bidder} style={styles.otherBid}>
                · {formatSol(bid.amountSol)} SOL — {name(bid.bidder)}
              </Text>
            ))}
            {compact && bids.length > 4 && (
              <Text style={styles.otherBid}>  +{bids.length - 4} more</Text>
            )}
          </View>
        )}
        <View style={styles.actions}>
          {!isOwner && (
            <PixelButton label="PLACE BID" onPress={() => setModal('bid')} style={styles.actionBtn} />
          )}
          {isOwner && top && (
            <PixelButton
              label="ACCEPT TOP BID"
              onPress={confirmAccept}
              loading={busy}
              style={styles.actionBtn}
            />
          )}
          {isOwner && !compact && (
            <PixelButton
              label="CLOSE BIDDING"
              variant="outline"
              onPress={() => run('BIDDING CLOSED', () => closeBidding(wallet!, connection, thought.mintAddress))}
              disabled={busy}
              style={styles.actionBtn}
            />
          )}
        </View>
      </>
    );
  } else if (status === 'accepted' && round?.winner) {
    const isWinner = round.winner === me;
    body = (
      <>
        <Text style={styles.openText}>
          [ SOLD TO {name(round.winner)} · {formatSol(round.winningAmount || 0)} SOL ]
        </Text>
        {isWinner ? (
          <PixelButton
            label={`PAY ${formatSol(round.winningAmount || 0)} SOL & CLAIM`}
            onPress={confirmSettle}
            loading={busy}
            style={styles.actionBtnFull}
          />
        ) : (
          <Text style={styles.waitText}>AWAITING WINNER PAYMENT...</Text>
        )}
      </>
    );
  } else if (isOwner) {
    body = (
      <PixelButton
        label="OPEN FOR BIDS"
        variant="outline"
        onPress={() => setModal('open')}
        style={styles.actionBtnFull}
      />
    );
  } else if (!compact) {
    body = <Text style={styles.waitText}>NOT OPEN FOR BIDS</Text>;
  }

  const minBid = Math.max(round?.minPrice || 0, top && top.bidder !== me ? top.amountSol : 0);

  return (
    <View>
      {body}
      <Modal visible={!!modal} transparent animationType="fade" onRequestClose={() => !busy && setModal(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{modal === 'open' ? 'OPEN FOR BIDS' : 'PLACE BID'}</Text>
            <Text style={styles.modalHint}>
              {modal === 'open'
                ? 'Optional minimum bid in SOL. Leave empty for any bid.'
                : minBid > 0
                  ? `Bid more than ${formatSol(minBid)} SOL.`
                  : 'Enter your bid in SOL.'}
            </Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder={modal === 'open' ? '0' : 'e.g. 0.5'}
              placeholderTextColor="#6b5a3a"
              autoFocus
            />
            <PixelButton
              label={
                modal === 'open'
                  ? Number(amount) > 0 ? `OPEN · MIN ${amount} SOL` : 'OPEN · NO MINIMUM'
                  : Number(amount) > 0 ? `BID ${amount} SOL` : 'ENTER AN AMOUNT'
              }
              onPress={submitModal}
              loading={busy}
              disabled={modal === 'bid' && !(Number(amount) > 0)}
            />
            <Pressable onPress={() => !busy && setModal(null)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>[ CLOSE ]</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  topBid: {
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentDim,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    elevation: 4,
  },
  topBidAmount: {
    fontFamily: fonts.pixel,
    fontSize: 9,
    color: colors.accent,
    textShadowColor: colors.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
    marginBottom: 6,
  },
  topBidBy: {
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: '900',
    color: colors.white,
  },
  openText: {
    fontFamily: fonts.pixel,
    fontSize: 7,
    lineHeight: 12,
    color: colors.accent,
    marginBottom: spacing.sm,
  },
  others: { marginBottom: spacing.sm },
  othersLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.grey1,
    marginBottom: 2,
  },
  otherBid: {
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: '900',
    color: colors.grey1,
  },
  waitText: {
    fontFamily: fonts.pixel,
    fontSize: 6,
    color: colors.grey1,
    marginBottom: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  actionBtn: { flex: 1, minWidth: 120, width: undefined },
  actionBtnFull: { marginBottom: spacing.sm },
  royaltyBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.purple,
    backgroundColor: colors.purpleDim,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  royaltyBadgeText: {
    fontFamily: fonts.pixel,
    fontSize: 6,
    color: colors.purple,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.lg,
  },
  modalTitle: { fontFamily: fonts.pixel, fontSize: 10, color: colors.white },
  modalHint: {
    fontFamily: fonts.pixel,
    fontSize: 6,
    lineHeight: 11,
    color: colors.grey1,
    marginTop: spacing.sm,
  },
  input: {
    fontFamily: fonts.mono,
    fontSize: 18,
    color: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginVertical: spacing.md,
  },
  modalClose: { alignItems: 'center', marginTop: spacing.md },
  modalCloseText: { fontFamily: fonts.pixel, fontSize: 7, color: colors.primary },
});
