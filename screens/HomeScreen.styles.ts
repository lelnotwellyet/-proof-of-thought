import { StyleSheet, Dimensions } from 'react-native';
import { colors, spacing, radius, shadows, fonts } from '../styles/theme';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080808',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  content: {
    width: '100%',
    alignItems: 'center',
    zIndex: 1,
    paddingHorizontal: spacing.md,
  },

  // Logo
  logoImage: {
    width: 100,
    height: 100,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.5)',
    backgroundColor: 'rgba(20,15,40,0.8)',
    ...shadows.orange,
  },

  // Title
  title: {
    fontFamily: fonts.pixel,
    fontSize: 14,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.sm,
    lineHeight: 26,
    textShadowColor: '#FF8C00',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontFamily: fonts.pixel,
    fontSize: 6,
    color: colors.accent,
    letterSpacing: 3,
    marginBottom: spacing.lg,
    textAlign: 'center',
    textShadowColor: colors.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.lg,
    opacity: 0.6,
  },

  // Connected badge
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,255,209,0.08)',
    borderWidth: 2,
    borderColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.sm,
    gap: spacing.sm,
    marginBottom: spacing.lg,
    ...shadows.cyan,
  },
  connectedDot: {
    width: 7,
    height: 7,
    backgroundColor: colors.accent,
  },
  connectedText: {
    color: colors.accent,
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '900',
    textShadowColor: colors.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },

  // Write button
  writeButtonWrapper: {
    width: '100%',
    marginBottom: spacing.md,
    borderRadius: radius.sm,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.white,
    ...shadows.orange,
  },
  writeButtonGradient: {
    width: '100%',
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  writeButtonText: {
    color: colors.white,
    fontFamily: fonts.pixel,
    fontSize: 10,
    letterSpacing: 1,
  },

  // Stats
  statsRow: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: 'rgba(8,8,8,0.85)',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  statItem: {
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    color: colors.primary,
    fontFamily: fonts.pixel,
    fontSize: 10,
    textShadowColor: colors.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  statLabel: {
    color: colors.grey1,
    fontSize: 7,
    fontFamily: fonts.pixel,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },

  // Disconnect
  disconnectButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
  disconnectText: {
    color: colors.grey1,
    fontFamily: fonts.mono,
    fontSize: 11,
  },

  // Not connected
  tagline: {
    fontSize: 13,
    color: colors.grey1,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
    fontFamily: fonts.mono,
    fontWeight: '900',
  },
  taglineHighlight: {
    color: colors.primary,
    fontFamily: fonts.pixel,
    fontSize: 11,
    textShadowColor: colors.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  connectButtonWrapper: {
    width: '100%',
    marginBottom: spacing.sm,
    borderRadius: radius.sm,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.white,
    ...shadows.orange,
  },
  connectButtonGradient: {
    width: '100%',
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectButtonText: {
    color: colors.white,
    fontFamily: fonts.pixel,
    fontSize: 11,
    letterSpacing: 1,
  },
  walletHint: {
    color: colors.grey2,
    fontFamily: fonts.mono,
    fontSize: 11,
    textAlign: 'center',
  },
  loadingText: {
    color: colors.primary,
    fontFamily: fonts.pixel,
    fontSize: 8,
    marginTop: spacing.md,
    letterSpacing: 1,
  },
  bottomText: {
    position: 'absolute',
    bottom: 32,
    color: colors.grey2,
    fontFamily: fonts.pixel,
    fontSize: 6,
    letterSpacing: 2,
  },
});