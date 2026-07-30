#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uSource;      // original sRGB image
uniform sampler2D uBlurred;     // soft-blurred version for local contrast / bloom
uniform sampler2D uCurveLut;    // 256x1 luminance curve lookup
uniform vec2 uResolution;
uniform float uStrength;        // 0..1 final blend amount
uniform float uGrainSeed;

// -- basic adjustments --
uniform float uExposure;
uniform float uContrast;
uniform float uBrightness;
uniform float uTemperature;
uniform float uTint;
uniform float uGlobalSaturation;
uniform float uVibrance;

// -- tone --
uniform float uBlackPoint;
uniform float uWhitePoint;
uniform float uShadowLift;
uniform float uMidtoneGain;
uniform float uHighlightCompression;
uniform float uHighlightRollOff;

// -- color wheels: (hueDegrees, saturation, luminance) --
uniform vec3 uShadowsWheel;
uniform vec3 uMidtonesWheel;
uniform vec3 uHighlightsWheel;
uniform float uWheelBalance;

// -- HSL per-band adjustments: 8 bands x (hueShift, saturation, luminance) --
uniform vec3 uHslBands[8];

// -- saturation by luminance: 5 points x (luminance, adjustment) --
uniform vec2 uSatByLum[5];

// -- skin tone protection --
uniform float uSkinEnabled;
uniform float uSkinTargetHue;
uniform float uSkinHueRange;
uniform float uSkinMinSat;
uniform float uSkinMaxSat;
uniform float uSkinStrength;
uniform float uSkinHueShift;
uniform float uSkinSaturation;
uniform float uSkinLuminance;

// -- gamut --
uniform float uGamutCompression;
uniform float uGamutMaxSaturation;
uniform float uGamutPreserveNeutrals;

// -- local contrast --
uniform float uClarity;
uniform float uMidtoneContrast;
uniform float uDehaze;

// -- finishing --
uniform float uBloomEnabled;
uniform float uBloomThreshold;
uniform float uBloomIntensity;
uniform float uBloomRadius;

uniform float uGrainEnabled;
uniform float uGrainAmount;
uniform float uGrainSize;
uniform float uGrainRoughness;

uniform float uVignetteEnabled;
uniform float uVignetteAmount;
uniform float uVignetteMidpoint;
uniform float uVignetteFeather;

uniform float uSharpenAmount;
uniform float uSharpenRadius;

const float PI = 3.14159265359;

float srgbToLinear1(float c) {
  return c <= 0.04045 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4);
}
vec3 srgbToLinear(vec3 c) {
  return vec3(srgbToLinear1(c.r), srgbToLinear1(c.g), srgbToLinear1(c.b));
}
float linearToSrgb1(float c) {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * pow(c, 1.0 / 2.4) - 0.055;
}
vec3 linearToSrgb(vec3 c) {
  return vec3(linearToSrgb1(c.r), linearToSrgb1(c.g), linearToSrgb1(c.b));
}

