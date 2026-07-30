// Shader sources are kept in sync with the sibling .vert/.frag files in this
// directory (which serve as the readable/editable source of truth). They are
// inlined here as string constants because the project's Turbopack build has
// no raw-text loader configured for .frag/.vert imports.

export const BASIC_VERT = /* glsl */ `#version 300 es

in vec2 aPosition;
out vec2 vUv;

void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

export const COPY_FRAG = /* glsl */ `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uSource;

void main() {
  fragColor = texture(uSource, vUv);
}
`;

export const BLUR_FRAG = /* glsl */ `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uSource;
uniform vec2 uTexelSize;
uniform vec2 uDirection;

const float WEIGHTS[5] = float[5](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);

void main() {
  vec3 result = texture(uSource, vUv).rgb * WEIGHTS[0];

  for (int i = 1; i < 5; i++) {
    vec2 offset = uDirection * uTexelSize * float(i) * 1.6;
    result += texture(uSource, vUv + offset).rgb * WEIGHTS[i];
    result += texture(uSource, vUv - offset).rgb * WEIGHTS[i];
  }

  fragColor = vec4(result, 1.0);
}
`;

export const GRADE_FRAG = /* glsl */ `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uSource;
uniform sampler2D uBlurred;
uniform sampler2D uCurveLut;
uniform vec2 uResolution;
uniform float uStrength;
uniform float uGrainSeed;

uniform float uExposure;
uniform float uContrast;
uniform float uBrightness;
uniform float uTemperature;
uniform float uTint;
uniform float uGlobalSaturation;
uniform float uVibrance;

uniform float uBlackPoint;
uniform float uWhitePoint;
uniform float uShadowLift;
uniform float uMidtoneGain;
uniform float uHighlightCompression;
uniform float uHighlightRollOff;

uniform vec3 uShadowsWheel;
uniform vec3 uMidtonesWheel;
uniform vec3 uHighlightsWheel;
uniform float uWheelBalance;

uniform vec3 uHslBands[8];

uniform vec2 uSatByLum[5];

uniform float uSkinEnabled;
uniform float uSkinTargetHue;
uniform float uSkinHueRange;
uniform float uSkinMinSat;
uniform float uSkinMaxSat;
uniform float uSkinStrength;
uniform float uSkinHueShift;
uniform float uSkinSaturation;
uniform float uSkinLuminance;

uniform float uGamutCompression;
uniform float uGamutMaxSaturation;
uniform float uGamutPreserveNeutrals;

uniform float uClarity;
uniform float uMidtoneContrast;
uniform float uDehaze;

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

float hueMask(float hue, float targetHue, float rangeDeg) {
  float diff = mod(abs(hue - targetHue), 360.0);
  diff = min(diff, 360.0 - diff);
  float t = clamp(1.0 - diff / max(rangeDeg, 1e-4), 0.0, 1.0);
  return smoothstep(0.0, 1.0, t);
}

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

  vec3 c = srgbToLinear(original);

  c *= pow(2.0, uExposure * 3.0);
  c += uBrightness * 0.5;

  float contrastFactor = 1.0 + uContrast;
  c = (c - 0.18) * contrastFactor + 0.18;

  c.r *= 1.0 + uTemperature * 0.35;
  c.b *= 1.0 - uTemperature * 0.35;
  c.g *= 1.0 + uTint * 0.25;
  c.r *= 1.0 - uTint * 0.08;
  c.b *= 1.0 - uTint * 0.08;

  c = max(c, 0.0);

  float lum4 = luminance(c);
  c = mix(vec3(lum4), c, 1.0 + uGlobalSaturation);

  float maxC4 = max(max(c.r, c.g), c.b);
  float minC4 = min(min(c.r, c.g), c.b);
  float currentSat = maxC4 - minC4;
  float vibranceFactor = 1.0 + uVibrance * (1.0 - currentSat);
  c = mix(vec3(luminance(c)), c, vibranceFactor);
  c = max(c, 0.0);

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

  float rolloff = uHighlightRollOff;
  if (rolloff > 1e-4) {
    vec3 over = max(c - (1.0 - rolloff), 0.0);
    c = c - over + rolloff * (1.0 - exp(-over / max(rolloff, 1e-4)));
  }
  c = max(c, 0.0);

  {
    float lBefore = max(luminance(c), 1e-5);
    float lAfter = texture(uCurveLut, vec2(clamp(lBefore, 0.0, 1.0), 0.5)).r;
    c *= (lAfter / lBefore);
    c = max(c, 0.0);
  }

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

  {
    vec3 hsl = rgbToHsl(clamp(c, 0.0, 4.0));
    float hue = hsl.x;

    float hueTargets[8];
    hueTargets[0] = 0.0;
    hueTargets[1] = 30.0;
    hueTargets[2] = 60.0;
    hueTargets[3] = 120.0;
    hueTargets[4] = 180.0;
    hueTargets[5] = 240.0;
    hueTargets[6] = 275.0;
    hueTargets[7] = 320.0;

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

  {
    vec3 blurred = texture(uBlurred, vUv).rgb;
    vec3 detail = c - blurred;

    c += detail * uClarity;
    c += detail * uMidtoneContrast * midtonesMask(clamp(luminance(c), 0.0, 1.0));

    c = mix(blurred, c, 1.0 + uDehaze);
    c -= uDehaze * 0.02;
    c = max(c, 0.0);
  }

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

  vec3 finalColor = mix(original, gradedSrgb, uStrength);

  fragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
}
`;
