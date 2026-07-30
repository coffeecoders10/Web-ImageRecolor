# Next.js Browser Color-Grading App Specification

## 1. Project Goal

Build a polished, single-page Next.js application where a user can:

1. Upload a local image.
2. Select one of five predefined color-grade presets.
3. Preview the grade immediately.
4. adjust the preset strength.
5. Compare the original and graded versions.
6. Download the processed image.

The complete image-processing workflow must run inside the browser. The image must never be uploaded to a server, written to a database, or sent to an external image-processing API.

## 2. Scope

### Included

- Single-page interface.
- Local JPEG, PNG, and WebP upload.
- Five predefined color-grade presets.
- Real-time preview.
- Preset-strength control.
- Before/after comparison.
- Full-resolution PNG export.
- Dark neutral design built with MUI and CSS Modules.
- Responsive desktop and mobile layouts.

### Excluded

- Authentication.
- Database storage.
- Image history or cloud projects.
- User-created presets.
- Manual professional grading controls.
- Batch processing.
- Server-side rendering of uploaded images.
- True subject, sky, vegetation, or background segmentation in the initial version.

## 3. Recommended Stack

- Next.js App Router
- TypeScript
- React
- Material UI for controls, dialogs, tooltips, cards, buttons, sliders, and accessible interaction states
- CSS Modules or MUI `sx` styling
- WebGL2 fragment shaders for image processing
- Canvas API for image decoding, preview composition, and export

Do not use Tailwind CSS.

Do not implement the grade using CSS `filter`. CSS filters are too limited and cannot generate a correctly processed downloadable image. The final pixels must be rendered into a canvas.

## 4. Single-Page Layout

The desktop page should fit inside `100dvh` at common laptop resolutions and use a maximum content width of approximately 1440px.

### Header

A compact 52–60px header containing:

- Product name, such as **GradeLab**
- Small label: **Local browser processing**
- Optional privacy indicator: **Your image never leaves this device**

### Main Workspace

Use a two-column grid:

- Left preview area: `minmax(0, 1fr)`
- Right controls panel: approximately `340px`
- Gap: `16px`
- Outer page padding: `16–24px`

### Preview Area

Before upload:

- Large centered drag-and-drop area
- Upload icon
- “Drop an image here or browse”
- Supported formats and recommended maximum size

After upload:

- Image centered inside a dark checkerless canvas area
- Preserve aspect ratio
- Never crop the image
- Toolbar over or above the preview:
  - Replace image
  - Before/after comparison
  - Fit-to-screen
  - Reset

Use a draggable before/after divider. Render the original image below and clip the processed canvas above it.

### Controls Panel

The right panel should contain:

1. **Presets**
   - Five compact selectable cards in a two-column grid
   - Preset name
   - Short one-line description
   - Small tonal preview derived from the preset’s shadow, midtone, and highlight wheel colors
   - Strong selected state using border, elevation, and neutral grey background changes

2. **Strength**
   - Slider from 0 to 100
   - Set to the preset’s `defaultStrength` when a new preset is selected
   - Show the current percentage

3. **Selected preset information**
   - Preset name
   - Description
   - Three to six tags

4. **Primary action**
   - Full-width **Download PNG** button
   - Disabled until a processed image is ready

5. **Secondary action**
   - Clear or reset image

On smaller screens, stack the preview above the controls and allow normal vertical scrolling.

## 5. Theme and Visual Direction

The interface must be dark, neutral, clean, and sophisticated. Do not use violet, purple, pink, neon gradients, or colorful UI accents.

Suggested tokens:

```ts
const colors = {
  page: "#0D0F10",
  surface: "#15181A",
  surfaceRaised: "#1B1F22",
  surfaceHover: "#23282C",
  selected: "#30363B",
  border: "#2B3034",
  borderStrong: "#596168",
  textPrimary: "#F1F3F4",
  textSecondary: "#9CA4AA",
  textMuted: "#717980",
  primaryButton: "#E3E6E8",
  primaryButtonText: "#101214",
  focusRing: "#B9C0C5"
};
```

Design rules:

- Use 12–16px corner radii.
- Use subtle 1px borders instead of heavy shadows.
- Keep icons thin and monochrome.
- Use a system sans-serif font stack.
- Use generous internal spacing.
- Avoid decorative gradients in the application UI.
- Use color only inside the uploaded image and tiny preset-preview indicators.
- Provide visible keyboard focus states.

## 6. Interaction Flow

1. The user opens the page and sees the upload area and preset cards.
2. The user uploads an image using drag-and-drop or the file picker.
3. The image is decoded locally with `createImageBitmap`.
4. The currently selected preset is applied automatically.
5. A processing indicator appears only while rendering.
6. Selecting another preset updates the preview immediately.
7. Moving the strength slider re-renders with a short debounce.
8. The before/after divider provides a direct comparison.
9. Clicking **Download PNG** renders the grade at the original image dimensions and downloads it.
10. Clearing the image revokes temporary object URLs and returns to the empty state.

## 7. Image-Processing Architecture

Use a WebGL2 processing pipeline. Keep the uploaded source image unchanged and render all changes into a separate canvas.

Recommended pass order:

1. Decode image and normalize orientation.
2. Convert sRGB values to linear sRGB.
3. Apply exposure, brightness, contrast, temperature, and tint.
4. Apply vibrance and global saturation.
5. Apply black point, white point, shadow lift, midtone gain, highlight compression, and roll-off.
6. Interpolate and apply the luminance curve.
7. Apply shadow, midtone, and highlight color-wheel adjustments using smooth luminance masks.
8. Convert to HSL or an equivalent perceptual representation and apply the per-color HSL adjustments.
9. Apply saturation-by-luminance.
10. Apply hue-based skin-tone protection.
11. Compress out-of-gamut colors and preserve neutral pixels.
12. Apply local contrast, clarity, and dehaze approximations.
13. Apply bloom, grain, vignette, and sharpening.
14. Convert linear RGB back to sRGB.
15. Blend the original and processed pixels using the selected strength.

