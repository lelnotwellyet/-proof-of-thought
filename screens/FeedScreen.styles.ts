import { StyleSheet } from 'react-native';
import { colors, spacing, radius, shadows, fonts } from '../styles/theme';

export const styles = StyleSheet.create({
  // Root
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncBtn: {
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentDim,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    minWidth: 72,
    alignItems: 'center',
  },
  syncBtnText: {
    fontFamily: fonts.pixel,
    fontSize: 7,
    color: colors.accent,
  },
  liveText: {
    fontFamily: fonts.pixel,
    fontSize: 6,
    color: colors.grey1,
    marginTop: spacing.sm,
  },
  searchInput: {
    fontFamily: fonts.mono,
    fontSize: 13,
    fontWeight: '900',
    color: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(13,10,30,0.92)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  sortLabel: {
    fontFamily: fonts.pixel,
    fontSize: 6,
    color: colors.grey1,
  },
  sortChip: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  sortChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryDim,
  },
  sortChipText: {
    fontFamily: fonts.pixel,
    fontSize: 6,
    color: colors.grey1,
  },
  sortChipTextActive: { color: colors.primary },
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
    backgroundColor: 'rgba(13,10,30,0.92)',
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.purple,
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
  authorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  authorDot: {
    width: 6,
    height: 6,
    backgroundColor: colors.purple,
    borderRadius: 3,
  },
  authorDotYou: {
    backgroundColor: colors.accent,
  },
  authorText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.purple,
    fontWeight: '900',
    letterSpacing: 1,
  },
  authorTextYou: {
    color: colors.accent,
    textShadowColor: colors.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  ownerLabel: {
    fontFamily: fonts.pixel,
    fontSize: 6,
    color: colors.grey1,
  },
  ownerName: {
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: '900',
    color: colors.primary,
  },
  cardDate: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: colors.grey1,
    fontWeight: '900',
  },

  // Thought text
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
  youBadge: {
    backgroundColor: 'rgba(0,255,209,0.1)',
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  youBadgeText: {
    fontFamily: fonts.pixel,
    fontSize: 6,
    color: colors.accent,
  },
  saleTag: {
    fontFamily: fonts.pixel,
    fontSize: 7,
    color: colors.accent,
    marginTop: spacing.sm,
    textShadowColor: colors.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },

  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  verifiedTag: {
    fontFamily: fonts.pixel,
    fontSize: 6,
    color: colors.accent,
  },
  loadMoreBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryDim,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  loadMoreText: {
    fontFamily: fonts.pixel,
    fontSize: 8,
    color: colors.primary,
    letterSpacing: 1,
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