import { PredefinedPalette } from "@/data/predefinedPalettes";
import { extractPalette, ExtractedColor } from "./paletteExtraction";
import { classifyRegions, REGION_STRENGTH, REGION_ORDER } from "./imageSegmentation";
import { createPaletteMapping, ColorMapping } from "./paletteMapping";
import { rgbToOklab, oklabToRgb, clamp } from "./colorConversion";

export interface RecolorResult {
  canvas: HTMLCanvasElement;
  sourcePalette: ExtractedColor[];
}

export interface RecolorOptions {
  strength: number; // 0-1
  onProgress?: (fraction: number) => void;
}

// Find the nearest source-palette mapping for a pixel's OKLab color, weighted
// toward chromatic (non-neutral) source clusters so genuinely neutral pixels
// fall back to "no strong match" handling in the caller.
function nearestMapping(
  mappings: ColorMapping[],
  L: number,
  a: number,
  b: number
): { mapping: ColorMapping; distance: number } | null {
  if (mappings.length === 0) return null;
  let best = mappings[0];
  let bestDist = Infinity;
  for (const m of mappings) {
    const dL = m.source.oklab.L - L;
    const da = m.source.oklab.a - a;
    const db = m.source.oklab.b - b;
    const dist = Math.sqrt(dL * dL + da * da + db * db);
    if (dist < bestDist) {
      bestDist = dist;
      best = m;
    }
  }
  return { mapping: best, distance: bestDist };
}

// Light edge-aware smoothing on the chroma channels only (a/b), to reduce
// banding introduced by discrete palette mapping while preserving luminance
// edges (detail/texture) exactly as sampled from the original.
function smoothChroma(aChan: Float32Array, bChan: Float32Array, lChan: Float32Array, width: number, height: number) {
  const outA = new Float32Array(aChan.length);
  const outB = new Float32Array(bChan.length);
  const EDGE_THRESHOLD = 0.06;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const l0 = lChan[idx];

      let sumA = aChan[idx];
      let sumB = bChan[idx];
      let count = 1;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const nIdx = ny * width + nx;
          // Skip smoothing across strong lightness edges to avoid bleeding
          // color across subject/background boundaries.
          if (Math.abs(lChan[nIdx] - l0) > EDGE_THRESHOLD) continue;
          sumA += aChan[nIdx];
          sumB += bChan[nIdx];
          count++;
        }
      }

      outA[idx] = sumA / count;
      outB[idx] = sumB / count;
    }
  }

  return { a: outA, b: outB };
}

export async function recolorImage(
  image: HTMLImageElement,
  targetPalette: PredefinedPalette,
  options: RecolorOptions
): Promise<RecolorResult> {
  const { strength, onProgress } = options;

  const width = image.naturalWidth;
  const height = image.naturalHeight;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(image, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  onProgress?.(0.1);

  const sourcePalette = extractPalette(image, 8);
  onProgress?.(0.25);

  const mappings = createPaletteMapping(sourcePalette, targetPalette);
  onProgress?.(0.35);

  const regionMap = classifyRegions(imageData);
  onProgress?.(0.5);

  const { data } = imageData;
  const pixelCount = width * height;

  const lChan = new Float32Array(pixelCount);
  const aChan = new Float32Array(pixelCount);
  const bChan = new Float32Array(pixelCount);

  for (let i = 0; i < pixelCount; i++) {
    const p = i * 4;
    const alpha = data[p + 3];
    if (alpha === 0) continue;

    const rgb = { r: data[p], g: data[p + 1], b: data[p + 2] };
    const oklab = rgbToOklab(rgb);
    lChan[i] = oklab.L;

    const match = nearestMapping(mappings, oklab.L, oklab.a, oklab.b);
    const regionType = REGION_ORDER[regionMap.regions[i]];
    const regionStrength = REGION_STRENGTH[regionType];

    if (!match) {
      aChan[i] = oklab.a;
      bChan[i] = oklab.b;
      continue;
    }

    // Confidence falls off with OKLab distance from the matched source
    // cluster center, so pixels that don't resemble any dominant cluster
    // (e.g. rare colors) shift less.
    const confidence = clamp(1 - match.distance / 0.35, 0, 1);
    const effectiveStrength = strength * regionStrength * confidence;

    const targetOklab = rgbToOklab(hexToRgbLocal(match.mapping.target.hex));

    // Preserve original lightness; blend chroma (a/b) toward the target hue.
    const targetChromaScale =
      Math.sqrt(targetOklab.a * targetOklab.a + targetOklab.b * targetOklab.b) || 0.0001;
    const sourceChroma = Math.sqrt(oklab.a * oklab.a + oklab.b * oklab.b);
    // Re-hue: rotate toward target hue while keeping a chroma magnitude close
    // to the pixel's own original chroma (so highlights/shadows keep depth).
    const targetHueA = targetOklab.a / targetChromaScale;
    const targetHueB = targetOklab.b / targetChromaScale;
    const newA = oklab.a * (1 - effectiveStrength) + targetHueA * sourceChroma * effectiveStrength;
    const newB = oklab.b * (1 - effectiveStrength) + targetHueB * sourceChroma * effectiveStrength;

    aChan[i] = newA;
    bChan[i] = newB;
  }

  onProgress?.(0.7);

  const { a: smoothA, b: smoothB } = smoothChroma(aChan, bChan, lChan, width, height);

  onProgress?.(0.85);

  for (let i = 0; i < pixelCount; i++) {
    const p = i * 4;
    if (data[p + 3] === 0) continue;
    const rgb = oklabToRgb({ L: lChan[i], a: smoothA[i], b: smoothB[i] });
    data[p] = rgb.r;
    data[p + 1] = rgb.g;
    data[p + 2] = rgb.b;
  }

  ctx.putImageData(imageData, 0, 0);
  onProgress?.(1);

  return { canvas, sourcePalette };
}

function hexToRgbLocal(hex: string) {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}
