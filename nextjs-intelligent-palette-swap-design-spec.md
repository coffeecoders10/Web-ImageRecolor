# Next.js Intelligent Palette Swap — Design Specification

## 1. Product Overview

Create a single-page Next.js application where users can:

1. Upload an image.
2. View an automatically extracted color palette.
3. Select a replacement palette from five predefined options.
4. Recolor the image while preserving realistic brightness, shading, hue relationships, and subject details.
5. Download the processed image.

All image processing must happen locally in the browser. Uploaded images must not be stored or sent to an external server.

---

## 2. Technology

- Next.js with TypeScript
- App Router
- CSS Modules or standard CSS
- No Tailwind CSS
- Canvas API for image processing
- Optional lightweight browser-based image segmentation model
- `next/font` for typography

No database, authentication, backend storage, or automated tests are required.

---

## 3. Page Layout

The complete application must fit above the fold on a standard desktop screen.

### Header

- Small product name or logo
- One-line instruction:  
  **“Upload an image, choose a palette, and download your recolored version.”**
- Use a distinctive display font for headings and a readable sans-serif font for controls.

### Main Workspace

Use a three-column desktop layout.

#### Left: Upload

- Drag-and-drop upload area
- “Choose Image” button
- Supported formats: PNG, JPG, JPEG, and WebP
- Show the original image after upload
- Display the extracted source palette below the image

#### Center: Palette Selection

Show five predefined palettes as clickable color swatches.

Example palettes:

- Warm Cinematic
- Cool Editorial
- Pastel Dream
- Retro Sunset
- Forest Earth

The selected palette must have a clear active state.

Include a strength slider:

- Range: 0% to 100%
- Default: 85%
- Controls how strongly the new palette affects the image

#### Right: Result

- Display the recolored image
- Provide a before/after toggle
- “Download Image” button
- “Reset” button

On mobile, stack these sections vertically.

---

## 4. Image Analysis

When an image is uploaded:

1. Resize a temporary analysis copy to a manageable resolution.
2. Convert pixels to a perceptual color space such as OKLab or CIELAB.
3. Cluster similar colors using K-means or median-cut quantization.
4. Extract approximately 6–10 dominant colors.
5. Record the percentage of the image occupied by each color.
6. Classify colors by:
   - Lightness
   - Saturation
   - Hue family
   - Warm or cool temperature
   - Frequency and visual importance

Very small color groups and compression noise should be ignored.

---

## 5. Intelligent Palette Mapping

Do not replace colors using simple nearest-RGB matching.

The recoloring system should map source colors to the selected palette according to:

- Percentage of image usage
- Relative brightness
- Saturation level
- Hue similarity
- Warm versus cool relationships
- Foreground and background importance
- Subject and object regions

The most frequently used source color should generally map to the dominant color of the selected palette. Accent colors should map to accent colors rather than becoming dominant.

Preserve each pixel’s original lightness and texture. The replacement palette should influence chroma and hue without flattening highlights, shadows, gradients, or fine details.

---

## 6. Subject and Object Awareness

Use lightweight image segmentation or subject detection to separate areas such as:

- Primary subject
- Skin
- Hair
- Clothing
- Background
- Sky
- Plants
- Neutral objects

Apply different recoloring strengths by region.

Important behavior:

- Skin tones should remain natural and receive only subtle temperature adjustments.
- White, black, and neutral areas should not receive strong color shifts.
- Shadows and highlights must remain consistent.
- Background regions may receive stronger palette changes.
- Small accent objects should use secondary or accent palette colors.
- Avoid assigning the same replacement color to every object with a similar original color.

If semantic segmentation is unavailable, use edge detection, connected regions, saturation, luminance, and spatial grouping as a fallback.

---

## 7. Recoloring Pipeline

1. Load the uploaded image into an off-screen canvas.
2. Extract the dominant source palette.
3. Detect subject and object regions.
4. Create a source-to-target palette mapping.
5. Convert each pixel into OKLab or another perceptual color space.
6. Adjust hue and chroma based on its mapped palette color.
7. Preserve most of the original pixel lightness.
8. Blend the result with the original using the strength setting.
9. Apply light edge-aware smoothing to prevent color banding.
10. Render the final image to the preview canvas.

Processing should begin automatically after a palette is selected.

---

## 8. Interaction States

### Empty State

Show the upload area and a simple visual explanation:

**Upload → Select Palette → Download**

### Processing State

- Show a subtle progress indicator
- Disable palette changes briefly during final rendering
- Keep the interface responsive

### Error State

Display clear inline messages for:

- Unsupported file types
- Images that are too large
- Failed image decoding
- Browser memory limitations

### Completed State

Show the recolored preview and enable downloading.

---

## 9. Download Behavior

- Export the image directly from the browser canvas
- Preserve the original aspect ratio
- Use PNG for transparent images
- Use high-quality JPEG or WebP for regular photographs
- Suggested filename: `original-name-palette-name.png`

The image must never be uploaded to a server.

---

## 10. Visual Style

- Minimal, modern, editorial interface
- Neutral background so palette colors remain prominent
- Rounded image panels with subtle borders
- Large previews with limited surrounding controls
- One distinctive heading font
- Simple iconography
- No unnecessary navigation, footer, modal, or secondary page
- Avoid gradients unless they are part of palette previews

The application should feel like a focused creative tool rather than a dashboard.

---

## 11. Suggested Component Structure

```text
app/
  page.tsx
  page.module.css

components/
  ImageUploader.tsx
  ImagePreview.tsx
  ExtractedPalette.tsx
  PaletteSelector.tsx
  StrengthSlider.tsx
  BeforeAfterToggle.tsx
  DownloadButton.tsx

lib/
  paletteExtraction.ts
  colorConversion.ts
  paletteMapping.ts
  imageSegmentation.ts
  recolorImage.ts
  exportImage.ts

data/
  predefinedPalettes.ts
```

---

## 12. Acceptance Criteria

- The application is a single-page Next.js website.
- The desktop interface fits above the fold.
- Tailwind CSS is not installed or used.
- Users can upload PNG, JPG, JPEG, or WebP images.
- A dominant source palette is extracted and displayed.
- Five predefined replacement palettes are available.
- Recoloring considers color frequency, brightness, saturation, and image regions.
- Skin tones, neutrals, highlights, and shadows remain believable.
- Users can adjust recoloring strength.
- Users can compare the original and processed images.
- The processed image can be downloaded.
- Uploaded images are processed locally and are never stored externally.
