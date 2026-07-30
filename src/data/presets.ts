import type { ColorGradePreset } from "@/types/colorGrade";
import presetsJson from "./presets.json";

export const presets = presetsJson as unknown as ColorGradePreset[];

export function getPresetById(id: string): ColorGradePreset | undefined {
  return presets.find((entry) => entry.preset.id === id);
}
