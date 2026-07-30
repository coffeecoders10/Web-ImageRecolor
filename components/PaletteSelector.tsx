'use client';

import { Box, Stack, Typography } from '@mui/material';
import type { ColorPalette } from '@/lib/palettes';

export type PaletteSelectorProps = {
  palettes: ColorPalette[];
  selectedPaletteId: string;
  onPaletteChange: (paletteId: string) => void;
  disabled?: boolean;
};

export function PaletteSelector({
  palettes,
  selectedPaletteId,
  onPaletteChange,
  disabled = false,
}: PaletteSelectorProps) {
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ flexWrap: 'wrap', justifyContent: { xs: 'flex-start', sm: 'center' } }}
    >
      {palettes.map((palette) => {
        const isSelected = palette.id === selectedPaletteId;

        return (
          <Box
            key={palette.id}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-pressed={isSelected}
            aria-label={`${palette.name} palette${isSelected ? ', selected' : ''}`}
            onClick={() => {
              if (!disabled) {
                onPaletteChange(palette.id);
              }
            }}
            onKeyDown={(event) => {
              if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault();
                onPaletteChange(palette.id);
              }
            }}
            sx={{
              border: '2px solid',
              borderColor: isSelected ? 'primary.main' : 'divider',
              borderRadius: 2,
              bgcolor: isSelected ? 'action.selected' : 'background.paper',
              px: 1,
              py: 0.75,
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
            <Stack spacing={0.5} sx={{ alignItems: 'center' }}>
              <Stack direction="row" spacing={0.4}>
                {palette.colors.map((color) => (
                  <Box
                    key={color}
                    sx={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      bgcolor: color,
                      border: '1px solid rgba(255,255,255,0.15)',
                    }}
                  />
                ))}
              </Stack>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? 'primary.main' : 'text.secondary',
                }}
              >
                {palette.name}
                {isSelected ? ' ✓' : ''}
              </Typography>
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
}
