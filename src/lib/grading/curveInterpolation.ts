import type { CurvePoint } from "@/types/colorGrade";
import { clamp } from "./colorMath";

export const CURVE_LUT_SIZE = 256;

/**
 * Catmull-Rom interpolation through the preset's control points, sampled
 * into a fixed-size lookup table so the shader can read it as a 1D texture.
 */
export function buildCurveLut(points: CurvePoint[]): Float32Array {
  const sorted = [...points].sort((a, b) => a.input - b.input);
  const lut = new Float32Array(CURVE_LUT_SIZE);

  for (let i = 0; i < CURVE_LUT_SIZE; i++) {
    const x = i / (CURVE_LUT_SIZE - 1);
    lut[i] = clamp(sampleCatmullRom(sorted, x), 0, 1);
  }

  return lut;
}

function sampleCatmullRom(points: CurvePoint[], x: number): number {
  if (points.length === 0) return x;
  if (points.length === 1) return points[0].output;

  if (x <= points[0].input) return points[0].output;
  if (x >= points[points.length - 1].input) return points[points.length - 1].output;

  let segment = 0;
  for (let i = 0; i < points.length - 1; i++) {
    if (x >= points[i].input && x <= points[i + 1].input) {
      segment = i;
      break;
    }
  }

  const p1 = points[segment];
  const p2 = points[segment + 1];
  const p0 = points[Math.max(segment - 1, 0)];
  const p3 = points[Math.min(segment + 2, points.length - 1)];

  const span = p2.input - p1.input;
  const t = span === 0 ? 0 : (x - p1.input) / span;

  return catmullRom(p0.output, p1.output, p2.output, p3.output, t);
}

function catmullRom(
  y0: number,
  y1: number,
  y2: number,
  y3: number,
  t: number
): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * y1 +
      (-y0 + y2) * t +
      (2 * y0 - 5 * y1 + 4 * y2 - y3) * t2 +
      (-y0 + 3 * y1 - 3 * y2 + y3) * t3)
  );
}
