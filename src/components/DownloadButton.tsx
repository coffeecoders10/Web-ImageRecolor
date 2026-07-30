"use client";

import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";

interface DownloadButtonProps {
  disabled: boolean;
  isExporting: boolean;
  onClick: () => void;
}

export function DownloadButton({ disabled, isExporting, onClick }: DownloadButtonProps) {
  return (
    <Button
      fullWidth
      variant="contained"
      color="primary"
      size="large"
      disabled={disabled || isExporting}
      onClick={onClick}
      startIcon={
        isExporting ? (
          <CircularProgress size={16} thickness={5} sx={{ color: "inherit" }} />
        ) : (
          <DownloadRoundedIcon />
        )
      }
      sx={{ py: 1.2 }}
    >
      {isExporting ? "Preparing PNG…" : "Download PNG"}
    </Button>
  );
}
