export type RGBColor = { r: number; g: number; b: number };

const MAX_DIMENSION = 2048;

function hexToRgb(hex: string): RGBColor {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.substring(0, 2), 16);
  const g = parseInt(normalized.substring(2, 4), 16);
  const b = parseInt(normalized.substring(4, 6), 16);
  return { r, g, b };
}

function getLuminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function sortPaletteByLuminance(colors: string[]): RGBColor[] {
  return colors
    .map(hexToRgb)
    .sort((a, b) => getLuminance(a.r, a.g, a.b) - getLuminance(b.r, b.g, b.b));
}

function interpolateColor(colorA: RGBColor, colorB: RGBColor, t: number): RGBColor {
  return {
    r: Math.round(colorA.r + (colorB.r - colorA.r) * t),
    g: Math.round(colorA.g + (colorB.g - colorA.g) * t),
    b: Math.round(colorA.b + (colorB.b - colorA.b) * t),
  };
}

function getCanvasDimensions(
  width: number,
  height: number,
  maxDimension: number
): { width: number; height: number } {
  const longestSide = Math.max(width, height);

  if (longestSide <= maxDimension) {
    return { width, height };
  }

  const scale = maxDimension / longestSide;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('We could not load this image. Please try a different file.'));
    };

    image.src = objectUrl;
  });
}

export async function recolorImageWithPalette(
  file: File,
  paletteColors: string[]
): Promise<Blob> {
  const image = await loadImage(file);
  const objectUrl = image.src;

  try {
    const { width, height } = getCanvasDimensions(
      image.naturalWidth,
      image.naturalHeight,
      MAX_DIMENSION
    );

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Something went wrong while recoloring the image. Please try again.');
    }

    ctx.drawImage(image, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const sortedPalette = sortPaletteByLuminance(paletteColors);
    const paletteLength = sortedPalette.length;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a === 0) {
        continue;
      }

      const luminance = getLuminance(r, g, b);
      const normalized = luminance / 255;

      const scaled = normalized * (paletteLength - 1);
      const lowerIndex = Math.floor(scaled);
      const upperIndex = Math.min(lowerIndex + 1, paletteLength - 1);
      const t = scaled - lowerIndex;

      const colorA = sortedPalette[lowerIndex];
      const colorB = sortedPalette[upperIndex];
      const outColor = interpolateColor(colorA, colorB, t);

      data[i] = outColor.r;
      data[i + 1] = outColor.g;
      data[i + 2] = outColor.b;
    }

    ctx.putImageData(imageData, 0, 0);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (!result) {
          reject(new Error('Something went wrong while recoloring the image. Please try again.'));
          return;
        }
        resolve(result);
      }, 'image/png');
    });

    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
