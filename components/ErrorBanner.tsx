import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing } from '../styles/theme';

type Props = {
  message: string;
  onRetry?: () => void;
};

export default function ErrorBanner({ message, onRetry }: Props) {
  return (
    <View style={styles.banner}>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <Pressable onPress={onRetry} style={styles.retry}>
          <Text style={styles.retryText}>RETRY</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#3a120c',
    borderWidth: 1,
    borderColor: colors.danger,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  message: {
    flex: 1,
    fontFamily: fonts.pixel,
    fontSize: 7,
    lineHeight: 14,
    color: '#ffb4a8',
  },
  retry: {
    borderWidth: 1,
    borderColor: '#ffb4a8',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  retryText: {
    fontFamily: fonts.pixel,
    fontSize: 7,
    color: colors.white,
  },
});
