"use client";

import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { WorkspaceStatus } from "@/types/colorGrade";
import { colors } from "@/theme/theme";

interface StatusMessageProps {
  status: WorkspaceStatus;
  errorMessage: string | null;
}

const STATUS_LABEL: Partial<Record<WorkspaceStatus, string>> = {
  decoding: "Decoding image…",
  rendering: "Rendering preview…",
};

export function StatusMessage({ status, errorMessage }: StatusMessageProps) {
  const label = STATUS_LABEL[status];
  const showBusy = Boolean(label);
  const showError = status === "error" && Boolean(errorMessage);

  if (!showBusy && !showError) {
    return <Box aria-live="polite" sx={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} />;
  }

  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        position: "absolute",
        top: 12,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 2,
        py: 1,
        borderRadius: "10px",
        border: `1px solid ${showError ? "#6B3A3A" : colors.border}`,
        backgroundColor: colors.surfaceRaised,
        color: showError ? "#E8A6A6" : colors.textPrimary,
        zIndex: 5,
        maxWidth: "min(90%, 420px)",
      }}
    >
      {showBusy && <CircularProgress size={16} thickness={5} sx={{ color: colors.textPrimary }} />}
      <Typography variant="body2" sx={{ fontSize: 13 }}>
        {showError ? errorMessage : label}
      </Typography>
    </Box>
  );
}
