function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildDownloadFilename(
  originalFileName: string,
  presetName: string
): string {
  const dotIndex = originalFileName.lastIndexOf(".");
  const baseName =
    dotIndex > 0 ? originalFileName.slice(0, dotIndex) : originalFileName;
  const safeBaseName = slugify(baseName) || "image";
  const presetSlug = slugify(presetName) || "graded";
  return `${safeBaseName}__${presetSlug}.png`;
}

export async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), "image/png");
  });

  if (!blob) {
    throw new Error("Could not create the PNG file for download.");
  }

  return blob;
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
