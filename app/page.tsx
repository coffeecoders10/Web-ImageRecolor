'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { UploadPanel } from '@/components/UploadPanel';
import { PaletteSelector } from '@/components/PaletteSelector';
import { ImagePreviewGrid } from '@/components/ImagePreviewGrid';
import { COLOR_PALETTES } from '@/lib/palettes';
import { validateImageFile } from '@/lib/fileValidation';
import { recolorImageWithPalette } from '@/lib/imageProcessing';

type AppStatus = 'idle' | 'image-loaded' | 'processing' | 'processed' | 'error';

function downloadImage(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [selectedPaletteId, setSelectedPaletteId] = useState<string>('neon-dusk');
  const [status, setStatus] = useState<AppStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const processingTokenRef = useRef(0);

  const selectedPalette =
    COLOR_PALETTES.find((palette) => palette.id === selectedPaletteId) ?? COLOR_PALETTES[0];

  const runRecolor = useCallback(async (file: File, paletteColors: string[]) => {
    const token = ++processingTokenRef.current;
    setStatus('processing');
    setErrorMessage(null);

    try {
      const blob = await recolorImageWithPalette(file, paletteColors);

      if (token !== processingTokenRef.current) {
        return;
      }

      setProcessedImageUrl((previousUrl) => {
        if (previousUrl) {
          URL.revokeObjectURL(previousUrl);
        }
        return URL.createObjectURL(blob);
      });
      setStatus('processed');
    } catch {
      if (token !== processingTokenRef.current) {
        return;
      }
      setErrorMessage('Something went wrong while recoloring the image. Please try again.');
      setStatus('error');
    }
  }, []);

  const handleFileSelected = useCallback(
    (file: File) => {
      const validationError = validateImageFile(file);

      if (validationError) {
        setErrorMessage(validationError);
        setStatus('error');
        return;
      }

      setErrorMessage(null);
      setSelectedFile(file);

      setOriginalImageUrl((previousUrl) => {
        if (previousUrl) {
          URL.revokeObjectURL(previousUrl);
        }
        return URL.createObjectURL(file);
      });

      setProcessedImageUrl((previousUrl) => {
        if (previousUrl) {
          URL.revokeObjectURL(previousUrl);
        }
        return null;
      });

      setStatus('image-loaded');
      void runRecolor(file, selectedPalette.colors);
    },
    [runRecolor, selectedPalette.colors]
  );

  const handlePaletteChange = useCallback(
    (paletteId: string) => {
      setSelectedPaletteId(paletteId);

      if (!selectedFile || paletteId === selectedPaletteId) {
        return;
      }

      const palette = COLOR_PALETTES.find((item) => item.id === paletteId);
      if (palette && selectedFile) {
        void runRecolor(selectedFile, palette.colors);
      }
    },
    [selectedFile, selectedPaletteId, runRecolor]
  );

  const handleDownload = useCallback(() => {
    if (!processedImageUrl) {
      return;
    }
    downloadImage(processedImageUrl, `recolored-${selectedPalette.slug}.png`);
  }, [processedImageUrl, selectedPalette.slug]);

  useEffect(() => {
    return () => {
      if (originalImageUrl) {
        URL.revokeObjectURL(originalImageUrl);
      }
      if (processedImageUrl) {
        URL.revokeObjectURL(processedImageUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isImageLoaded = Boolean(selectedFile);
  const isProcessing = status === 'processing';

  return (
    <Box
      sx={{
        height: '100dvh',
        width: '100%',
        maxWidth: 900,
        mx: 'auto',
        p: 1.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        overflow: 'hidden',
      }}
    >
      <UploadPanel
        onFileSelected={handleFileSelected}
        errorMessage={status === 'error' ? errorMessage : null}
        selectedFileName={selectedFile?.name ?? null}
      />

      <PaletteSelector
        palettes={COLOR_PALETTES}
        selectedPaletteId={selectedPaletteId}
        onPaletteChange={handlePaletteChange}
        disabled={!isImageLoaded}
      />

      <Box sx={{ flex: 1, minHeight: 0 }}>
        <ImagePreviewGrid
          originalImageUrl={originalImageUrl}
          processedImageUrl={processedImageUrl}
          isProcessing={isProcessing}
          onDownload={handleDownload}
        />
      </Box>
    </Box>
  );
}
