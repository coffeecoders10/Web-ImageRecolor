import { RGB, rgbToOklab, rgbToOklch, OKLab, oklabDistance } from "./colorConversion";

export type HueFamily =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "cyan"
  | "blue"
  | "purple"
  | "magenta"
  | "neutral";

export interface ExtractedColor {
  rgb: RGB;
  oklab: OKLab;
  percentage: number; // 0-1, share of analyzed pixels
  lightness: number; // 0-1
  saturation: number; // 0-1, derived from OKLCh chroma
  hueFamily: HueFamily;
  isWarm: boolean;
  isNeutral: boolean;
  importance: number; // 0-1 composite score (frequency + saturation prominence)
}

const ANALYSIS_MAX_DIM = 200; // keep the analysis copy small for speed
const MIN_CLUSTER_SHARE = 0.015; // ignore clusters smaller than 1.5% (compression noise)

export function hueToFamily(hue: number): HueFamily {
  if (hue >= 345 || hue < 15) return "red";
  if (hue < 45) return "orange";
  if (hue < 70) return "yellow";
  if (hue < 160) return "green";
  if (hue < 195) return "cyan";
  if (hue < 255) return "blue";
  if (hue < 290) return "purple";
  if (hue < 345) return "magenta";
  return "neutral";
}

export function isWarmHue(hue: number): boolean {
  // Warm: reds/oranges/yellows (~ -20 to 160 wrapped), cool otherwise.
  const family = hueToFamily(hue);
  return family === "red" || family === "orange" || family === "yellow";
}

interface Sample {
  rgb: RGB;
  oklab: OKLab;
}

