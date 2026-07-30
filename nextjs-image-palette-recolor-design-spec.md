# Design Specification: Next.js Image Palette Recoloring Website

## 1. Project Overview

Build a simple single-page Next.js website where a user can upload an image, choose one of five predefined color palettes, recolor the uploaded image using the selected palette, preview the result, and download the recolored image.

The application must be privacy-friendly. The uploaded image must never be saved to a database, external storage, server filesystem, analytics payload, or third-party service. Image processing should happen entirely in the browser using the HTML Canvas API.

The UI should use a clean dark theme with clear instructions and an easy three-step flow:

1. Upload an image.
2. Select a palette.
3. Recolor and download.

## 2. Goals

The completed application should:

- Allow users to upload a local image file.
- Show the original image preview.
- Provide five predefined color palettes.
- Let users select one palette at a time.
- Recolor the image based on the selected palette.
- Show the recolored image preview.
- Let users download the recolored image.
- Process the image locally in the browser only.
- Use a simple dark-themed single-page layout.
- Use MUI or normal CSS only.
- Avoid Tailwind CSS entirely.
- Avoid automated tests for this simple application.

## 3. Non-Goals

Do not build the following:

- User accounts.
- Login or authentication.
- Image database storage.
- External image upload APIs.
- Server-side image processing.
- Payment flows.
- History of processed images.
- Sharing links for generated images.
- Complex image editing features such as cropping, masking, layers, brush tools, or manual adjustments.
- Test suite setup.

## 4. Recommended Tech Stack

Use the following stack:

- Next.js with the App Router.
- React.
- TypeScript.
- MUI for UI components and theming.
- HTML Canvas API for image processing.
- Browser Blob and Object URL APIs for preview and download.

Tailwind CSS must not be installed or used.

## 5. High-Level Architecture

The application should be mostly client-side.

### Recommended Architecture

```text
Browser
  ├── User selects local image
  ├── Image is loaded into an HTMLImageElement
  ├── Image is drawn to a canvas
  ├── Pixel data is transformed using selected palette
  ├── Recolored image is generated as Blob/Object URL
  └── User downloads final image
```

### Important Privacy Rule

There should be no backend route for image upload.

The uploaded image should remain only in:

- The user's browser memory.
- An object URL created from the local file.
- A canvas element used for processing.
- A generated downloadable Blob.

No image data should be sent to:

- A database.
- A server route.
- Local server filesystem.
- Third-party APIs.
- Analytics tools.
- Logging systems.

## 6. User Flow

### Initial State

The page shows:

- App title.
- Short explanation of what the app does.
- Privacy note explaining that images are processed locally and are not uploaded.
- Upload area.
- Palette selector.
- Disabled recolor/download controls until an image is uploaded.

### Upload Flow

1. User clicks upload area or drags an image into it.
2. App validates that the selected file is an image.
3. App creates an object URL for the selected image.
4. App displays the original image preview.
5. App enables palette selection and recolor controls.

### Palette Selection Flow

1. User selects one of five palettes.
2. Selected palette is visually highlighted.
3. User can preview the palette colors before applying.
4. If an image is already uploaded, the app may recolor automatically or require clicking an `Apply Palette` button.

Recommended behavior: recolor automatically when a new palette is selected after an image has been uploaded. This makes the app feel responsive and simple.

### Recolor Flow

1. User uploads image.
2. User selects palette.
3. App draws the image to a hidden canvas.
4. App reads pixel data.
5. App maps image tones to the selected palette.
6. App writes transformed pixel data back to the canvas.
7. App converts canvas output into a Blob.
8. App creates an object URL for the recolored image.
9. App displays the recolored preview.
10. Download button becomes active.

### Download Flow

1. User clicks `Download Recolored Image`.
2. App downloads the generated image file.
3. Suggested filename format:

```text
recolored-<palette-slug>.png
```

Example:

```text
recolored-neon-dusk.png
```

## 7. Page Layout

The website should be a single page.

### Suggested Layout

```text
--------------------------------------------------
| Header                                           |
| Image Palette Recolor                           |
| Upload an image, choose a palette, download it. |
--------------------------------------------------
| Privacy Notice                                  |
| Your image is processed locally in your browser |
| and is never uploaded or saved.                 |
--------------------------------------------------
| Step 1: Upload Image                            |
| [ Drag & drop / Choose image ]                  |
--------------------------------------------------
| Step 2: Choose Palette                          |
| [Palette Cards / Color Swatches]                |
--------------------------------------------------
| Step 3: Preview & Download                      |
| [Original Preview] [Recolored Preview]          |
| [Download Button]                               |
--------------------------------------------------
```

