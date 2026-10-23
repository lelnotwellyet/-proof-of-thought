import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors, radius, spacing } from '../styles/theme';

/** Placeholder card: pulsing blocks with a glowing scanline sweeping top to bottom. */
export default function SkeletonCard() {
  const [height, setHeight] = useState(0);
  const sweep = useSharedValue(0);
  const pulse = useSharedValue(0.35);

  useEffect(() => {
    sweep.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.linear }), -1);
    pulse.value = withRepeat(withTiming(0.8, { duration: 700 }), -1, true);
  }, []);

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sweep.value * height }],
  }));
  const blockStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View style={styles.card} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      <View style={styles.header}>
        <Animated.View style={[styles.block, { width: 90 }, blockStyle]} />
        <Animated.View style={[styles.block, { width: 60 }, blockStyle]} />
      </View>
      <Animated.View style={[styles.block, styles.line, { width: '92%' }, blockStyle]} />
      <Animated.View style={[styles.block, styles.line, { width: '70%' }, blockStyle]} />
      <Animated.View style={[styles.block, styles.line, { width: '45%' }, blockStyle]} />
      <View style={styles.footer}>
        <Animated.View style={[styles.block, { width: 120 }, blockStyle]} />
      </View>
      <Animated.View pointerEvents="none" style={[styles.scanline, lineStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  block: {
    height: 10,
    backgroundColor: colors.grey2,
  },
  line: { height: 12, marginBottom: spacing.sm },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  scanline: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 2,
    backgroundColor: colors.primaryGlow,
    shadowColor: colors.primary,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 2,
  },
});
