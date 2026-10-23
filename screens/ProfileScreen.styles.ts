import { StyleSheet } from 'react-native';
import { colors, spacing, radius, shadows, fonts } from '../styles/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080808',
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.xxl,
  },
  center: {
    flex: 1,
    backgroundColor: '#080808',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  backBtn: {
    fontFamily: fonts.pixel,
    fontSize: 8,
    color: colors.primary,
    marginBottom: spacing.md,
  },

  // Identity card
  idCard: {
    backgroundColor: 'rgba(13,10,30,0.95)',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.orange,
  },
  idHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  idLabel: {
    fontFamily: fonts.pixel,
    fontSize: 8,
    color: colors.primary,
    letterSpacing: 2,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  onlineText: {
    fontFamily: fonts.pixel,
    fontSize: 6,
    color: colors.accent,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  username: {
    flex: 1,
    fontFamily: fonts.pixel,
    fontSize: 13,
    color: colors.white,
    textShadowColor: '#FF8C00',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  editBtn: {
    borderWidth: 1,
    borderColor: colors.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  editText: {
    fontFamily: fonts.pixel,
    fontSize: 7,
    color: colors.accent,
  },
  wallet: {
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: '900',
    color: colors.grey1,
  },

  // Level / XP
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  levelText: {
    fontFamily: fonts.pixel,
    fontSize: 7,
    color: colors.purple,
  },
  xpTrack: {
    height: 6,
    backgroundColor: colors.grey3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  xpFill: {
    height: '100%',
    backgroundColor: colors.purple,
  },
  repHint: {
    fontFamily: fonts.pixel,
    fontSize: 5,
    lineHeight: 10,
    color: colors.grey1,
    marginTop: spacing.sm,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statTile: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(13,10,30,0.92)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    ...shadows.purple,
  },
  statValue: {
    fontFamily: fonts.pixel,
    fontSize: 13,
    color: colors.accent,
    marginBottom: spacing.sm,
    textShadowColor: colors.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  statLabel: {
    fontFamily: fonts.pixel,
    fontSize: 6,
    lineHeight: 10,
    color: colors.grey1,
    textAlign: 'center',
  },
  royaltyBar: {
    borderWidth: 1,
    borderColor: colors.purple,
    backgroundColor: colors.purpleDim,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  royaltyText: {
    fontFamily: fonts.pixel,
    fontSize: 7,
    lineHeight: 12,
    color: colors.white,
  },


  // Thought list
  sectionLabel: {
    fontFamily: fonts.pixel,
    fontSize: 8,
    color: colors.primary,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    letterSpacing: 2,
  },
  thoughtRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  thoughtText: {
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '900',
    color: colors.white,
  },
  thoughtIcon: {
    fontFamily: fonts.mono,
    fontSize: 16,
    color: colors.accent,
  },
  thoughtMeta: {
    fontFamily: fonts.pixel,
    fontSize: 6,
    lineHeight: 10,
    color: colors.grey1,
    marginTop: spacing.sm,
  },
  thoughtMetaHot: { color: colors.accent },
  thoughtFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  emptyText: {
    fontFamily: fonts.mono,
    fontSize: 12,
    fontWeight: '900',
    color: colors.grey1,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  emptyTitle: {
    fontFamily: fonts.pixel,
    fontSize: 10,
    color: colors.white,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  loadingText: {
    fontFamily: fonts.pixel,
    fontSize: 7,
    color: colors.primary,
    marginTop: spacing.md,
    letterSpacing: 2,
  },

  // Username modal
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
  modalTitle: {
    fontFamily: fonts.pixel,
    fontSize: 10,
    color: colors.white,
  },
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
  modalError: {
    fontFamily: fonts.pixel,
    fontSize: 6,
    color: '#ffb4a8',
    marginBottom: spacing.sm,
  },
  modalSecondary: { marginTop: spacing.md },
});
