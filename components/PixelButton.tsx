import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, radius, spacing } from '../styles/theme';

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'solid' | 'outline';
  onPressIn?: () => void;
  onPressOut?: () => void;
  style?: ViewStyle;
};

export default function PixelButton({
  label,
  onPress,
  loading,
  disabled,
  variant = 'solid',
  onPressIn,
  onPressOut,
  style,
}: Props) {
  const inactive = disabled || loading;
  const inner = loading ? (
    <ActivityIndicator color={variant === 'outline' ? colors.primary : colors.white} size="small" />
  ) : (
    <Text style={[styles.label, variant === 'outline' && styles.labelOutline]}>{label}</Text>
  );

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={inactive}
      style={[styles.wrap, inactive && styles.disabled, style]}
    >
      {variant === 'outline' ? (
        <View style={styles.outlineBox}>{inner}</View>
      ) : (
        <LinearGradient colors={['#FF7A00', '#D45A00']} style={styles.gradient}>
          {inner}
        </LinearGradient>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  disabled: { opacity: 0.55 },
  gradient: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  outlineBox: {
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  label: {
    fontFamily: fonts.pixel,
    fontSize: 8,
    color: colors.white,
    textAlign: 'center',
  },
  labelOutline: { color: colors.primary },
});
