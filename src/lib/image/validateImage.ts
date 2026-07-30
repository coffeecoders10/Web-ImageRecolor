export const ACCEPTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const MAX_FILE_SIZE_BYTES = 30 * 1024 * 1024; // 30MB
export const MAX_MEGAPIXELS = 24;
export const MAX_PIXELS = MAX_MEGAPIXELS * 1_000_000;

export interface ValidationResult {
  valid: boolean;
  message: string | null;
}

export function validateFile(file: File): ValidationResult {
  if (!ACCEPTED_MIME_TYPES.includes(file.type as (typeof ACCEPTED_MIME_TYPES)[number])) {
    return {
      valid: false,
      message: "Unsupported file type. Please upload a JPEG, PNG, or WebP image.",
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      message: `File is too large (${sizeMb}MB). The maximum supported size is 30MB.`,
    };
  }

  return { valid: true, message: null };
}

export function validateDimensions(width: number, height: number): ValidationResult {
  const pixels = width * height;
  if (pixels > MAX_PIXELS) {
    const megapixels = (pixels / 1_000_000).toFixed(1);
    return {
      valid: false,
      message: `Image resolution is too high (${megapixels}MP). The maximum supported resolution is ${MAX_MEGAPIXELS}MP.`,
    };
  }

  return { valid: true, message: null };
}
