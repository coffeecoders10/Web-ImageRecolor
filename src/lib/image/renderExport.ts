import type { ColorGradePreset } from "@/types/colorGrade";
import { ColorGradeEngine } from "../grading/ColorGradeEngine";

/**
 * Re-runs the full grading pipeline at the source image's original
 * dimensions and returns a canvas ready for PNG export. A dedicated,
 * short-lived engine instance is used so the full-resolution render never
 * competes with the live preview's WebGL context.
 */
export function renderExportCanvas(
  bitmap: ImageBitmap,
  preset: ColorGradePreset,
  strength: number
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  const engine = new ColorGradeEngine(canvas);
  try {
    engine.setSourceImage(bitmap);
    engine.render(preset, strength);
  } finally {
    engine.dispose();
  }

  return canvas;
}
