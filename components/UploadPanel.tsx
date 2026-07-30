'use client';

import { useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { ACCEPTED_IMAGE_TYPES } from '@/lib/fileValidation';

export type UploadPanelProps = {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
  errorMessage?: string | null;
  selectedFileName?: string | null;
};

export function UploadPanel({
  onFileSelected,
  disabled = false,
  errorMessage,
  selectedFileName,
}: UploadPanelProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }
    onFileSelected(files[0]);
  }

  return (
    <Box
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Upload an image by clicking or dragging a file here"
      onClick={() => {
        if (!disabled) {
          inputRef.current?.click();
        }
      }}
      onKeyDown={(event) => {
        if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) {
          setIsDragOver(true);
        }
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragOver(false);
        if (!disabled) {
          handleFiles(event.dataTransfer.files);
        }
      }}
      sx={{
        border: '2px dashed',
        borderColor: isDragOver ? 'primary.main' : 'divider',
        borderRadius: 2,
        bgcolor: isDragOver ? 'rgba(169, 169, 169, 0.08)' : 'background.paper',
        px: 2,
        py: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'border-color 0.15s ease, background-color 0.15s ease',
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: 2,
        },
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        aria-label="Choose an image file to upload"
        disabled={disabled}
        hidden
        onChange={(event) => handleFiles(event.target.files)}
      />
      <UploadFileIcon sx={{ fontSize: 20, color: 'primary.main' }} />
      <Typography variant="body2" noWrap sx={{ color: errorMessage ? 'error.main' : undefined }}>
        {errorMessage
          ? errorMessage
          : selectedFileName
            ? selectedFileName
            : 'Click or drop an image to upload'}
      </Typography>
    </Box>
  );
}
