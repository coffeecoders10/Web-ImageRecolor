import { ExtractedColor } from "./paletteExtraction";
import { PredefinedPalette, PaletteColor } from "@/data/predefinedPalettes";
import { hexToRgb, rgbToOklch, hueDistance, OKLCh } from "./colorConversion";

export interface TargetSwatch {
  hex: string;
  role: "dominant" | "secondary" | "accent";
  oklch: OKLCh;
}

export interface ColorMapping {
  source: ExtractedColor;
  target: TargetSwatch;
}

function paletteSwatches(palette: PredefinedPalette): TargetSwatch[] {
  return palette.colors.map((c: PaletteColor) => ({
    hex: c.hex,
    role: c.role,
    oklch: rgbToOklch(hexToRgb(c.hex)),
  }));
}

// Score how well a target swatch fits a source color: rewards hue similarity
// and penalizes large saturation/role mismatches. Lower is better.
function matchScore(source: ExtractedColor, target: TargetSwatch): number {
  const sourceOklch = { L: source.oklab.L, C: 0, h: 0 };
  // recompute hue/chroma directly since ExtractedColor stores oklab, not oklch
  const a = source.oklab.a;
  const b = source.oklab.b;
  const C = Math.sqrt(a * a + b * b);
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  sourceOklch.C = C;
  sourceOklch.h = h;

  const hueDiff = source.isNeutral ? 0 : hueDistance(sourceOklch.h, target.oklch.h) / 180;
  const satDiff = Math.abs(sourceOklch.C - target.oklch.C);
  const warmCoolPenalty =
    !source.isNeutral && source.isWarm !== isWarmOklch(target.oklch.h) ? 0.3 : 0;

  return hueDiff * 0.6 + satDiff * 1.5 + warmCoolPenalty;
}

function isWarmOklch(hue: number): boolean {
  // OKLCh hue wheel: roughly reds/oranges/yellows sit between ~0-100deg
  return hue >= 0 && hue <= 100;
}

// Build a mapping from each extracted source color to a target palette swatch.
// Rules:
//  - The most frequent (highest importance) source color maps to the palette's
//    dominant swatch.
//  - Small/accent source colors preferentially map to accent swatches.
//  - Remaining colors are matched by hue/saturation/warmth similarity.
//  - Neutral source colors are excluded (handled separately — they stay close
//    to original in the recolor pipeline).
export function createPaletteMapping(
  sourceColors: ExtractedColor[],
  targetPalette: PredefinedPalette
): ColorMapping[] {
  const swatches = paletteSwatches(targetPalette);
  const dominantSwatches = swatches.filter((s) => s.role === "dominant");
  const secondarySwatches = swatches.filter((s) => s.role === "secondary");
  const accentSwatches = swatches.filter((s) => s.role === "accent");

  const chromatic = sourceColors.filter((c) => !c.isNeutral);
  const sorted = [...chromatic].sort((a, b) => b.importance - a.importance);

  const mappings: ColorMapping[] = [];
  const usedDominant = new Set<string>();

  sorted.forEach((source, index) => {
    let candidatePool: TargetSwatch[];

    if (index === 0 && dominantSwatches.length > 0) {
      // Most frequent color -> dominant palette color.
      candidatePool = dominantSwatches;
    } else if (source.percentage < 0.06 && accentSwatches.length > 0) {
      // Small/accent-sized source regions -> accent colors preferentially.
      candidatePool = accentSwatches;
    } else {
      candidatePool = [...secondarySwatches, ...dominantSwatches, ...accentSwatches];
    }

    let best = candidatePool[0];
    let bestScore = Infinity;
    for (const swatch of candidatePool) {
      const score = matchScore(source, swatch);
      if (score < bestScore) {
        bestScore = score;
        best = swatch;
      }
    }

    // Avoid collapsing everything onto a single dominant swatch when there are
    // multiple large regions: after the first use, nudge subsequent picks of
    // the same dominant swatch toward alternates if available.
    if (best.role === "dominant" && usedDominant.has(best.hex) && dominantSwatches.length > 1) {
      const alt = dominantSwatches.find((s) => s.hex !== best.hex);
      if (alt) best = alt;
    }
    if (best.role === "dominant") usedDominant.add(best.hex);

    mappings.push({ source, target: best });
  });

  return mappings;
}

export function findMappingForColor(
  mappings: ColorMapping[],
  oklab: { L: number; a: number; b: number }
): ColorMapping | null {
  if (mappings.length === 0) return null;
  let best = mappings[0];
  let bestDist = Infinity;
  for (const m of mappings) {
    const dL = m.source.oklab.L - oklab.L;
    const da = m.source.oklab.a - oklab.a;
    const db = m.source.oklab.b - oklab.b;
    const dist = Math.sqrt(dL * dL + da * da + db * db);
    if (dist < bestDist) {
      bestDist = dist;
      best = m;
    }
  }
  return best;
}
