"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./page.module.css";
import ImageUploader from "@/components/ImageUploader";
import ImagePreview from "@/components/ImagePreview";
import ExtractedPalette from "@/components/ExtractedPalette";
import PaletteSelector from "@/components/PaletteSelector";
import StrengthSlider from "@/components/StrengthSlider";
import BeforeAfterToggle from "@/components/BeforeAfterToggle";
import DownloadButton from "@/components/DownloadButton";
import { extractPalette, ExtractedColor } from "@/lib/paletteExtraction";
import { recolorImage } from "@/lib/recolorImage";
import { downloadCanvas } from "@/lib/exportImage";
import { PredefinedPalette } from "@/data/predefinedPalettes";

type AppStatus = "empty" | "loading" | "ready" | "processing" | "completed" | "error";

export default function Home() {
  const [status, setStatus] = useState<AppStatus>("empty");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalSrc, setOriginalSrc] = useState<string | null>(null);
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);

  const [sourcePalette, setSourcePalette] = useState<ExtractedColor[]>([]);
  const [selectedPalette, setSelectedPalette] = useState<PredefinedPalette | null>(null);
  const [strength, setStrength] = useState(85);

  const [resultSrc, setResultSrc] = useState<string | null>(null);
  const resultCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showBefore, setShowBefore] = useState(false);

  const processingTokenRef = useRef(0);

  const resetAll = useCallback(() => {
    setStatus("empty");
    setErrorMessage(null);
    setOriginalFile(null);
    setOriginalSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setImageEl(null);
    setSourcePalette([]);
    setSelectedPalette(null);
    setStrength(85);
    setResultSrc(null);
    resultCanvasRef.current = null;
    setShowBefore(false);
  }, []);

  const handleImageSelected = useCallback((file: File) => {
    console.log(`[page] file selected: ${file.name} (${file.type}, ${(file.size / 1024).toFixed(0)}KB)`);
    setErrorMessage(null);
    setStatus("loading");
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      console.log(`[page] image decoded: ${img.naturalWidth}x${img.naturalHeight}`);
      setOriginalFile(file);
      setOriginalSrc(url);
      setImageEl(img);
      setStatus("ready");
      try {
        const t0 = performance.now();
        const palette = extractPalette(img, 8);
        console.log(`[page] initial extractPalette: ${(performance.now() - t0).toFixed(0)}ms, ${palette.length} colors`);
        setSourcePalette(palette);
      } catch (err) {
        console.error("[page] extractPalette failed", err);
        setSourcePalette([]);
      }
    };
    img.onerror = (err) => {
      console.error("[page] image decode failed", err);
      URL.revokeObjectURL(url);
      setStatus("error");
      setErrorMessage("Failed to decode this image. Please try a different file.");
    };
    img.src = url;
  }, []);

  const handleError = useCallback((message: string) => {
    setStatus("error");
    setErrorMessage(message);
  }, []);

  const runRecolor = useCallback(
    async (palette: PredefinedPalette, strengthValue: number) => {
      if (!imageEl) {
        console.warn("[page] runRecolor called with no imageEl, skipping");
        return;
      }
      const token = ++processingTokenRef.current;
      console.log(`[page] runRecolor start (token=${token}) palette=${palette.id} strength=${strengthValue}`);
      setStatus("processing");
      setErrorMessage(null);
      const t0 = performance.now();
      try {
        const result = await recolorImage(imageEl, palette, {
          strength: strengthValue / 100,
        });
        console.log(`[page] runRecolor (token=${token}) recolorImage resolved in ${(performance.now() - t0).toFixed(0)}ms`);
        if (processingTokenRef.current !== token) {
          console.log(`[page] runRecolor (token=${token}) superseded by token=${processingTokenRef.current}, discarding`);
          return;
        }
        resultCanvasRef.current = result.canvas;
        setResultSrc(result.canvas.toDataURL());
        setStatus("completed");
        setShowBefore(false);
        console.log(`[page] runRecolor (token=${token}) completed, total ${(performance.now() - t0).toFixed(0)}ms`);
      } catch (err) {
        console.error(`[page] runRecolor (token=${token}) failed`, err);
        if (processingTokenRef.current !== token) return;
        setStatus("error");
        setErrorMessage("Processing failed. Your browser may be low on memory — try a smaller image.");
      }
    },
    [imageEl]
  );

  const handlePaletteSelect = useCallback(
    (palette: PredefinedPalette) => {
      console.log(`[page] palette selected: ${palette.id}`);
      setSelectedPalette(palette);
      void runRecolor(palette, strength);
    },
    [runRecolor, strength]
  );

  // Debounce re-processing while the user drags the strength slider.
  useEffect(() => {
    if (!selectedPalette) return;
    const handle = setTimeout(() => {
      void runRecolor(selectedPalette, strength);
    }, 200);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strength]);

  const handleDownload = useCallback(() => {
    if (!resultCanvasRef.current || !originalFile || !selectedPalette) return;
    downloadCanvas(resultCanvasRef.current, originalFile.name, selectedPalette.name);
  }, [originalFile, selectedPalette]);

  const isLoadingImage = status === "loading";
  const isProcessing = status === "processing";
  const hasResult = status === "completed" && resultSrc;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.logoMark} aria-hidden="true" />
          <span className={styles.brandName}>Palette Swap</span>
        </div>
        <p className={styles.instruction}>
          Upload an image, choose a palette, and download your recolored version.
        </p>
      </header>

      {errorMessage && (
        <div className={styles.errorBanner} role="alert">
          {errorMessage}
        </div>
      )}

      <main className={styles.workspace}>
        <section className={styles.column} aria-label="Upload">
          <h2 className={styles.columnTitle}>Upload</h2>
          {isLoadingImage ? (
            <div className={styles.loadingPane} role="status" aria-live="polite">
              <span className={styles.spinner} aria-hidden="true" />
              <span>Reading image…</span>
            </div>
          ) : !originalSrc ? (
            <ImageUploader onImageSelected={handleImageSelected} onError={handleError} />
          ) : (
            <>
              <ImagePreview src={originalSrc} alt="Original upload" />
              <ExtractedPalette colors={sourcePalette} />
            </>
          )}
        </section>

        <section className={styles.column} aria-label="Palette selection">
          <h2 className={styles.columnTitle}>Choose a Palette</h2>
          {originalSrc ? (
            <>
              <PaletteSelector
                selectedId={selectedPalette?.id ?? null}
                onSelect={handlePaletteSelect}
                disabled={isProcessing}
              />
              <StrengthSlider value={strength} onChange={setStrength} disabled={isProcessing || !selectedPalette} />
            </>
          ) : (
            <div className={styles.emptyHint}>
              <ol className={styles.stepList}>
                <li>Upload</li>
                <li>Select Palette</li>
                <li>Download</li>
              </ol>
            </div>
          )}
        </section>

        <section className={styles.column} aria-label="Result">
          <h2 className={styles.columnTitle}>Result</h2>
          <div className={styles.resultFrame}>
            <ImagePreview
              src={showBefore ? originalSrc : resultSrc ?? originalSrc}
              alt={showBefore ? "Original image" : "Recolored result"}
              placeholderLabel={isProcessing ? "Rendering…" : "Result will appear here"}
            />
            {isProcessing && (
              <div className={styles.processingOverlay} role="status" aria-live="polite">
                <span className={styles.spinner} aria-hidden="true" />
                <span>Recoloring…</span>
              </div>
            )}
          </div>
          {isProcessing && <div className={styles.progressBar} aria-hidden="true" />}
          {resultSrc && (
            <div className={styles.resultControls}>
              <BeforeAfterToggle showBefore={showBefore} onChange={setShowBefore} disabled={isProcessing} />
            </div>
          )}
          <DownloadButton onDownload={handleDownload} onReset={resetAll} disabled={!hasResult} />
        </section>
      </main>
    </div>
  );
}
