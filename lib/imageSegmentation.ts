import { RGB, rgbToHsl } from "./colorConversion";

// Lightweight heuristic region classification (no ML model). Uses hue/saturation
// windows for skin detection, luminance + vertical position for sky, saturation +
// hue for foliage, and low-chroma windows for neutrals. Everything else is
// bucketed into foreground/background using a center-weighted saliency proxy.
export type RegionType =
  | "skin"
  | "sky"
  | "plant"
  | "neutral"
  | "foreground"
  | "background";

// Per-region recolor strength multiplier applied on top of the global strength.
export const REGION_STRENGTH: Record<RegionType, number> = {
  skin: 0.35, // subtle temperature-only adjustment
  neutral: 0.5, // whites/blacks/grays shift a bit but stay believable
  sky: 0.95,
  plant: 0.85,
  background: 1.0,
  foreground: 0.75,
};

function isSkinTone(h: number, s: number, l: number): boolean {
  // Broad skin hue band in HSL (orange-red family), moderate saturation, mid lightness.
  return h >= 5 && h <= 45 && s >= 0.1 && s <= 0.75 && l >= 0.2 && l <= 0.92;
}

function isFoliage(h: number, s: number, l: number): boolean {
  return h >= 70 && h <= 165 && s >= 0.12 && l >= 0.08 && l <= 0.85;
}

function isSkyLike(h: number, s: number, l: number, normY: number): boolean {
  const bluish = h >= 175 && h <= 250;
  const brightNeutral = s < 0.15 && l > 0.6;
  return normY < 0.45 && (bluish || brightNeutral) && l > 0.35;
}

function isNeutralTone(s: number, l: number): boolean {
  return s < 0.04 || l < 0.04 || l > 0.98;
}

export interface RegionMap {
  width: number;
  height: number;
  regions: Uint8Array; // index into REGION_ORDER per pixel
}

export const REGION_ORDER: RegionType[] = [
  "skin",
  "sky",
  "plant",
  "neutral",
  "foreground",
  "background",
];

export function classifyRegions(imageData: ImageData): RegionMap {
  const { width, height, data } = imageData;
  const regions = new Uint8Array(width * height);

  const cx = width / 2;
  const cy = height / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);

  for (let y = 0; y < height; y++) {
    const normY = y / height;
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const p = idx * 4;
      const rgb: RGB = { r: data[p], g: data[p + 1], b: data[p + 2] };
      const { h, s, l } = rgbToHsl(rgb);

      let region: RegionType;
      if (isNeutralTone(s, l)) {
        region = "neutral";
      } else if (isSkinTone(h, s, l)) {
        region = "skin";
      } else if (isSkyLike(h, s, l, normY)) {
        region = "sky";
      } else if (isFoliage(h, s, l)) {
        region = "plant";
      } else {
        // Center-weighted saliency proxy: pixels near the frame center are
        // more likely to be the subject (foreground); edges lean background.
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) / maxDist;
        region = dist < 0.55 ? "foreground" : "background";
      }

      regions[idx] = REGION_ORDER.indexOf(region);
    }
  }

  return { width, height, regions };
}

export function regionAt(map: RegionMap, x: number, y: number): RegionType {
  const idx = y * map.width + x;
  return REGION_ORDER[map.regions[idx]];
}