### Desktop Layout

On desktop screens:

- Use a centered container with max width around `1100px`.
- Use two preview cards side by side:
  - Original image.
  - Recolored image.
- Palette cards can be displayed in a responsive grid.

### Mobile Layout

On mobile screens:

- Stack all sections vertically.
- Original and recolored previews should stack vertically.
- Buttons should use full width where appropriate.
- Upload area should remain easy to tap.

## 8. Visual Design Requirements

### Theme

Use a dark theme.

Recommended colors:

```ts
const themeColors = {
  background: '#0B0F19',
  surface: '#121826',
  surfaceElevated: '#1A2235',
  border: '#2A3448',
  textPrimary: '#F8FAFC',
  textSecondary: '#AAB4C5',
  accent: '#8B5CF6',
  accentHover: '#7C3AED',
  error: '#F87171',
  success: '#34D399'
};
```

### Typography

Use simple, readable typography.

Suggested hierarchy:

- Page title: large, bold.
- Section labels: medium, semibold.
- Instructions: smaller, muted text.
- Button labels: clear and action-oriented.

### UI Style

The UI should feel modern but simple:

- Rounded cards.
- Subtle borders.
- Dark surfaces.
- Clear focus states.
- Palette cards with visible color swatches.
- Strong contrast for primary actions.
- No clutter.

## 9. Palette Definitions

Create five predefined palettes. Each palette should have:

- `id`
- `name`
- `description`
- `colors`
- `slug`

Suggested palettes:

```ts
export type ColorPalette = {
  id: string;
  name: string;
  description: string;
  slug: string;
  colors: string[];
};

export const COLOR_PALETTES: ColorPalette[] = [
  {
    id: 'neon-dusk',
    name: 'Neon Dusk',
    description: 'Violet, magenta, and electric blue tones.',
    slug: 'neon-dusk',
    colors: ['#1B1035', '#4C1D95', '#7C3AED', '#EC4899', '#22D3EE']
  },
  {
    id: 'forest-mist',
    name: 'Forest Mist',
    description: 'Deep greens and soft natural highlights.',
    slug: 'forest-mist',
    colors: ['#0B1F17', '#14532D', '#15803D', '#86EFAC', '#ECFCCB']
  },
  {
    id: 'sunset-heat',
    name: 'Sunset Heat',
    description: 'Warm oranges, reds, and golden highlights.',
    slug: 'sunset-heat',
    colors: ['#2A0A0A', '#7F1D1D', '#DC2626', '#F97316', '#FACC15']
  },
  {
    id: 'ocean-glass',
    name: 'Ocean Glass',
    description: 'Cool navy, teal, and aqua colors.',
    slug: 'ocean-glass',
    colors: ['#061826', '#0F3A5B', '#0369A1', '#14B8A6', '#CCFBF1']
  },
  {
    id: 'mono-ink',
    name: 'Mono Ink',
    description: 'A grayscale ink-inspired palette.',
    slug: 'mono-ink',
    colors: ['#030712', '#1F2937', '#4B5563', '#D1D5DB', '#F9FAFB']
  }
];
```

## 10. Image Recoloring Algorithm

Use a deterministic tone-mapping algorithm.

The goal is to preserve the structure, shadows, and highlights of the original image while replacing the color range with the selected palette.

### Recommended Algorithm

1. Load the image into a canvas.
2. Read pixel data using `getImageData`.
3. Sort selected palette colors by luminance from darkest to lightest.
4. For each pixel:
   - Read `r`, `g`, `b`, and `a`.
   - If alpha is `0`, keep the pixel transparent.
   - Calculate perceived luminance.
   - Normalize luminance to a value from `0` to `1`.
   - Use normalized luminance to find two neighboring palette colors.
   - Interpolate between those two colors.
   - Preserve the original alpha value.
5. Write updated pixel data back using `putImageData`.
6. Export the canvas as PNG.

### Luminance Formula

Use perceived luminance instead of a simple average:

```ts
const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
const normalized = luminance / 255;
```

### Palette Interpolation

For a palette with five colors:

```ts
const scaled = normalized * (palette.length - 1);
const lowerIndex = Math.floor(scaled);
const upperIndex = Math.min(lowerIndex + 1, palette.length - 1);
const t = scaled - lowerIndex;
```

Then interpolate each RGB channel:

