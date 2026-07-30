import type { ColorGradePreset } from "@/types/colorGrade";
import { buildPresetUniforms, type PresetUniforms } from "./applyPreset";
import { BASIC_VERT, BLUR_FRAG, COPY_FRAG, GRADE_FRAG } from "./shaders";
import { CURVE_LUT_SIZE } from "./curveInterpolation";

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Failed to create shader.");

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile error: ${log ?? "unknown error"}`);
  }

  return shader;
}

function linkProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string
): WebGLProgram {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

  const program = gl.createProgram();
  if (!program) throw new Error("Failed to create program.");

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program link error: ${log ?? "unknown error"}`);
  }

  return program;
}

interface FramebufferTarget {
  framebuffer: WebGLFramebuffer;
  texture: WebGLTexture;
  width: number;
  height: number;
}

function createFramebufferTarget(
  gl: WebGL2RenderingContext,
  width: number,
  height: number
): FramebufferTarget {
  const texture = gl.createTexture();
  if (!texture) throw new Error("Failed to create texture.");

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const framebuffer = gl.createFramebuffer();
  if (!framebuffer) throw new Error("Failed to create framebuffer.");

  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);

  return { framebuffer, texture, width, height };
}

function deleteFramebufferTarget(gl: WebGL2RenderingContext, target: FramebufferTarget): void {
  gl.deleteFramebuffer(target.framebuffer);
  gl.deleteTexture(target.texture);
}

const BLUR_DOWNSCALE = 0.5;

export class ColorGradeEngine {
  private gl: WebGL2RenderingContext;
  private copyProgram: WebGLProgram;
  private blurProgram: WebGLProgram;
  private gradeProgram: WebGLProgram;
  private quadBuffer: WebGLBuffer;

  private sourceTexture: WebGLTexture | null = null;
  private curveLutTexture: WebGLTexture;

  private blurTargetA: FramebufferTarget | null = null;
  private blurTargetB: FramebufferTarget | null = null;

