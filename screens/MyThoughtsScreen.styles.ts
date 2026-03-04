import { StyleSheet } from 'react-native';
import { colors, spacing, radius, shadows, fonts } from '../styles/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080808',
    paddingTop: 60,
  },
  center: {
    flex: 1,
    backgroundColor: '#080808',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },

  // Header
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.pixel,
    fontSize: 14,
    color: colors.white,
    marginBottom: spacing.xs,
    textShadowColor: '#FF8C00',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontFamily: fonts.pixel,
    fontSize: 7,
    color: colors.accent,
    letterSpacing: 2,
    textShadowColor: colors.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },

  // List
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  // Card
  card: {
    backgroundColor: 'rgba(13,10,30,0.9)',
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cardIndex: {
    fontFamily: fonts.pixel,
    fontSize: 7,
    color: colors.primary,
    textShadowColor: colors.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  cardDate: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: colors.grey1,
    fontWeight: '900',
  },
  thoughtText: {
    fontFamily: fonts.mono,
    fontSize: 14,
    color: colors.white,
    lineHeight: 22,
    marginBottom: spacing.md,
    fontWeight: '900',
  },

  // Play button
  playButton: {
    backgroundColor: 'rgba(153,69,255,0.1)',
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.purple,
    alignSelf: 'flex-start',
  },
  playButtonText: {
    color: colors.purple,
    fontFamily: fonts.pixel,
    fontSize: 7,
    letterSpacing: 1,
  },

  // Card footer
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  explorerLink: {
    fontFamily: fonts.pixel,
    fontSize: 6,
    color: colors.accent,
    letterSpacing: 1,
    textShadowColor: colors.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  mintBadge: {
    backgroundColor: colors.primaryDim,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  mintBadgeText: {
    fontFamily: fonts.pixel,
    fontSize: 6,
    color: colors.primary,
  },

  // Empty state
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontFamily: fonts.pixel,
    fontSize: 10,
    color: colors.white,
    marginBottom: spacing.sm,
    textAlign: 'center',
    textShadowColor: '#FF8C00',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  emptyText: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.grey1,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '900',
  },

  // Loading
  loadingText: {
    fontFamily: fonts.pixel,
    fontSize: 7,
    color: colors.primary,
    marginTop: spacing.md,
    letterSpacing: 2,
  },
});