import { StyleSheet } from 'react-native';
import { colors, radius, spacing } from './theme';

export const global = StyleSheet.create({
  // Containers
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenPadded: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    paddingTop: 60,
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Cards
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardGlow: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderGlow,
  },

  // Buttons
  buttonPrimary: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  buttonOutline: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },

  // Typography
  h1: { fontSize: 34, fontWeight: '800' as const, color: colors.white },
  h2: { fontSize: 24, fontWeight: '700' as const, color: colors.white },
  h3: { fontSize: 18, fontWeight: '600' as const, color: colors.white },
  body: { fontSize: 16, color: colors.grey1, lineHeight: 24 },
  caption: { fontSize: 12, color: colors.grey2 },
  mono: { fontSize: 13, fontFamily: 'monospace' as const, color: colors.grey1 },

  // Divider
  divider: {
    width: 40,
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: 2,
    opacity: 0.4,
    marginVertical: spacing.lg,
  },

  // Row
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  rowBetween: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },

  // Badge
  badge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.accentDim,
    borderWidth: 1,
    borderColor: `${colors.accent}40`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    gap: spacing.sm,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  badgeText: {
    color: colors.accent,
    fontSize: 13,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },

  // Empty state
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: 18, fontWeight: '600' as const, color: colors.white, marginBottom: spacing.sm },
  emptyText: { fontSize: 16, color: colors.grey1, lineHeight: 24, textAlign: 'center' as const },

  // Loading
  loadingText: { color: colors.grey1, marginTop: spacing.md },
});