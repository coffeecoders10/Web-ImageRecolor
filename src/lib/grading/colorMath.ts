export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function srgbToLinear(channel: number): number {
  return channel <= 0.04045
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4);
}

export function linearToSrgb(channel: number): number {
  return channel <= 0.0031308
    ? channel * 12.92
    : 1.055 * Math.pow(channel, 1 / 2.4) - 0.055;
}

/** Hue in degrees [0, 360). */
export function rgbToHue(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  if (delta === 0) return 0;

  let hue: number;
  if (max === r) {
    hue = ((g - b) / delta) % 6;
  } else if (max === g) {
    hue = (b - r) / delta + 2;
  } else {
    hue = (r - g) / delta + 4;
  }

  hue *= 60;
  if (hue < 0) hue += 360;
  return hue;
}

/**
 * Feathered angular distance mask, 1 at the target hue and smoothly
 * falling to 0 outside of hueRangeDegrees. Wraps around the hue wheel.
 */
export function hueMask(
  hue: number,
  targetHueDegrees: number,
  hueRangeDegrees: number
): number {
  let diff = Math.abs(hue - targetHueDegrees) % 360;
  if (diff > 180) diff = 360 - diff;
  const t = clamp(1 - diff / Math.max(hueRangeDegrees, 1e-6), 0, 1);
  return t * t * (3 - 2 * t); // smoothstep
}

export function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
