import { createTheme } from "@mui/material/styles";

export const colors = {
  page: "#0D0F10",
  surface: "#15181A",
  surfaceRaised: "#1B1F22",
  surfaceHover: "#23282C",
  selected: "#30363B",
  border: "#2B3034",
  borderStrong: "#596168",
  textPrimary: "#F1F3F4",
  textSecondary: "#9CA4AA",
  textMuted: "#717980",
  primaryButton: "#E3E6E8",
  primaryButtonText: "#101214",
  focusRing: "#B9C0C5",
} as const;

export const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: colors.page,
      paper: colors.surface,
    },
    text: {
      primary: colors.textPrimary,
      secondary: colors.textSecondary,
      disabled: colors.textMuted,
    },
    primary: {
      main: colors.primaryButton,
      contrastText: colors.primaryButtonText,
    },
    divider: colors.border,
  },
  shape: {
    borderRadius: 14,
  },
  typography: {
    fontFamily:
      'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: colors.page,
          color: colors.textPrimary,
        },
        "*:focus-visible": {
          outline: `2px solid ${colors.focusRing}`,
          outlineOffset: "2px",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 12,
          fontWeight: 600,
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          color: colors.textPrimary,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: colors.surfaceRaised,
          border: `1px solid ${colors.border}`,
          color: colors.textPrimary,
          fontSize: 12,
        },
      },
    },
  },
});
