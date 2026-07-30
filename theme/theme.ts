import { createTheme } from '@mui/material/styles';

export const themeColors = {
  background: '#000000',
  surface: '#222222',
  surfaceElevated: '#36454F',
  border: '#36454F',
  textPrimary: '#FFFFFF',
  textSecondary: '#A9A9A9',
  accent: '#A9A9A9',
  accentHover: '#808080',
  error: '#F87171',
  success: '#34D399',
};

export const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: themeColors.background,
      paper: themeColors.surface,
    },
    text: {
      primary: themeColors.textPrimary,
      secondary: themeColors.textSecondary,
    },
    primary: {
      main: themeColors.accent,
      dark: themeColors.accentHover,
      contrastText: themeColors.background,
    },
    error: {
      main: themeColors.error,
    },
    success: {
      main: themeColors.success,
    },
    divider: themeColors.border,
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily: 'var(--font-geist-sans), Arial, Helvetica, sans-serif',
    h1: {
      fontSize: '1.5rem',
      fontWeight: 700,
    },
    h2: {
      fontSize: '1rem',
      fontWeight: 600,
    },
    body2: {
      color: themeColors.textSecondary,
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
        },
      },
    },
  },
});
