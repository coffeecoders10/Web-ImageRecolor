function canvasHasTransparency(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true;
  }
  return false;
}

export function sanitizeBaseName(fileName: string): string {
  const withoutExt = fileName.replace(/\.[^/.]+$/, "");
  return withoutExt.replace(/[^a-z0-9-_]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "image";
}

export function downloadCanvas(
  canvas: HTMLCanvasElement,
  originalFileName: string,
  paletteName: string
): void {
  const transparent = canvasHasTransparency(canvas);
  const mimeType = transparent ? "image/png" : "image/jpeg";
  const quality = transparent ? undefined : 0.95;
  const extension = transparent ? "png" : "jpg";

  const base = sanitizeBaseName(originalFileName);
  const paletteSlug = paletteName.toLowerCase().replace(/\s+/g, "-");
  const filename = `${base}-${paletteSlug}.${extension}`;

  canvas.toBlob(
    (blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    mimeType,
    quality
  );
}
