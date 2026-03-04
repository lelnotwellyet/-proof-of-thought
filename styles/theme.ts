export const colors = {
  // Backgrounds
  background: '#0D0A1E',
  surface: '#160F2E',
  surfaceElevated: '#1E1442',
  bezel: '#2b2f35',

  // Borders
  border: '#2D1F5E',
  borderGlow: '#FF6B0040',

  // Primary — orange
  primary: '#FF6B00',
  primaryDim: '#FF6B0015',
  primaryGlow: '#FF6B0060',

  // Accent — cyan
  accent: '#00FFD1',
  accentDim: '#00FFD115',

  // Purple
  purple: '#9945FF',
  purpleDim: '#9945FF20',

  // Text
  white: '#F8F8FF',
  grey1: '#8B7EA8',
  grey2: '#3D2F6B',
  grey3: '#1E1442',

  // PDA colors — WriteThought screen only
  lcd: '#f3d9a3',
  lcdDark: '#e8c97a',
  lcdInk: '#3a2700',
  lcdDim: '#a38241',
  lcdLine: 'rgba(0,0,0,0.06)',
  lcdBorder: 'rgba(0,0,0,0.25)',
  lcdHighlight: 'rgba(255,255,255,0.28)',

  // Status
  danger: '#cc2200',
  success: '#2a6600',

  // Scanline
  scanline: '#FF6B0008',
  particle: '#00FFD1',
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
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
  purple: {
    shadowColor: '#9945FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  cyan: {
    shadowColor: '#00FFD1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  lcd: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  amber: {
    shadowColor: '#a38241',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
};

export const fonts = {
  pixel: 'PressStart2P_400Regular',
  mono: 'monospace',
  body: undefined,
};