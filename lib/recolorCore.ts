// Pure pixel-processing core, shared between the main thread and the worker.
// Contains no DOM/canvas access so it can run inside a Web Worker.
import { PredefinedPalette } from "@/data/predefinedPalettes";
import { extractPaletteFromImageData, ExtractedColor } from "./paletteExtraction";
import { classifyRegions, REGION_STRENGTH, REGION_ORDER } from "./imageSegmentation";
import { createPaletteMapping, ColorMapping } from "./paletteMapping";
import { rgbToOklab, oklabToRgb, clamp } from "./colorConversion";

export interface RecolorCoreOptions {
  strength: number; // 0-1
}

export interface RecolorCoreResult {
  imageData: ImageData;
  sourcePalette: ExtractedColor[];
}

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

function hexToRgbLocal(hex: string) {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

export function recolorImageData(
  imageData: ImageData,
  targetPalette: PredefinedPalette,
  options: RecolorCoreOptions
): RecolorCoreResult {
  const { strength } = options;
  const { width, height, data } = imageData;
  const t0 = performance.now();
  console.log(`[recolorCore] start: ${width}x${height} = ${(width * height / 1e6).toFixed(2)}MP, palette=${targetPalette.id}, strength=${strength}`);

  const tExtract = performance.now();
  const sourcePalette = extractPaletteFromImageData(imageData, 8);
  console.log(`[recolorCore] extractPalette: ${(performance.now() - tExtract).toFixed(0)}ms, ${sourcePalette.length} colors`);

  const tMap = performance.now();
  const mappings = createPaletteMapping(sourcePalette, targetPalette);
  console.log(`[recolorCore] createPaletteMapping: ${(performance.now() - tMap).toFixed(0)}ms`);

  const tRegion = performance.now();
  const regionMap = classifyRegions(imageData);
  console.log(`[recolorCore] classifyRegions: ${(performance.now() - tRegion).toFixed(0)}ms`);

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

    const injectedChroma = Math.max(sourceChroma, targetChroma * 0.7);
    const targetA = targetHueA * injectedChroma;
    const targetB = targetHueB * injectedChroma;

    const newA = oklab.a * (1 - effectiveStrength) + targetA * effectiveStrength;
    const newB = oklab.b * (1 - effectiveStrength) + targetB * effectiveStrength;

    aChan[i] = newA;
    bChan[i] = newB;
  }
  console.log(`[recolorCore] pixel re-hue loop: ${(performance.now() - tPixels).toFixed(0)}ms (${pixelCount} px)`);

  const tSmooth = performance.now();
  const { a: smoothA, b: smoothB } = smoothChroma(aChan, bChan, lChan, width, height);
  console.log(`[recolorCore] smoothChroma: ${(performance.now() - tSmooth).toFixed(0)}ms`);

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
    `[recolorCore] writeback loop: ${(performance.now() - tWriteback).toFixed(0)}ms, ` +
      `avg per-channel-sum delta=${(totalDelta / pixelCount).toFixed(2)}, ` +
      `${((changedPixels / pixelCount) * 100).toFixed(1)}% pixels visibly changed`
  );

  console.log(`[recolorCore] TOTAL: ${(performance.now() - t0).toFixed(0)}ms`);

  return { imageData, sourcePalette };
}