```ts
const outR = Math.round(colorA.r + (colorB.r - colorA.r) * t);
const outG = Math.round(colorA.g + (colorB.g - colorA.g) * t);
const outB = Math.round(colorA.b + (colorB.b - colorA.b) * t);
```

### Why This Algorithm

This approach is simple, fast, and good enough for a single-page app. It avoids complicated color quantization while still producing visually consistent palette-based results.

## 11. File Validation Rules

The app should validate uploads before processing.

### Accepted File Types

Accept common browser-supported image files:

```text
image/png
image/jpeg
image/webp
```

Optional:

```text
image/gif
```

If GIF support is included, only the first frame will be processed because Canvas does not preserve animation. To avoid confusion, it is better to not support GIF for the first version.

Recommended accepted formats:

```text
PNG, JPEG, WEBP
```

### File Size Limit

Recommended limit:

```text
10 MB
```

Show a clear error message if the file is too large.

Example message:

```text
Please upload an image smaller than 10 MB.
```

### Image Dimension Handling

Very large images can cause slow processing or browser memory issues. Use a maximum processing dimension.

Recommended max dimension:

```text
2048 px on the longest side
```

If the uploaded image is larger than this, resize it proportionally before processing.

Example:

```ts
const MAX_DIMENSION = 2048;
```

This keeps the app responsive while still producing a high-quality downloadable image.

## 12. State Management

Local React state is enough. Do not use Redux, Zustand, or other global state libraries.

Suggested state:

```ts
type AppStatus = 'idle' | 'image-loaded' | 'processing' | 'processed' | 'error';

const [selectedFile, setSelectedFile] = useState<File | null>(null);
const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
const [selectedPaletteId, setSelectedPaletteId] = useState<string>('neon-dusk');
const [status, setStatus] = useState<AppStatus>('idle');
const [errorMessage, setErrorMessage] = useState<string | null>(null);
```

### Object URL Cleanup

Revoke old object URLs when replacing images or unmounting components.

```ts
URL.revokeObjectURL(oldUrl);
```

This prevents memory leaks.

## 13. Recommended Project Structure

Use a small, clear structure.

```text
palette-recolor-app/
  app/
    layout.tsx
    page.tsx
    globals.css
  components/
    AppHeader.tsx
    UploadPanel.tsx
    PaletteSelector.tsx
    ImagePreviewGrid.tsx
    PrivacyNotice.tsx
  lib/
    palettes.ts
    imageProcessing.ts
    fileValidation.ts
  theme/
    theme.ts
  public/
    favicon.ico
  package.json
  tsconfig.json
  next.config.ts
  README.md
```

## 14. Component Responsibilities

### `app/page.tsx`

Main page component.

Responsibilities:

- Hold app state.
- Coordinate upload, palette selection, processing, and download.
- Render the main page layout.
- Pass props to child components.

This component should be a client component because it uses browser APIs.

Add at the top:

```tsx
'use client';
```

### `AppHeader.tsx`

Displays:

- App name.
- Short subtitle.
- Optional small badge such as `Local-only processing`.

Suggested copy:

```text
Image Palette Recolor
Upload an image, choose a palette, and download a recolored version.
```

### `PrivacyNotice.tsx`

Displays a prominent privacy message.

Suggested copy:

```text
Your image stays in your browser. It is not uploaded, stored, or sent to any external service.
```

### `UploadPanel.tsx`

Responsibilities:

- Show drag-and-drop upload area.
- Show file picker button.
- Validate selected file.
- Display selected filename.
- Display supported formats and size limit.
- Forward valid file to parent component.

Props:

```ts
type UploadPanelProps = {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
  errorMessage?: string | null;
};
```

### `PaletteSelector.tsx`

Responsibilities:

- Display palette cards.
- Show palette name, description, and swatches.
- Highlight selected palette.
- Notify parent when selection changes.

Props:

```ts
type PaletteSelectorProps = {
  palettes: ColorPalette[];
  selectedPaletteId: string;
  onPaletteChange: (paletteId: string) => void;
  disabled?: boolean;
};
```

### `ImagePreviewGrid.tsx`

Responsibilities:

- Show original image preview.
- Show recolored image preview.
- Show placeholder states before upload/processing.
- Show processing indicator when image is being recolored.
- Show download button when processed image exists.

Props:

```ts
type ImagePreviewGridProps = {
  originalImageUrl: string | null;
  processedImageUrl: string | null;
  isProcessing: boolean;
  selectedPaletteName: string;
  onDownload: () => void;
};
```