  private grainSeed = Math.random() * 1000;

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", {
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
      antialias: false,
    });

    if (!gl) {
      throw new Error("WebGL2 is not supported in this browser.");
    }

    this.gl = gl;
    this.copyProgram = linkProgram(gl, BASIC_VERT, COPY_FRAG);
    this.blurProgram = linkProgram(gl, BASIC_VERT, BLUR_FRAG);
    this.gradeProgram = linkProgram(gl, BASIC_VERT, GRADE_FRAG);

    const quadBuffer = gl.createBuffer();
    if (!quadBuffer) throw new Error("Failed to create quad buffer.");
    this.quadBuffer = quadBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const curveLutTexture = gl.createTexture();
    if (!curveLutTexture) throw new Error("Failed to create curve LUT texture.");
    this.curveLutTexture = curveLutTexture;
    gl.bindTexture(gl.TEXTURE_2D, curveLutTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  private bindQuad(program: WebGLProgram): void {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    const loc = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  }

  /** Uploads (or replaces) the source image used for grading. */
  setSourceImage(image: ImageBitmap | HTMLCanvasElement): void {
    const gl = this.gl;

    if (this.sourceTexture) {
      gl.deleteTexture(this.sourceTexture);
    }

    const texture = gl.createTexture();
    if (!texture) throw new Error("Failed to create source texture.");

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.sourceTexture = texture;

    const width = "width" in image ? image.width : 0;
    const height = "height" in image ? image.height : 0;
    this.resizeTargets(width, height);
  }

  private resizeTargets(width: number, height: number): void {
    const gl = this.gl;

    this.canvas.width = width;
    this.canvas.height = height;

    if (this.blurTargetA) deleteFramebufferTarget(gl, this.blurTargetA);
    if (this.blurTargetB) deleteFramebufferTarget(gl, this.blurTargetB);

    const blurWidth = Math.max(1, Math.round(width * BLUR_DOWNSCALE));
    const blurHeight = Math.max(1, Math.round(height * BLUR_DOWNSCALE));

    this.blurTargetA = createFramebufferTarget(gl, blurWidth, blurHeight);
    this.blurTargetB = createFramebufferTarget(gl, blurWidth, blurHeight);
  }

  private renderBlurPyramid(): void {
    const gl = this.gl;
    if (!this.sourceTexture || !this.blurTargetA || !this.blurTargetB) return;

    // Downsample source -> blurTargetA
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.blurTargetA.framebuffer);
    gl.viewport(0, 0, this.blurTargetA.width, this.blurTargetA.height);
    gl.useProgram(this.copyProgram);
    this.bindQuad(this.copyProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);
    gl.uniform1i(gl.getUniformLocation(this.copyProgram, "uSource"), 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Horizontal blur: blurTargetA -> blurTargetB
    gl.useProgram(this.blurProgram);
    this.bindQuad(this.blurProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.blurTargetB.framebuffer);
    gl.viewport(0, 0, this.blurTargetB.width, this.blurTargetB.height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.blurTargetA.texture);
    gl.uniform1i(gl.getUniformLocation(this.blurProgram, "uSource"), 0);
    gl.uniform2f(
      gl.getUniformLocation(this.blurProgram, "uTexelSize"),
      1 / this.blurTargetA.width,
      1 / this.blurTargetA.height
    );
    gl.uniform2f(gl.getUniformLocation(this.blurProgram, "uDirection"), 1, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Vertical blur: blurTargetB -> blurTargetA
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.blurTargetA.framebuffer);
    gl.viewport(0, 0, this.blurTargetA.width, this.blurTargetA.height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.blurTargetB.texture);
    gl.uniform1i(gl.getUniformLocation(this.blurProgram, "uSource"), 0);
    gl.uniform2f(
      gl.getUniformLocation(this.blurProgram, "uTexelSize"),
      1 / this.blurTargetB.width,
      1 / this.blurTargetB.height
    );
    gl.uniform2f(gl.getUniformLocation(this.blurProgram, "uDirection"), 0, 1);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private uploadCurveLut(lut: Float32Array): void {
    const gl = this.gl;
    const data = new Uint8Array(CURVE_LUT_SIZE * 4);
    for (let i = 0; i < CURVE_LUT_SIZE; i++) {
      const v = Math.round(Math.min(1, Math.max(0, lut[i])) * 255);
      data[i * 4 + 0] = v;
      data[i * 4 + 1] = v;
      data[i * 4 + 2] = v;
      data[i * 4 + 3] = 255;
    }

    gl.bindTexture(gl.TEXTURE_2D, this.curveLutTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA8,
      CURVE_LUT_SIZE,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      data
    );
  }

  private applyUniforms(uniforms: PresetUniforms, strength: number): void {
    const gl = this.gl;
    const program = this.gradeProgram;
    const u = (name: string) => gl.getUniformLocation(program, name);

    gl.uniform1f(u("uStrength"), strength);
    gl.uniform1f(u("uGrainSeed"), this.grainSeed);
    gl.uniform2f(u("uResolution"), this.canvas.width, this.canvas.height);

    const [exposure, contrast, brightness, temperature, tint, globalSaturation, vibrance] =
      uniforms.basicAdjustments;
    gl.uniform1f(u("uExposure"), exposure);
    gl.uniform1f(u("uContrast"), contrast);
    gl.uniform1f(u("uBrightness"), brightness);
    gl.uniform1f(u("uTemperature"), temperature);
    gl.uniform1f(u("uTint"), tint);
    gl.uniform1f(u("uGlobalSaturation"), globalSaturation);
    gl.uniform1f(u("uVibrance"), vibrance);

    const [blackPoint, whitePoint, shadowLift, midtoneGain, highlightCompression, highlightRollOff] =
      uniforms.tone;
    gl.uniform1f(u("uBlackPoint"), blackPoint);
    gl.uniform1f(u("uWhitePoint"), whitePoint);
    gl.uniform1f(u("uShadowLift"), shadowLift);
    gl.uniform1f(u("uMidtoneGain"), midtoneGain);
    gl.uniform1f(u("uHighlightCompression"), highlightCompression);
    gl.uniform1f(u("uHighlightRollOff"), highlightRollOff);

    gl.uniform3f(u("uShadowsWheel"), ...uniforms.shadowsWheel);
    gl.uniform3f(u("uMidtonesWheel"), ...uniforms.midtonesWheel);
    gl.uniform3f(u("uHighlightsWheel"), ...uniforms.highlightsWheel);
    gl.uniform1f(u("uWheelBalance"), uniforms.wheelBalance);

    const hslLoc = u("uHslBands[0]");
    gl.uniform3fv(hslLoc, uniforms.hslAdjustments);

    const satLoc = u("uSatByLum[0]");
    gl.uniform2fv(satLoc, uniforms.saturationByLuminance);

    const [
      skinEnabled,
      skinTargetHue,
      skinHueRange,
      skinMinSat,
      skinMaxSat,
      skinStrength,
      skinHueShift,
      skinSaturation,
      skinLuminance,
    ] = uniforms.skinTone;
    gl.uniform1f(u("uSkinEnabled"), skinEnabled);
    gl.uniform1f(u("uSkinTargetHue"), skinTargetHue);
    gl.uniform1f(u("uSkinHueRange"), skinHueRange);
    gl.uniform1f(u("uSkinMinSat"), skinMinSat);
    gl.uniform1f(u("uSkinMaxSat"), skinMaxSat);
    gl.uniform1f(u("uSkinStrength"), skinStrength);
    gl.uniform1f(u("uSkinHueShift"), skinHueShift);
    gl.uniform1f(u("uSkinSaturation"), skinSaturation);
    gl.uniform1f(u("uSkinLuminance"), skinLuminance);

    const [gamutCompression, gamutMaxSaturation, gamutPreserveNeutrals] = uniforms.gamut;
    gl.uniform1f(u("uGamutCompression"), gamutCompression);
    gl.uniform1f(u("uGamutMaxSaturation"), gamutMaxSaturation);
    gl.uniform1f(u("uGamutPreserveNeutrals"), gamutPreserveNeutrals);

    const [clarity, midtoneContrast, dehaze] = uniforms.localContrast;
    gl.uniform1f(u("uClarity"), clarity);
    gl.uniform1f(u("uMidtoneContrast"), midtoneContrast);
    gl.uniform1f(u("uDehaze"), dehaze);

    const [bloomEnabled, bloomThreshold, bloomIntensity, bloomRadius] = uniforms.bloom;
    gl.uniform1f(u("uBloomEnabled"), bloomEnabled);
    gl.uniform1f(u("uBloomThreshold"), bloomThreshold);
    gl.uniform1f(u("uBloomIntensity"), bloomIntensity);
    gl.uniform1f(u("uBloomRadius"), bloomRadius);

    const [grainEnabled, grainAmount, grainSize, grainRoughness] = uniforms.grain;
    gl.uniform1f(u("uGrainEnabled"), grainEnabled);
    gl.uniform1f(u("uGrainAmount"), grainAmount);
    gl.uniform1f(u("uGrainSize"), grainSize);
    gl.uniform1f(u("uGrainRoughness"), grainRoughness);

    const [vignetteEnabled, vignetteAmount, vignetteMidpoint, vignetteFeather] = uniforms.vignette;
    gl.uniform1f(u("uVignetteEnabled"), vignetteEnabled);
    gl.uniform1f(u("uVignetteAmount"), vignetteAmount);
    gl.uniform1f(u("uVignetteMidpoint"), vignetteMidpoint);
    gl.uniform1f(u("uVignetteFeather"), vignetteFeather);

    const [sharpenAmount, sharpenRadius] = uniforms.sharpening;
    gl.uniform1f(u("uSharpenAmount"), sharpenAmount);
    gl.uniform1f(u("uSharpenRadius"), sharpenRadius);
  }

  /** Renders the given preset + strength for the currently bound source image. */
  render(preset: ColorGradePreset, strength: number): void {
    const gl = this.gl;
    if (!this.sourceTexture) return;

    const uniforms = buildPresetUniforms(preset);
    this.uploadCurveLut(uniforms.curveLut);
    this.renderBlurPyramid();

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.gradeProgram);
    this.bindQuad(this.gradeProgram);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);
    gl.uniform1i(gl.getUniformLocation(this.gradeProgram, "uSource"), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.blurTargetA?.texture ?? null);
    gl.uniform1i(gl.getUniformLocation(this.gradeProgram, "uBlurred"), 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.curveLutTexture);
    gl.uniform1i(gl.getUniformLocation(this.gradeProgram, "uCurveLut"), 2);

    this.applyUniforms(uniforms, strength);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  dispose(): void {
    const gl = this.gl;
    if (this.sourceTexture) gl.deleteTexture(this.sourceTexture);
    if (this.blurTargetA) deleteFramebufferTarget(gl, this.blurTargetA);
    if (this.blurTargetB) deleteFramebufferTarget(gl, this.blurTargetB);
    gl.deleteTexture(this.curveLutTexture);
    gl.deleteBuffer(this.quadBuffer);
    gl.deleteProgram(this.copyProgram);
    gl.deleteProgram(this.blurProgram);
    gl.deleteProgram(this.gradeProgram);
  }
}
