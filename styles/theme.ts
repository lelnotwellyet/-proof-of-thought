export const colors = {
  // Backgrounds
  background: '#080808',
  surface: '#0f0f0f',
  surfaceElevated: '#1a1a1a',

  // Borders
  border: '#2a2a2a',
  borderGlow: '#FF6B0040',

  // Primary — amber/orange retro glow
  primary: '#FF6B00',
  primaryDim: '#FF6B0015',
  primaryGlow: '#FF6B0060',

  // Accent — cyan terminal
  accent: '#00FFD1',
  accentDim: '#00FFD115',

  // Danger
  danger: '#FF2D55',

  // Text
  white: '#F5F0E8',
  grey1: '#888877',
  grey2: '#444433',
  grey3: '#222211',

  // Retro special
  scanline: '#ffffff04',
  crt: '#FF6B0008',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,
};

export const shadows = {
  orange: {
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 8,
  },
  cyan: {
    shadowColor: '#00FFD1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
};

// Retro pixel font — use sparingly for headers only
// Body text uses monospace for terminal feel
export const fonts = {
  pixel: 'PressStart2P_400Regular',
  mono: 'monospace',
};