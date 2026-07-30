export type ColorSpace = "sRGB" | "linear-sRGB";

export interface ColorManagement {
  inputColorSpace: ColorSpace;
  workingColorSpace: ColorSpace;
  outputColorSpace: ColorSpace;
  transferFunction: "sRGB";
  hdr: boolean;
}

export interface BasicAdjustments {
  exposure: number;
  contrast: number;
  brightness: number;
  temperature: number;
  tint: number;
  globalSaturation: number;
  vibrance: number;
}

export interface CurvePoint {
  input: number;
  output: number;
}

export interface ToneAdjustments {
  blackPoint: number;
  whitePoint: number;
  shadowLift: number;
  midtoneGain: number;
  highlightCompression: number;
  highlightRollOff: number;
  luminanceCurve: CurvePoint[];
}

export interface ColorWheelSetting {
  hueDegrees: number;
  saturation: number;
  luminance: number;
}

export interface ColorWheels {
  shadows: ColorWheelSetting;
  midtones: ColorWheelSetting;
  highlights: ColorWheelSetting;
  balance: number;
}

export interface HslBandAdjustment {
  hueShiftDegrees: number;
  saturation: number;
  luminance: number;
}

export type HslColorBand =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "cyan"
  | "blue"
  | "purple"
  | "magenta";

export type HslAdjustments = Record<HslColorBand, HslBandAdjustment>;

export interface SaturationByLuminancePoint {
  luminance: number;
  adjustment: number;
}

export interface SkinToneProtection {
  enabled: boolean;
  targetHueDegrees: number;
  hueRangeDegrees: number;
  minimumSaturation: number;
  maximumSaturation: number;
  strength: number;
  hueShiftDegrees: number;
  saturation: number;
  luminance: number;
}

export interface GamutSettings {
  compression: number;
  maximumSaturation: number;
  preserveNeutrals: number;
}

export interface LocalContrastSettings {
  clarity: number;
  midtoneContrast: number;
  dehaze: number;
}

export interface BloomSettings {
  enabled: boolean;
  threshold: number;
  intensity: number;
  radius: number;
}

export interface GrainSettings {
  enabled: boolean;
  amount: number;
  size: number;
  roughness: number;
}

export interface VignetteSettings {
  enabled: boolean;
  amount: number;
  midpoint: number;
  feather: number;
}

export interface SharpeningSettings {
  amount: number;
  radius: number;
}

export interface FinishingSettings {
  bloom: BloomSettings;
  grain: GrainSettings;
  vignette: VignetteSettings;
  sharpening: SharpeningSettings;
}

export interface SemanticRegionRule {
  presetStrength: number;
  preserveHue?: number;
  exposureAdjustment?: number;
  saturationAdjustment?: number;
  luminanceAdjustment?: number;
}

export interface SemanticRules {
  enabled: boolean;
  skin: SemanticRegionRule;
  sky: SemanticRegionRule;
  vegetation: SemanticRegionRule;
  background: SemanticRegionRule;
}

export interface PresetMeta {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  defaultStrength: number;
}

export interface ColorGradePreset {
  schemaVersion: string;
  preset: PresetMeta;
  colorManagement: ColorManagement;
  basicAdjustments: BasicAdjustments;
  tone: ToneAdjustments;
  colorWheels: ColorWheels;
  hslAdjustments: HslAdjustments;
  saturationByLuminance: SaturationByLuminancePoint[];
  skinToneProtection: SkinToneProtection;
  gamut: GamutSettings;
  localContrast: LocalContrastSettings;
  finishing: FinishingSettings;
  semanticRules: SemanticRules;
}

export type WorkspaceStatus =
  | "empty"
  | "decoding"
  | "rendering"
  | "ready"
  | "error";

export interface WorkspaceState {
  sourceFile: File | null;
  sourceBitmap: ImageBitmap | null;
  sourcePreviewUrl: string | null;
  selectedPresetId: string;
  strength: number;
  status: WorkspaceStatus;
  errorMessage: string | null;
}