float luminance(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

// RGB <-> HSL (operates on display-referred / gamma values)
vec3 rgbToHsl(vec3 c) {
  float maxC = max(max(c.r, c.g), c.b);
  float minC = min(min(c.r, c.g), c.b);
  float delta = maxC - minC;

  float h = 0.0;
  if (delta > 1e-6) {
    if (maxC == c.r) {
      h = mod((c.g - c.b) / delta, 6.0);
    } else if (maxC == c.g) {
      h = (c.b - c.r) / delta + 2.0;
    } else {
      h = (c.r - c.g) / delta + 4.0;
    }
    h *= 60.0;
    if (h < 0.0) h += 360.0;
  }

  float l = (maxC + minC) * 0.5;
  float s = delta < 1e-6 ? 0.0 : delta / (1.0 - abs(2.0 * l - 1.0) + 1e-6);

  return vec3(h, clamp(s, 0.0, 1.0), clamp(l, 0.0, 1.0));
}

float hueToRgbChannel(float p, float q, float t) {
  float tt = t;
  if (tt < 0.0) tt += 1.0;
  if (tt > 1.0) tt -= 1.0;
  if (tt < 1.0 / 6.0) return p + (q - p) * 6.0 * tt;
  if (tt < 1.0 / 2.0) return q;
  if (tt < 2.0 / 3.0) return p + (q - p) * (2.0 / 3.0 - tt) * 6.0;
  return p;
}

vec3 hslToRgb(vec3 hsl) {
  float h = hsl.x / 360.0;
  float s = hsl.y;
  float l = hsl.z;

  if (s < 1e-6) {
    return vec3(l);
  }

  float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
  float p = 2.0 * l - q;

  return vec3(
    hueToRgbChannel(p, q, h + 1.0 / 3.0),
    hueToRgbChannel(p, q, h),
    hueToRgbChannel(p, q, h - 1.0 / 3.0)
  );
}

// Smooth feathered angular hue mask, wraps at 360.
float hueMask(float hue, float targetHue, float rangeDeg) {
  float diff = mod(abs(hue - targetHue), 360.0);
  diff = min(diff, 360.0 - diff);
  float t = clamp(1.0 - diff / max(rangeDeg, 1e-4), 0.0, 1.0);
  return smoothstep(0.0, 1.0, t);
}

// Smooth luminance-band masks (shadows / midtones / highlights) that sum to ~1.
float shadowsMask(float l) { return 1.0 - smoothstep(0.0, 0.55, l); }
float highlightsMask(float l) { return smoothstep(0.45, 1.0, l); }
float midtonesMask(float l) { return 1.0 - shadowsMask(l) - highlightsMask(l); }

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  vec2 texel = 1.0 / uResolution;
  vec3 original = texture(uSource, vUv).rgb;

  // ---- Step 2: sRGB -> linear ----
  vec3 c = srgbToLinear(original);

  // ---- Step 3: exposure, brightness, contrast, temperature, tint ----
  c *= pow(2.0, uExposure * 3.0);
  c += uBrightness * 0.5;

  float contrastFactor = 1.0 + uContrast;
  c = (c - 0.18) * contrastFactor + 0.18;

  // Temperature: warm (+) pushes red up / blue down; tint: (+) pushes magenta/green.
  c.r *= 1.0 + uTemperature * 0.35;
  c.b *= 1.0 - uTemperature * 0.35;
  c.g *= 1.0 + uTint * 0.25;
  c.r *= 1.0 - uTint * 0.08;
  c.b *= 1.0 - uTint * 0.08;

  c = max(c, 0.0);

  // ---- Step 4: vibrance and global saturation (in linear space) ----
  float lum4 = luminance(c);
  c = mix(vec3(lum4), c, 1.0 + uGlobalSaturation);

  float maxC4 = max(max(c.r, c.g), c.b);
  float minC4 = min(min(c.r, c.g), c.b);
  float currentSat = maxC4 - minC4;
  float vibranceFactor = 1.0 + uVibrance * (1.0 - currentSat);
  c = mix(vec3(luminance(c)), c, vibranceFactor);
  c = max(c, 0.0);

  // ---- Step 5: black point, white point, shadow lift, midtone gain, highlight compression/rolloff ----
  c = (c - uBlackPoint) / max(uWhitePoint - uBlackPoint, 1e-4);
  c = max(c, 0.0);

  float l5 = luminance(c);
  float shadowAmt = 1.0 - smoothstep(0.0, 0.5, l5);
  c += uShadowLift * shadowAmt;

  float midAmt = 1.0 - abs(l5 - 0.5) * 2.0;
  midAmt = clamp(midAmt, 0.0, 1.0);
  c += uMidtoneGain * midAmt;

  float highAmt = smoothstep(0.5, 1.0, l5);
  vec3 compressed = 1.0 - (1.0 - c) * (1.0 - uHighlightCompression * highAmt);
  c = mix(c, compressed, highAmt);

  // Highlight roll-off: soft-clip values approaching 1.0
  float rolloff = uHighlightRollOff;
  if (rolloff > 1e-4) {
    vec3 over = max(c - (1.0 - rolloff), 0.0);
    c = c - over + rolloff * (1.0 - exp(-over / max(rolloff, 1e-4)));
  }
  c = max(c, 0.0);

  // ---- Step 6: luminance curve (LUT) applied per-channel preserving hue ----
  {
    float lBefore = max(luminance(c), 1e-5);
    float lAfter = texture(uCurveLut, vec2(clamp(lBefore, 0.0, 1.0), 0.5)).r;
    c *= (lAfter / lBefore);
    c = max(c, 0.0);
  }

  // ---- Step 7: shadow / midtone / highlight color wheels with smooth luminance masks ----
  {
    float l7 = clamp(luminance(c), 0.0, 1.0);
    float sMask = shadowsMask(l7);
    float mMask = midtonesMask(l7);
    float hMask = highlightsMask(l7);

    vec3 hsl = rgbToHsl(clamp(c, 0.0, 4.0));

    float balanceShadow = 1.0 - max(uWheelBalance, 0.0);
    float balanceHigh = 1.0 + min(uWheelBalance, 0.0);

    float wheelSat = sMask * uShadowsWheel.y * balanceShadow +
                      mMask * uMidtonesWheel.y +
                      hMask * uHighlightsWheel.y * balanceHigh;
    float wheelLum = sMask * uShadowsWheel.z * balanceShadow +
                      mMask * uMidtonesWheel.z +
                      hMask * uHighlightsWheel.z * balanceHigh;

    float wheelHue = sMask * uShadowsWheel.x + mMask * uMidtonesWheel.x + hMask * uHighlightsWheel.x;
    float wheelWeight = sMask + mMask + hMask;

    if (wheelWeight > 1e-4 && abs(wheelSat) > 1e-5) {
      // Positive saturation tints toward the wheel hue; negative desaturates
      // toward neutral gray at the current lightness.
      vec3 target = wheelSat > 0.0
        ? hslToRgb(vec3(wheelHue, clamp(hsl.y + wheelSat, 0.0, 1.0), hsl.z))
        : vec3(hsl.z);
      c = mix(c, target, clamp(abs(wheelSat) * 4.0, 0.0, 1.0));
    }
    c += wheelLum;
    c = max(c, 0.0);
  }

  // ---- Step 8: HSL conversion + per-color-band adjustments (feathered) ----
  {
    vec3 hsl = rgbToHsl(clamp(c, 0.0, 4.0));
    float hue = hsl.x;

    float hueTargets[8];
    hueTargets[0] = 0.0;   // red
    hueTargets[1] = 30.0;  // orange
    hueTargets[2] = 60.0;  // yellow
    hueTargets[3] = 120.0; // green
    hueTargets[4] = 180.0; // cyan
    hueTargets[5] = 240.0; // blue
    hueTargets[6] = 275.0; // purple
    hueTargets[7] = 320.0; // magenta

    float hueShiftSum = 0.0;
    float satSum = 0.0;
    float lumSum = 0.0;

    for (int i = 0; i < 8; i++) {
      float w = hueMask(hue, hueTargets[i], 45.0);
      hueShiftSum += uHslBands[i].x * w;
      satSum += uHslBands[i].y * w;
      lumSum += uHslBands[i].z * w;
    }

    hsl.x = mod(hsl.x + hueShiftSum, 360.0);
    hsl.y = clamp(hsl.y + satSum, 0.0, 1.0);
    hsl.z = clamp(hsl.z + lumSum * 0.5, 0.0, 1.0);

    c = hslToRgb(hsl);
  }

  // ---- Step 9: saturation by luminance ----
  {
    float l9 = clamp(luminance(c), 0.0, 1.0);
    float adj = uSatByLum[4].y;
    for (int i = 0; i < 4; i++) {
      if (l9 >= uSatByLum[i].x && l9 <= uSatByLum[i + 1].x) {
        float span = max(uSatByLum[i + 1].x - uSatByLum[i].x, 1e-4);
        float t = (l9 - uSatByLum[i].x) / span;
        adj = mix(uSatByLum[i].y, uSatByLum[i + 1].y, t);
        break;
      }
    }
    c = mix(vec3(l9), c, 1.0 + adj);
    c = max(c, 0.0);
  }

  // ---- Step 10: hue-based skin-tone protection ----
  if (uSkinEnabled > 0.5) {
    vec3 hsl = rgbToHsl(clamp(c, 0.0, 4.0));
    float hMaskSkin = hueMask(hsl.x, uSkinTargetHue, uSkinHueRange);
    float satWindow = smoothstep(uSkinMinSat - 0.05, uSkinMinSat + 0.05, hsl.y) *
                       (1.0 - smoothstep(uSkinMaxSat - 0.05, uSkinMaxSat + 0.05, hsl.y));
    float mask = hMaskSkin * satWindow * uSkinStrength;

    vec3 protectedHsl = hsl;
    protectedHsl.x = mod(hsl.x + uSkinHueShift * mask, 360.0);
    protectedHsl.y = clamp(hsl.y + uSkinSaturation * mask, 0.0, 1.0);
    protectedHsl.z = clamp(hsl.z + uSkinLuminance * mask, 0.0, 1.0);

    c = mix(c, hslToRgb(protectedHsl), mask);
  }

  // ---- Step 11: gamut compression + neutral preservation ----
  {
    vec3 hsl = rgbToHsl(clamp(c, 0.0, 4.0));
    if (hsl.y > uGamutMaxSaturation) {
      hsl.y = mix(hsl.y, uGamutMaxSaturation, uGamutCompression);
      c = hslToRgb(hsl);
    }
    float neutralness = 1.0 - smoothstep(0.0, 0.06, hsl.y);
    vec3 neutralGray = vec3(luminance(c));
    c = mix(c, neutralGray, neutralness * uGamutPreserveNeutrals * 0.5);
  }

  // ---- Step 12: local contrast / clarity / dehaze via blurred sample ----
  {
    vec3 blurred = texture(uBlurred, vUv).rgb;
    vec3 detail = c - blurred;

    c += detail * uClarity;
    c += detail * uMidtoneContrast * midtonesMask(clamp(luminance(c), 0.0, 1.0));

    // Dehaze: increase local contrast and pull down blacks slightly, or the inverse.
    c = mix(blurred, c, 1.0 + uDehaze);
    c -= uDehaze * 0.02;
    c = max(c, 0.0);
  }

  // ---- Step 13: bloom, grain, vignette, sharpening ----
  if (uBloomEnabled > 0.5) {
    vec3 blurred = texture(uBlurred, vUv).rgb;
    float lBloom = luminance(blurred);
    float bloomMask = smoothstep(uBloomThreshold, 1.0, lBloom);
    c += blurred * bloomMask * uBloomIntensity;
  }

  if (uSharpenAmount > 1e-4) {
    vec3 blurred = texture(uBlurred, vUv).rgb;
    c += (c - blurred) * uSharpenAmount * 2.0;
  }

  c = max(c, 0.0);

  // Convert to sRGB before applying display-referred finishing (grain, vignette)
  vec3 gradedSrgb = linearToSrgb(clamp(c, 0.0, 8.0));

  if (uVignetteEnabled > 0.5) {
    vec2 centered = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
    float dist = length(centered) * 1.4;
    float vig = smoothstep(uVignetteMidpoint, uVignetteMidpoint + uVignetteFeather, dist);
    gradedSrgb += uVignetteAmount * vig;
  }

  if (uGrainEnabled > 0.5) {
    vec2 grainUv = floor(vUv * uResolution / max(uGrainSize * 4.0, 0.5)) + uGrainSeed;
    float n1 = hash21(grainUv);
    float n2 = hash21(grainUv + 17.0);
    float noise = mix(n1, n2, uGrainRoughness) - 0.5;
    gradedSrgb += noise * uGrainAmount;
  }

  gradedSrgb = clamp(gradedSrgb, 0.0, 1.0);

  // ---- Step 15: blend original and processed by strength ----
  vec3 finalColor = mix(original, gradedSrgb, uStrength);

  fragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
}
