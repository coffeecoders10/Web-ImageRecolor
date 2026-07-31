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
  const t0 = performance.now();
  console.log(`[recolorImage] start: ${width}x${height} = ${(width * height / 1e6).toFixed(2)}MP, palette=${targetPalette.id}, strength=${strength}`);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(image, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  console.log(`[recolorImage] drawImage+getImageData: ${(performance.now() - t0).toFixed(0)}ms`);
  onProgress?.(0.1);

  const tExtract = performance.now();
  const sourcePalette = extractPalette(image, 8);
  console.log(`[recolorImage] extractPalette: ${(performance.now() - tExtract).toFixed(0)}ms, ${sourcePalette.length} colors`);
  onProgress?.(0.25);

  const tMap = performance.now();
  const mappings = createPaletteMapping(sourcePalette, targetPalette);
  console.log(`[recolorImage] createPaletteMapping: ${(performance.now() - tMap).toFixed(0)}ms`);
  onProgress?.(0.35);

  const tRegion = performance.now();
  const regionMap = classifyRegions(imageData);
  console.log(`[recolorImage] classifyRegions: ${(performance.now() - tRegion).toFixed(0)}ms`);
  onProgress?.(0.5);

  const { data } = imageData;
  const pixelCount = width * height;

  const lChan = new Float32Array(pixelCount);
  const aChan = new Float32Array(pixelCount);
  const bChan = new Float32Array(pixelCount);

  const tPixels = performance.now();
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
    // cluster center, but keeps a floor so pixels between cluster centers
    // (the majority of a real photo) still get meaningfully recolored
    // instead of being silently muted to near-zero.
    const confidence = clamp(1 - match.distance / 0.6, 0.45, 1);
    const effectiveStrength = clamp(strength * regionStrength * confidence, 0, 1);

    const targetOklab = rgbToOklab(hexToRgbLocal(match.mapping.target.hex));

    const sourceChroma = Math.sqrt(oklab.a * oklab.a + oklab.b * oklab.b);
    const targetChroma = Math.sqrt(
      targetOklab.a * targetOklab.a + targetOklab.b * targetOklab.b
    );
    const targetChromaScale = targetChroma || 0.0001;
    const targetHueA = targetOklab.a / targetChromaScale;
    const targetHueB = targetOklab.b / targetChromaScale;

    // Re-hue toward the target color: blend in a meaningful chroma amount
    // (at least the target swatch's own chroma, not just the source pixel's
    // possibly-tiny original chroma) so the palette shift is visible, while
    // still respecting the pixel's own depth for pixels that were already
    // vivid. Lightness is untouched, so highlights/shadows/texture survive.
    const injectedChroma = Math.max(sourceChroma, targetChroma * 0.7);
    const targetA = targetHueA * injectedChroma;
    const targetB = targetHueB * injectedChroma;

    const newA = oklab.a * (1 - effectiveStrength) + targetA * effectiveStrength;
    const newB = oklab.b * (1 - effectiveStrength) + targetB * effectiveStrength;

    aChan[i] = newA;
    bChan[i] = newB;
  }

  console.log(`[recolorImage] pixel re-hue loop: ${(performance.now() - tPixels).toFixed(0)}ms (${pixelCount} px)`);
  onProgress?.(0.7);

  const tSmooth = performance.now();
  const { a: smoothA, b: smoothB } = smoothChroma(aChan, bChan, lChan, width, height);
  console.log(`[recolorImage] smoothChroma: ${(performance.now() - tSmooth).toFixed(0)}ms`);

  onProgress?.(0.85);

  const tWriteback = performance.now();
  let totalDelta = 0;
  let changedPixels = 0;
  for (let i = 0; i < pixelCount; i++) {
    const p = i * 4;
    if (data[p + 3] === 0) continue;
    const before = data[p] + data[p + 1] + data[p + 2];
    const rgb = oklabToRgb({ L: lChan[i], a: smoothA[i], b: smoothB[i] });
    data[p] = rgb.r;
    data[p + 1] = rgb.g;
    data[p + 2] = rgb.b;
    const after = rgb.r + rgb.g + rgb.b;
    const delta = Math.abs(after - before);
    totalDelta += delta;
    if (delta > 6) changedPixels++;
  }
  console.log(
    `[recolorImage] writeback loop: ${(performance.now() - tWriteback).toFixed(0)}ms, ` +
      `avg per-channel-sum delta=${(totalDelta / pixelCount).toFixed(2)}, ` +
      `${((changedPixels / pixelCount) * 100).toFixed(1)}% pixels visibly changed`
  );

  ctx.putImageData(imageData, 0, 0);
  onProgress?.(1);
  console.log(`[recolorImage] TOTAL: ${(performance.now() - t0).toFixed(0)}ms`);

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
