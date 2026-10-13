import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing } from '../styles/theme';

type Props = { verified: boolean };

export default function VerificationBadge({ verified }: Props) {
  return (
    <View style={[styles.badge, verified ? styles.ok : styles.pending]}>
      <Text style={[styles.text, verified ? styles.okText : styles.pendingText]}>
        {verified ? '[✓ VERIFIED ON-CHAIN]' : '[? UNVERIFIED]'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  ok: {
    borderColor: colors.accent,
    backgroundColor: colors.accentDim,
    shadowColor: colors.accent,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  pending: {
    borderColor: colors.lcdDim,
    backgroundColor: '#2a220f',
    shadowColor: colors.lcdDim,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  text: { fontFamily: fonts.pixel, fontSize: 7, lineHeight: 14 },
  okText: { color: colors.accent },
  pendingText: { color: colors.lcd },
});