import { PredefinedPalette } from "@/data/predefinedPalettes";
import { ExtractedColor } from "./paletteExtraction";
import type { RecolorWorkerRequest, RecolorWorkerResponse } from "./recolor.worker";

export interface RecolorResult {
  canvas: HTMLCanvasElement;
  sourcePalette: ExtractedColor[];
}

export interface RecolorOptions {
  strength: number; // 0-1
}

// Runs the (CPU-heavy) recolor pipeline in a Web Worker so the main thread —
// and any UI feedback like a loading spinner — stays responsive while a
// multi-megapixel image is processed.
export async function recolorImage(
  image: HTMLImageElement,
  targetPalette: PredefinedPalette,
  options: RecolorOptions
): Promise<RecolorResult> {
  const { strength } = options;

  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const t0 = performance.now();
  console.log(`[recolorImage] start: ${width}x${height} = ${(width * height / 1e6).toFixed(2)}MP, palette=${targetPalette.id}, strength=${strength}`);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(image, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  console.log(`[recolorImage] drawImage+getImageData: ${(performance.now() - t0).toFixed(0)}ms`);

  const { imageData: resultImageData, sourcePalette } = await runInWorker(imageData, targetPalette, strength);
  console.log(`[recolorImage] worker roundtrip: ${(performance.now() - t0).toFixed(0)}ms`);

  ctx.putImageData(resultImageData, 0, 0);
  console.log(`[recolorImage] TOTAL: ${(performance.now() - t0).toFixed(0)}ms`);

  return { canvas, sourcePalette };
}

function runInWorker(
  imageData: ImageData,
  palette: PredefinedPalette,
  strength: number
): Promise<{ imageData: ImageData; sourcePalette: ExtractedColor[] }> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./recolor.worker.ts", import.meta.url));

    worker.onmessage = (event: MessageEvent<RecolorWorkerResponse>) => {
      worker.terminate();
      resolve({ imageData: event.data.imageData, sourcePalette: event.data.sourcePalette });
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message || "Recolor worker failed"));
    };

    const request: RecolorWorkerRequest = { imageData, palette, strength };
    worker.postMessage(request, [imageData.data.buffer]);
  });
}
