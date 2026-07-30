'use client';

import { Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';

export type ImagePreviewGridProps = {
  originalImageUrl: string | null;
  processedImageUrl: string | null;
  isProcessing: boolean;
  onDownload: () => void;
};

function PreviewCard({
  imageUrl,
  emptyText,
  isProcessing,
}: {
  imageUrl: string | null;
  emptyText: string;
  isProcessing?: boolean;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        flex: 1,
        minHeight: 0,
        borderColor: 'divider',
        bgcolor: 'background.default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {isProcessing ? (
        <CircularProgress size={24} sx={{ color: 'primary.main' }} />
      ) : imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ px: 2, textAlign: 'center' }}>
          {emptyText}
        </Typography>
      )}
    </Paper>
  );
}

export function ImagePreviewGrid({
  originalImageUrl,
  processedImageUrl,
  isProcessing,
  onDownload,
}: ImagePreviewGridProps) {
  return (
    <Stack spacing={1} sx={{ height: '100%', minHeight: 0 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ flex: 1, minHeight: 0 }}>
        <PreviewCard imageUrl={originalImageUrl} emptyText="Original" />
        <PreviewCard imageUrl={processedImageUrl} emptyText="Recolored" isProcessing={isProcessing} />
      </Stack>
      <Button
        variant="contained"
        size="small"
        startIcon={<DownloadIcon />}
        disabled={!processedImageUrl || isProcessing}
        onClick={onDownload}
      >
        Download
      </Button>
    </Stack>
  );
}
