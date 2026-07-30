"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { presets, getPresetById } from "@/data/presets";
import type { WorkspaceState } from "@/types/colorGrade";
import { decodeImageFile } from "@/lib/image/decodeImage";
import { renderExportCanvas } from "@/lib/image/renderExport";
import { buildDownloadFilename, canvasToPngBlob, triggerBlobDownload } from "@/lib/image/createDownload";
import { UploadDropzone } from "./UploadDropzone";
import { ImageViewport } from "./ImageViewport";
import { PresetGrid } from "./PresetGrid";
import { StrengthControl } from "./StrengthControl";
import { DownloadButton } from "./DownloadButton";
import { StatusMessage } from "./StatusMessage";
import styles from "./ColorGradeWorkspace.module.css";

const DEFAULT_PRESET_ID = presets[0].preset.id;

function initialState(): WorkspaceState {
  return {
    sourceFile: null,
    sourceBitmap: null,
    sourcePreviewUrl: null,
    selectedPresetId: DEFAULT_PRESET_ID,
    strength: Math.round(presets[0].preset.defaultStrength * 100),
    status: "empty",
    errorMessage: null,
  };
}

export function ColorGradeWorkspace() {
  const [state, setState] = useState<WorkspaceState>(initialState);
  const [isExporting, setIsExporting] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const selectedPreset = getPresetById(state.selectedPresetId) ?? presets[0];

  const cleanupResources = useCallback((current: WorkspaceState) => {
    if (current.sourcePreviewUrl) URL.revokeObjectURL(current.sourcePreviewUrl);
    current.sourceBitmap?.close();
  }, []);

  useEffect(() => {
    return () => {
      cleanupResources(state);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadFile = useCallback(
    async (file: File) => {
      setState((prev) => {
        cleanupResources(prev);
        return {
          ...prev,
          sourceFile: null,
          sourceBitmap: null,
          sourcePreviewUrl: null,
          status: "decoding",
          errorMessage: null,
        };
      });

      try {
        const { bitmap, previewUrl } = await decodeImageFile(file);
        setState((prev) => ({
          ...prev,
          sourceFile: file,
          sourceBitmap: bitmap,
          sourcePreviewUrl: previewUrl,
          status: "ready",
          errorMessage: null,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          sourceFile: null,
          sourceBitmap: null,
          sourcePreviewUrl: null,
          status: "error",
          errorMessage: error instanceof Error ? error.message : "This image could not be loaded.",
        }));
      }
    },
    [cleanupResources]
  );

  const handlePresetSelect = useCallback((id: string) => {
    const preset = getPresetById(id);
    if (!preset) return;
    setState((prev) => ({
      ...prev,
      selectedPresetId: id,
      strength: Math.round(preset.preset.defaultStrength * 100),
    }));
  }, []);

  const handleStrengthChange = useCallback((value: number) => {
    setState((prev) => ({ ...prev, strength: value }));
  }, []);

  const handleReset = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedPresetId: DEFAULT_PRESET_ID,
      strength: Math.round(presets[0].preset.defaultStrength * 100),
    }));
  }, []);

  const handleClear = useCallback(() => {
    setState((prev) => {
      cleanupResources(prev);
      return initialState();
    });
  }, [cleanupResources]);

  const handleReplaceClick = useCallback(() => {
    replaceInputRef.current?.click();
  }, []);

  const handleDownload = useCallback(async () => {
    if (!state.sourceBitmap || !state.sourceFile) return;

    setIsExporting(true);
    try {
      const canvas = renderExportCanvas(state.sourceBitmap, selectedPreset, state.strength / 100);
      const blob = await canvasToPngBlob(canvas);
      const filename = buildDownloadFilename(state.sourceFile.name, selectedPreset.preset.name);
      triggerBlobDownload(blob, filename);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        status: "error",
        errorMessage:
          error instanceof Error ? error.message : "Could not export the processed image.",
      }));
    } finally {
      setIsExporting(false);
    }
  }, [state.sourceBitmap, state.sourceFile, state.strength, selectedPreset]);

  const hasImage = Boolean(state.sourceBitmap) && state.status !== "decoding";

  return (
    <div className={styles.workspace}>
      <div className={styles.main}>
        <div className={styles.previewColumn}>
          {!hasImage ? (
            <div style={{ position: "relative", width: "100%", display: "flex" }}>
              <UploadDropzone onFileSelected={loadFile} />
              <StatusMessage status={state.status} errorMessage={state.errorMessage} />
            </div>
          ) : (
            <ImageViewport
              bitmap={state.sourceBitmap!}
              preset={selectedPreset}
              strength={state.strength}
              status={isRendering ? "rendering" : state.status}
              errorMessage={state.errorMessage}
              onReplace={handleReplaceClick}
              onReset={handleReset}
              onClear={handleClear}
              onRenderingChange={setIsRendering}
            />
          )}
          <input
            ref={replaceInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: "none" }}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) loadFile(file);
              event.target.value = "";
            }}
          />
        </div>

        <div className={styles.controlsColumn}>
          <div className={styles.panelSection}>
            <Typography className={styles.sectionTitle} component="h2">
              Presets
            </Typography>
            <PresetGrid
              presets={presets}
              selectedPresetId={state.selectedPresetId}
              onSelect={handlePresetSelect}
            />
          </div>

          <div className={styles.panelSection}>
            <StrengthControl strength={state.strength} onChange={handleStrengthChange} />
          </div>

          <div className={styles.panelSection}>
            <Typography className={styles.presetInfoName}>{selectedPreset.preset.name}</Typography>
            <Typography className={styles.presetInfoDescription}>
              {selectedPreset.preset.description}
            </Typography>
            <div className={styles.tagRow}>
              {selectedPreset.preset.tags.slice(0, 6).map((tag) => (
                <span className={styles.tag} key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className={styles.actions}>
            <DownloadButton
              disabled={!hasImage}
              isExporting={isExporting}
              onClick={handleDownload}
            />
            <Button variant="text" color="inherit" onClick={handleClear} disabled={!hasImage}>
              Clear image
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