## 15. Core Utility Functions

### `lib/fileValidation.ts`

Suggested constants:

```ts
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp'
];
```

Suggested function:

```ts
export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Please upload a PNG, JPEG, or WEBP image.';
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return 'Please upload an image smaller than 10 MB.';
  }

  return null;
}
```

### `lib/imageProcessing.ts`

This file should contain all image recoloring logic.

Recommended exported function:

```ts
export async function recolorImageWithPalette(
  file: File,
  paletteColors: string[]
): Promise<Blob> {
  // Load image.
  // Draw to canvas.
  // Resize if needed.
  // Read pixels.
  // Recolor pixels.
  // Export canvas as PNG Blob.
}
```

Additional helper functions:

```ts
function hexToRgb(hex: string): { r: number; g: number; b: number };

function getLuminance(r: number, g: number, b: number): number;

function sortPaletteByLuminance(colors: string[]): RGBColor[];

function interpolateColor(
  colorA: RGBColor,
  colorB: RGBColor,
  t: number
): RGBColor;

function getCanvasDimensions(
  width: number,
  height: number,
  maxDimension: number
): { width: number; height: number };
```

### Canvas Export

Use PNG for output to preserve quality and transparency.

```ts
const blob = await new Promise<Blob>((resolve, reject) => {
  canvas.toBlob((result) => {
    if (!result) {
      reject(new Error('Failed to export image.'));
      return;
    }
    resolve(result);
  }, 'image/png');
});
```

## 16. Browser-Only Implementation Details

Because Canvas, File, Image, Blob, and Object URLs are browser APIs, the recoloring logic should run only in client components or functions called from client components.

Do not call image-processing functions during server rendering.

The main page should use:

```tsx
'use client';
```

Do not create an API route for recoloring.

## 17. Download Implementation

Use an anchor element programmatically.

```ts
function downloadImage(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
```

Filename should use the selected palette slug:

```ts
const filename = `recolored-${selectedPalette.slug}.png`;
```

## 18. Error Handling

Show clear user-facing messages for the following cases:

### Invalid File Type

```text
Please upload a PNG, JPEG, or WEBP image.
```

### File Too Large

```text
Please upload an image smaller than 10 MB.
```

### Image Load Failure

```text
We could not load this image. Please try a different file.
```

### Processing Failure

```text
Something went wrong while recoloring the image. Please try again.
```

### No Image Before Download

The download button should be disabled when no processed image exists.

Do not show a browser alert for normal errors. Display errors inside the UI.

## 19. Loading and Processing States

When processing is active:

- Disable upload controls only if necessary.
- Disable palette selection to prevent overlapping operations, or debounce/restart processing safely.
- Show a spinner or progress text.
- Show text such as:

```text
Applying palette...
```

Since processing should usually be fast, a simple loading state is enough.

## 20. Accessibility Requirements

The app should be accessible enough for normal use.

Requirements:

- Upload input must have a visible label or accessible `aria-label`.
- Palette cards should be keyboard selectable.
- Selected palette should not be indicated by color alone; include text or border/icon state.
- Buttons should have clear labels.
- Error messages should be readable by screen readers.
- Use sufficient contrast in the dark theme.
- Drag-and-drop should not be the only upload method; include a clickable file picker.

## 21. Responsive Behavior

Use MUI responsive utilities or normal CSS media queries.

Recommended breakpoints:

- Mobile: under `600px`.
- Tablet: `600px` to `900px`.
- Desktop: above `900px`.

Behavior:

- Mobile: single-column layout.
- Tablet/Desktop: preview cards can appear in two columns.
- Palette cards should wrap naturally.

## 22. MUI Theme Setup

Use MUI's theme provider in `app/layout.tsx` or a dedicated provider component.

Because MUI theme providers are client-side, create a small provider component if needed.

Suggested structure:

```text
app/
  layout.tsx
  providers.tsx
```

`providers.tsx`:

```tsx
'use client';

import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from '@/theme/theme';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
```

`layout.tsx`:

```tsx
import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Image Palette Recolor',
  description: 'Upload an image, apply a color palette, and download the recolored result.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

## 23. Suggested UI Copy

### Header

```text
Image Palette Recolor
Transform your image with curated color palettes.
```

### Description

```text
Upload a PNG, JPEG, or WEBP image, choose a palette, and download a recolored version in seconds.
```

### Privacy Notice

```text
Private by design: your image is processed locally in your browser. It is never uploaded or saved.
```

### Upload Area

```text
Drop your image here or click to choose a file.
PNG, JPEG, or WEBP up to 10 MB.
```

### Empty Original Preview

```text
Your uploaded image will appear here.
```

### Empty Recolored Preview

```text
Your recolored image will appear here after you select a palette.
```

### Download Button

```text
Download Recolored Image
```

## 24. Interaction Details

### Upload Area

The upload panel should support:

- Click to upload.
- Drag over visual state.
- Drop to upload.
- Display of selected filename.

Drag-over state can change the border color to the accent color.

### Palette Cards

Each palette card should show:

- Palette name.
- Short description.
- Five color swatches.
- Selected state.

Selected card styling:

- Accent border.
- Slightly brighter background.
- Optional check icon or `Selected` label.

### Preview Cards

Each preview card should show:

- Card title.
- Image or placeholder.
- Contained image layout using `object-fit: contain`.
- Consistent minimum height.

Do not use `next/image` for the user-selected local image. A normal `<img>` tag is simpler for object URLs.

## 25. Performance Considerations

For this simple app, Canvas processing is sufficient.

Requirements:

- Resize very large images before processing.
- Avoid processing images above the max dimension directly.
- Avoid keeping many object URLs alive.
- Revoke old processed image URLs before creating new ones.
- Avoid unnecessary reprocessing when the same palette is selected again.

Optional improvement:

- Debounce palette changes if automatic processing causes visible lag.

## 26. Security and Privacy Requirements

Strict requirements:

- Do not create image upload API routes.
- Do not send image data to analytics.
- Do not log the image file, image contents, base64 string, or Blob URL.
- Do not store the image in localStorage, sessionStorage, IndexedDB, cookies, or any external database.
- Do not use third-party image-processing APIs.
- Do not include external tracking scripts for this app unless explicitly required later.

Allowed temporary browser-only storage:

- React component state.
- Object URLs.
- Canvas memory.
- In-memory Blob used for download.

## 27. Acceptance Criteria

The project is complete when all of the following are true:

- The app runs as a single-page Next.js website.
- The UI uses a dark theme.
- Tailwind CSS is not installed or used.
- User can upload a PNG, JPEG, or WEBP image.
- Invalid file types show a friendly error.
- Files larger than 10 MB show a friendly error.
- User can select from five predefined palettes.
- The selected palette is clearly highlighted.
- The original image preview is visible after upload.
- The recolored image preview is visible after processing.
- Download button is disabled until a recolored image exists.
- User can download the recolored image as PNG.
- Uploaded images are not sent to any server or external service.
- There are no API routes for image processing.
- Large images are resized to a safe max dimension before processing.
- Old object URLs are revoked when replaced.
- The app works on desktop and mobile screen sizes.
- The app shows clear instructions and privacy messaging.

## 28. Suggested Build Steps for Agents

1. Create a new Next.js TypeScript project.
2. Install MUI dependencies.
3. Remove any Tailwind setup if the starter includes it.
4. Add the MUI theme and provider.
5. Create palette definitions in `lib/palettes.ts`.
6. Create file validation helpers in `lib/fileValidation.ts`.
7. Create image recoloring helpers in `lib/imageProcessing.ts`.
8. Build the main page state and layout in `app/page.tsx`.
9. Build the upload panel.
10. Build the palette selector.
11. Build the preview and download section.
12. Add responsive styling.
13. Manually verify with PNG, JPEG, and WEBP files.
14. Manually verify invalid file type and oversized file behavior.
15. Confirm there are no upload API routes or external image requests.

## 29. Manual QA Checklist

Use this checklist before considering the project done:

- Upload a valid PNG image.
- Upload a valid JPEG image.
- Upload a valid WEBP image.
- Try uploading a non-image file.
- Try uploading a file over 10 MB.
- Select each of the five palettes.
- Confirm the recolored image updates when palette changes.
- Confirm the download file is a PNG.
- Confirm transparent PNGs keep transparency.
- Confirm very large images do not freeze the page.
- Confirm mobile layout is usable.
- Confirm the app does not send image data over the network.
- Confirm no image data is stored in localStorage, sessionStorage, IndexedDB, or cookies.

## 30. Final Implementation Notes

Keep the implementation simple. This app does not need a backend, database, authentication, or advanced state management. The most important parts are:

- Clear upload flow.
- Reliable client-side canvas recoloring.
- Strong privacy guarantee.
- Simple dark UI.
- Easy download experience.

The application should feel polished but remain small and easy to maintain.
