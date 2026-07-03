// Legate Design System - Based on Mockup
export const colors = {
  navy: '#1B2A4A',
  navyLight: '#243560',
  gold: '#C9A84C',
  goldLight: '#E2C97E',
  goldPale: '#F5EDD4',
  cream: '#F9F7F4',
  white: '#FFFFFF',
  textPrimary: '#1B2A4A',
  textSecondary: '#5C6B8A',
  textMuted: '#9CA3AF',
  border: '#E8E4DC',
  success: '#2D7D5A',
  warning: '#B87333',
  error: '#8B3A3A',
  surface: '#FFFFFF',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  xxl: 20,
  round: 28,
};

export const typography = {
  heading: {
    fontSize: 28,
    fontWeight: '400' as const,
    // Using system serif font (similar to Cormorant Garamond)
    fontFamily: 'serif',
  },
  headingLarge: {
    fontSize: 32,
    fontWeight: '400' as const,
    fontFamily: 'serif',
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '400' as const,
  },
  label: {
    fontSize: 11,
    fontWeight: '500' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
};
