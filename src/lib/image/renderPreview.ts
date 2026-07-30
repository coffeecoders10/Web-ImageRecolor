export const PREVIEW_MAX_LONG_EDGE = 1600;

export interface PreviewDimensions {
  width: number;
  height: number;
}

export function computePreviewDimensions(
  sourceWidth: number,
  sourceHeight: number
): PreviewDimensions {
  const longEdge = Math.max(sourceWidth, sourceHeight);
  if (longEdge <= PREVIEW_MAX_LONG_EDGE) {
    return { width: sourceWidth, height: sourceHeight };
  }

  const scale = PREVIEW_MAX_LONG_EDGE / longEdge;
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
  };
}

/**
 * Draws the source bitmap into an offscreen canvas at preview resolution.
 * This downscaled canvas is what gets uploaded to the WebGL engine for
 * fast, real-time preview rendering.
 */
export function createPreviewSourceCanvas(bitmap: ImageBitmap): HTMLCanvasElement {
  const { width, height } = computePreviewDimensions(bitmap.width, bitmap.height);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create a 2D rendering context for the preview.");

  ctx.drawImage(bitmap, 0, 0, width, height);
  return canvas;
}
