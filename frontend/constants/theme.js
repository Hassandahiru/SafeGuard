export const theme = {
  colors: {
    primary: '#2563EB',        // Blue
    secondary: '#64748B',      // Slate gray
    accent: '#3B82F6',         // Light blue
    background: '#FFFFFF',     // White
    surface: '#F8FAFC',        // Very light blue-gray
    error: '#EF4444',          // Red
    warning: '#F59E0B',        // Amber
    success: '#10B981',        // Emerald
    disabled: '#F1F5F9',       // Light gray-blue
    text: '#1E293B',           // Dark slate
    textSecondary: '#64748B',  // Slate
    border: {
      light: '#E2E8F0',        // Light slate
      medium: '#CBD5E1',       // Medium slate
      dark: '#94A3B8',         // Dark slate
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  typography: {
    fontSizes: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      xxxl: 32,
    },
    fontWeights: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeights: {
      xs: 16,
      sm: 20,
      md: 24,
      lg: 26,
      xl: 28,
      xxl: 32,
      xxxl: 40,
    },
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
  },
};