function getAnalysisImageData(image: HTMLImageElement | ImageBitmap): ImageData {
  const width = "naturalWidth" in image ? image.naturalWidth : image.width;
  const height = "naturalHeight" in image ? image.naturalHeight : image.height;

  const scale = Math.min(1, ANALYSIS_MAX_DIM / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(image, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

function sampleImageData(imageData: ImageData): Sample[] {
  const { width, height, data } = imageData;

  // Cap the number of pixels fed into median-cut/k-means clustering for
  // speed; stride evenly across the image rather than decoding a
  // canvas-downscaled copy (keeps this DOM-free so it works in a worker).
  const pixelCount = width * height;
  const maxSamples = ANALYSIS_MAX_DIM * ANALYSIS_MAX_DIM;
  const stride = Math.max(1, Math.floor(pixelCount / maxSamples));

  const samples: Sample[] = [];
  for (let i = 0; i < pixelCount; i += stride) {
    const p = i * 4;
    const alpha = data[p + 3];
    if (alpha < 16) continue; // skip fully/mostly transparent pixels
    const rgb: RGB = { r: data[p], g: data[p + 1], b: data[p + 2] };
    samples.push({ rgb, oklab: rgbToOklab(rgb) });
  }
  return samples;
}

// Median-cut quantization in OKLab space: recursively split the box with the
// largest range along its longest axis until we have the target bucket count.
function medianCutClusters(samples: Sample[], targetCount: number): Sample[][] {
  if (samples.length === 0) return [];

  type Box = Sample[];
  const boxes: Box[] = [samples];

  const axisOf = (box: Box): "L" | "a" | "b" => {
    let minL = Infinity,
      maxL = -Infinity,
      minA = Infinity,
      maxA = -Infinity,
      minB = Infinity,
      maxB = -Infinity;
    for (const s of box) {
      minL = Math.min(minL, s.oklab.L);
      maxL = Math.max(maxL, s.oklab.L);
      minA = Math.min(minA, s.oklab.a);
      maxA = Math.max(maxA, s.oklab.a);
      minB = Math.min(minB, s.oklab.b);
      maxB = Math.max(maxB, s.oklab.b);
    }
    const rangeL = maxL - minL;
    const rangeA = maxA - minA;
    const rangeB = maxB - minB;
    if (rangeL >= rangeA && rangeL >= rangeB) return "L";
    if (rangeA >= rangeB) return "a";
    return "b";
  };

  while (boxes.length < targetCount) {
    // Split the largest box (by sample count) along its longest axis.
    let largestIdx = 0;
    for (let i = 1; i < boxes.length; i++) {
      if (boxes[i].length > boxes[largestIdx].length) largestIdx = i;
    }
    const box = boxes[largestIdx];
    if (box.length < 2) break;

    const axis = axisOf(box);
    box.sort((a, b) => a.oklab[axis] - b.oklab[axis]);
    const mid = Math.floor(box.length / 2);
    const left = box.slice(0, mid);
    const right = box.slice(mid);

    boxes.splice(largestIdx, 1, left, right);
  }

  return boxes;
}

function averageOklab(samples: Sample[]): OKLab {
  let L = 0,
    a = 0,
    b = 0;
  for (const s of samples) {
    L += s.oklab.L;
    a += s.oklab.a;
    b += s.oklab.b;
  }
  const n = samples.length;
  return { L: L / n, a: a / n, b: b / n };
}

function averageRgb(samples: Sample[]): RGB {
  let r = 0,
    g = 0,
    b = 0;
  for (const s of samples) {
    r += s.rgb.r;
    g += s.rgb.g;
    b += s.rgb.b;
  }
  const n = samples.length;
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
}

// Refine median-cut clusters with a few Lloyd/K-means iterations in OKLab
// space for tighter, more representative clusters.
function refineClusters(samples: Sample[], initialCenters: OKLab[], iterations = 4): Sample[][] {
  let centers = initialCenters;
  let assignment: Sample[][] = [];

  for (let iter = 0; iter < iterations; iter++) {
    assignment = centers.map(() => []);
    for (const s of samples) {
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let c = 0; c < centers.length; c++) {
        const d = oklabDistance(s.oklab, centers[c]);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = c;
        }
      }
      assignment[bestIdx].push(s);
    }
    centers = assignment.map((cluster, i) =>
      cluster.length > 0 ? averageOklab(cluster) : centers[i]
    );
  }

  return assignment;
}

export function extractPalette(
  image: HTMLImageElement | ImageBitmap,
  targetCount = 8
): ExtractedColor[] {
  const imageData = getAnalysisImageData(image);
  return extractPaletteFromImageData(imageData, targetCount);
}

// DOM-free variant that works directly on already-decoded ImageData, so it
// can run inside a Web Worker (no canvas/document access).
export function extractPaletteFromImageData(
  imageData: ImageData,
  targetCount = 8
): ExtractedColor[] {
  const samples = sampleImageData(imageData);
  if (samples.length === 0) return [];

  const initialClusters = medianCutClusters(samples, targetCount);
  const initialCenters = initialClusters.map(averageOklab);
  const clusters = refineClusters(samples, initialCenters).filter((c) => c.length > 0);

  const total = samples.length;
  const colors: ExtractedColor[] = clusters
    .map((cluster) => {
      const oklab = averageOklab(cluster);
      const rgb = averageRgb(cluster);
      const oklch = rgbToOklch(rgb);
      const percentage = cluster.length / total;
      const isNeutral = oklch.C < 0.02;
      return {
        rgb,
        oklab,
        percentage,
        lightness: oklab.L,
        saturation: Math.min(1, oklch.C / 0.3),
        hueFamily: isNeutral ? "neutral" : hueToFamily(oklch.h),
        isWarm: isNeutral ? false : isWarmHue(oklch.h),
        isNeutral,
        importance: percentage * (0.6 + 0.4 * Math.min(1, oklch.C / 0.25)),
      } satisfies ExtractedColor;
    })
    .filter((c) => c.percentage >= MIN_CLUSTER_SHARE)
    .sort((a, b) => b.percentage - a.percentage);

  return colors;
}
