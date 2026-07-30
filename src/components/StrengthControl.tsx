"use client";

import Box from "@mui/material/Box";
import Slider from "@mui/material/Slider";
import Typography from "@mui/material/Typography";

interface StrengthControlProps {
  strength: number; // 0..100
  onChange: (value: number) => void;
}

export function StrengthControl({ strength, onChange }: StrengthControlProps) {
  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: 0.5 }}>
        <Typography
          id="strength-slider-label"
          component="label"
          htmlFor="strength-slider"
          variant="body2"
          sx={{ fontWeight: 600, color: "text.primary" }}
        >
          Strength
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
          {Math.round(strength)}%
        </Typography>
      </Box>
      <Slider
        id="strength-slider"
        aria-labelledby="strength-slider-label"
        value={strength}
        min={0}
        max={100}
        step={1}
        valueLabelDisplay="auto"
        valueLabelFormat={(value) => `${value}%`}
        onChange={(_, value) => onChange(Array.isArray(value) ? value[0] : value)}
      />
    </Box>
  );
}
