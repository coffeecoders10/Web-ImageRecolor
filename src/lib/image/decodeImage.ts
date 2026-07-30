import { validateDimensions, validateFile } from "./validateImage";

export interface DecodedImage {
  bitmap: ImageBitmap;
  previewUrl: string;
}

export async function decodeImageFile(file: File): Promise<DecodedImage> {
  const fileValidation = validateFile(file);
  if (!fileValidation.valid) {
    throw new Error(fileValidation.message ?? "Invalid file.");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
  } catch {
    throw new Error(
      "This image could not be decoded. It may be corrupted or in an unsupported format."
    );
  }

  const dimensionValidation = validateDimensions(bitmap.width, bitmap.height);
  if (!dimensionValidation.valid) {
    bitmap.close();
    throw new Error(dimensionValidation.message ?? "Invalid image dimensions.");
  }

  const previewUrl = URL.createObjectURL(file);

  return { bitmap, previewUrl };
}