The strength slider should not multiply every individual parameter. It should blend the final processed result with the original:

```ts
finalColor = mix(originalColor, processedColor, strength);
```

When a preset is selected, initialize `strength` using its `defaultStrength`.

### Preview and Export

- Preview: downscale the working image to a maximum long edge of approximately 1600px.
- Export: rerun the pipeline at the original dimensions.
- Set an initial safety limit of approximately 24 megapixels or 30MB.
- Display a helpful validation message for unsupported or oversized files.
- Export using `canvas.toBlob("image/png")`.
- Use a filename such as:
  `original-name__warm-rom-com-cinematic.png`

### Rendering Quality

- Use smooth hue-range masks so HSL changes do not create visible color bands.
- Use a deterministic noise seed for grain so it does not flicker when the UI re-renders.
- Clamp values only when required; premature clipping will destroy highlight detail.
- Perform exposure, contrast, and tone operations in linear RGB.
- Perform hue-targeted adjustments with feathered color ranges.
- Keep the unmodified original bitmap available for resetting and final-strength blending.

## 8. Semantic Rules Limitation

A preset JSON can describe rules for skin, sky, vegetation, and background, but a color preset alone cannot identify those regions.

For the initial version:

- Implement `skinToneProtection` using a feathered hue and saturation mask.
- Preserve the `semanticRules` block in the JSON schema as a future extension.
- Skip `semanticRules` unless an on-device segmentation module is explicitly added.
- Do not claim that sky, vegetation, or background detection is active when it is not.

A future version may run an entirely local segmentation model and provide masks to the WebGL pipeline. No uploaded pixels should leave the browser.

## 9. Suggested Project Structure

```text
src/
  app/
    layout.tsx
    page.tsx
    globals.css

  components/
    ColorGradeWorkspace.tsx
    UploadDropzone.tsx
    ImageViewport.tsx
    BeforeAfterSlider.tsx
    PresetGrid.tsx
    PresetCard.tsx
    StrengthControl.tsx
    DownloadButton.tsx
    StatusMessage.tsx

  data/
    presets.json

  lib/
    image/
      decodeImage.ts
      validateImage.ts
      createDownload.ts
      renderPreview.ts
      renderExport.ts
    grading/
      ColorGradeEngine.ts
      applyPreset.ts
      colorMath.ts
      curveInterpolation.ts
      shaders/
        basic.frag
        tone.frag
        color-wheels.frag
        hsl.frag
        local-contrast.frag
        bloom.frag
        finishing.frag

  theme/
    theme.ts

  types/
    colorGrade.ts
```

## 10. Main State

The page only needs local React state:

```ts
type WorkspaceState = {
  sourceFile: File | null;
  sourceBitmap: ImageBitmap | null;
  sourcePreviewUrl: string | null;
  selectedPresetId: string;
  strength: number;
  status: "empty" | "decoding" | "rendering" | "ready" | "error";
  errorMessage: string | null;
};
```

The processed preview should stay in the canvas rather than being stored as a large React state value.

## 11. Component Responsibilities

- `UploadDropzone`: validates files and starts decoding.
- `ImageViewport`: owns the original and processed canvases.
- `BeforeAfterSlider`: controls clipping between the two canvases.
- `PresetGrid`: renders the five options and handles selection.
- `StrengthControl`: changes the final blend amount.
- `ColorGradeEngine`: creates WebGL programs, textures, framebuffers, and render passes.
- `DownloadButton`: triggers a full-resolution render and creates a temporary download URL.
- `StatusMessage`: displays decoding, rendering, and validation states.

## 12. Performance and Cleanup

- Do not place raw pixel arrays in React state.
- Reuse WebGL programs, textures, and framebuffers.
- Debounce slider rendering by roughly 30–60ms.
- Cancel stale render requests when a new preset is selected rapidly.
- Revoke every `URL.createObjectURL` URL during replacement, clearing, and component unmount.
- Close old `ImageBitmap` objects.
- Keep expensive image calculations outside React component render functions.
- Disable the download button while the full-resolution export is running.

## 13. Accessibility

- Upload must work by keyboard and pointer.
- Every icon-only button needs an accessible label and tooltip.
- Preset cards should behave like a radio group.
- The strength slider needs a visible label and numeric value.
- Processing and error messages should use an `aria-live` region.
- Text and controls should meet normal contrast requirements.
- Do not rely on color alone to show the selected preset.

## 14. Acceptance Criteria

The implementation is complete when:

- A JPEG, PNG, or WebP can be uploaded without any network request containing the image.
- All five presets create visibly distinct results.
- Switching presets updates the preview.
- Strength can be changed from 0% to 100%.
- At 0%, the preview matches the original.
- A before/after comparison is available.
- The final PNG downloads successfully at the original dimensions.
- The filename includes the selected preset.
- Invalid and oversized files produce a clear message.
- Temporary browser resources are cleaned up.
- The desktop workspace fits above the fold at common laptop sizes.
- The mobile layout remains usable and scrollable.
- No Tailwind CSS is used.
- No violet, purple, or pink UI colors are used.

## 15. Preset Data

Place the accompanying `presets.json` file at:

```text
src/data/presets.json
```

It contains these five complete presets:

1. Warm Rom-Com Cinematic
2. Cool Urban Noir
3. Golden Hour Film
4. Muted Indie Film
5. Clean Editorial Neutral
