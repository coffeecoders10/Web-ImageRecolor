"use client";

import type { ColorGradePreset } from "@/types/colorGrade";
import { PresetCard } from "./PresetCard";
import styles from "./PresetGrid.module.css";

interface PresetGridProps {
  presets: ColorGradePreset[];
  selectedPresetId: string;
  onSelect: (id: string) => void;
}

export function PresetGrid({ presets, selectedPresetId, onSelect }: PresetGridProps) {
  return (
    <div role="radiogroup" aria-label="Color-grade presets" className={styles.grid}>
      {presets.map((preset) => (
        <PresetCard
          key={preset.preset.id}
          preset={preset}
          selected={preset.preset.id === selectedPresetId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
