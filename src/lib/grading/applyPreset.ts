import type { ColorGradePreset, HslColorBand } from "@/types/colorGrade";
import { buildCurveLut } from "./curveInterpolation";

export const HSL_BAND_ORDER: HslColorBand[] = [
  "red",
  "orange",
  "yellow",
  "green",
  "cyan",
  "blue",
  "purple",
  "magenta",
];

/**
 * Flattened, GPU-friendly view of a preset. Built once per preset selection
 * and fed to the shader as uniforms plus the curve LUT texture.
 */
export interface PresetUniforms {
  curveLut: Float32Array;

  basicAdjustments: [
    exposure: number,
    contrast: number,
    brightness: number,
    temperature: number,
    tint: number,
    globalSaturation: number,
    vibrance: number
  ];

  tone: [
    blackPoint: number,
    whitePoint: number,
    shadowLift: number,
    midtoneGain: number,
    highlightCompression: number,
    highlightRollOff: number
  ];

  shadowsWheel: [hueDegrees: number, saturation: number, luminance: number];
  midtonesWheel: [hueDegrees: number, saturation: number, luminance: number];
  highlightsWheel: [hueDegrees: number, saturation: number, luminance: number];
  wheelBalance: number;

  /** 8 bands × [hueShiftDegrees, saturation, luminance] flattened. */
  hslAdjustments: Float32Array;

  /** 5 control points × [luminance, adjustment] flattened. */
  saturationByLuminance: Float32Array;

  skinTone: [
    enabled: number,
    targetHueDegrees: number,
    hueRangeDegrees: number,
    minimumSaturation: number,
    maximumSaturation: number,
    strength: number,
    hueShiftDegrees: number,
    saturation: number,
    luminance: number
  ];

  gamut: [compression: number, maximumSaturation: number, preserveNeutrals: number];

  localContrast: [clarity: number, midtoneContrast: number, dehaze: number];

  bloom: [enabled: number, threshold: number, intensity: number, radius: number];
  grain: [enabled: number, amount: number, size: number, roughness: number];
  vignette: [enabled: number, amount: number, midpoint: number, feather: number];
  sharpening: [amount: number, radius: number];
}

export function buildPresetUniforms(preset: ColorGradePreset): PresetUniforms {
  const { basicAdjustments, tone, colorWheels, hslAdjustments, skinToneProtection, gamut, localContrast, finishing } =
    preset;

  const hslFlat = new Float32Array(HSL_BAND_ORDER.length * 3);
  HSL_BAND_ORDER.forEach((band, i) => {
    const adj = hslAdjustments[band];
    hslFlat[i * 3 + 0] = adj.hueShiftDegrees;
    hslFlat[i * 3 + 1] = adj.saturation;
    hslFlat[i * 3 + 2] = adj.luminance;
  });

  const satByLumSorted = [...preset.saturationByLuminance].sort(
    (a, b) => a.luminance - b.luminance
  );
  const satByLumFlat = new Float32Array(5 * 2);
  for (let i = 0; i < 5; i++) {
    const point = satByLumSorted[i] ?? satByLumSorted[satByLumSorted.length - 1];
    satByLumFlat[i * 2 + 0] = point.luminance;
    satByLumFlat[i * 2 + 1] = point.adjustment;
  }

  return {
    curveLut: buildCurveLut(tone.luminanceCurve),
    basicAdjustments: [
      basicAdjustments.exposure,
      basicAdjustments.contrast,
      basicAdjustments.brightness,
      basicAdjustments.temperature,
      basicAdjustments.tint,
      basicAdjustments.globalSaturation,
      basicAdjustments.vibrance,
    ],
    tone: [
      tone.blackPoint,
      tone.whitePoint,
      tone.shadowLift,
      tone.midtoneGain,
      tone.highlightCompression,
      tone.highlightRollOff,
    ],
    shadowsWheel: [
      colorWheels.shadows.hueDegrees,
      colorWheels.shadows.saturation,
      colorWheels.shadows.luminance,
    ],
    midtonesWheel: [
      colorWheels.midtones.hueDegrees,
      colorWheels.midtones.saturation,
      colorWheels.midtones.luminance,
    ],
    highlightsWheel: [
      colorWheels.highlights.hueDegrees,
      colorWheels.highlights.saturation,
      colorWheels.highlights.luminance,
    ],
    wheelBalance: colorWheels.balance,
    hslAdjustments: hslFlat,
    saturationByLuminance: satByLumFlat,
    skinTone: [
      skinToneProtection.enabled ? 1 : 0,
      skinToneProtection.targetHueDegrees,
      skinToneProtection.hueRangeDegrees,
      skinToneProtection.minimumSaturation,
      skinToneProtection.maximumSaturation,
      skinToneProtection.strength,
      skinToneProtection.hueShiftDegrees,
      skinToneProtection.saturation,
      skinToneProtection.luminance,
    ],
    gamut: [gamut.compression, gamut.maximumSaturation, gamut.preserveNeutrals],
    localContrast: [
      localContrast.clarity,
      localContrast.midtoneContrast,
      localContrast.dehaze,
    ],
    bloom: [
      finishing.bloom.enabled ? 1 : 0,
      finishing.bloom.threshold,
      finishing.bloom.intensity,
      finishing.bloom.radius,
    ],
    grain: [
      finishing.grain.enabled ? 1 : 0,
      finishing.grain.amount,
      finishing.grain.size,
      finishing.grain.roughness,
    ],
    vignette: [
      finishing.vignette.enabled ? 1 : 0,
      finishing.vignette.amount,
      finishing.vignette.midpoint,
      finishing.vignette.feather,
    ],
    sharpening: [finishing.sharpening.amount, finishing.sharpening.radius],
  };
}
