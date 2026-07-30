"use client";

import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import type { ColorGradePreset } from "@/types/colorGrade";
import styles from "./PresetCard.module.css";

interface PresetCardProps {
  preset: ColorGradePreset;
  selected: boolean;
  onSelect: (id: string) => void;
}

function wheelToHsl(hueDegrees: number, saturation: number, baseLightness: number): string {
  const clampedSat = Math.min(1, Math.max(0, 0.35 + saturation * 3));
  const clampedLight = Math.min(0.85, Math.max(0.15, baseLightness));
  return `hsl(${hueDegrees}deg ${Math.round(clampedSat * 100)}% ${Math.round(clampedLight * 100)}%)`;
}

function buildSwatchGradient(preset: ColorGradePreset): string {
  const { shadows, midtones, highlights } = preset.colorWheels;
  const shadowColor = wheelToHsl(shadows.hueDegrees, shadows.saturation, 0.28);
  const midColor = wheelToHsl(midtones.hueDegrees, midtones.saturation, 0.52);
  const highlightColor = wheelToHsl(highlights.hueDegrees, highlights.saturation, 0.78);
  return `linear-gradient(135deg, ${shadowColor} 0%, ${midColor} 50%, ${highlightColor} 100%)`;
}

export function PresetCard({ preset, selected, onSelect }: PresetCardProps) {
  const gradient = buildSwatchGradient(preset);

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={`${styles.card} ${selected ? styles.cardSelected : ""}`}
      onClick={() => onSelect(preset.preset.id)}
    >
      <div className={styles.topRow}>
        <div className={styles.swatch} style={{ background: gradient }} aria-hidden="true" />
        <div className={styles.name}>{preset.preset.name}</div>
        {selected && (
          <span className={styles.checkWrap} aria-hidden="true">
            <CheckCircleRoundedIcon fontSize="small" />
          </span>
        )}
      </div>
      <div className={styles.description}>{preset.preset.description}</div>
    </button>
  );
}
