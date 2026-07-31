import { PredefinedPalette } from "@/data/predefinedPalettes";
import { ExtractedColor } from "./paletteExtraction";
import { recolorImageData } from "./recolorCore";

export interface RecolorWorkerRequest {
  imageData: ImageData;
  palette: PredefinedPalette;
  strength: number;
}

export interface RecolorWorkerResponse {
  imageData: ImageData;
  sourcePalette: ExtractedColor[];
}

self.onmessage = (event: MessageEvent<RecolorWorkerRequest>) => {
  const { imageData, palette, strength } = event.data;
  const result = recolorImageData(imageData, palette, { strength });
  const response: RecolorWorkerResponse = {
    imageData: result.imageData,
    sourcePalette: result.sourcePalette,
  };
  (self as unknown as Worker).postMessage(response, [result.imageData.data.buffer]);
};
