export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Please upload a PNG, JPEG, or WEBP image.';
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return 'Please upload an image smaller than 10 MB.';
  }

  return null;
}
