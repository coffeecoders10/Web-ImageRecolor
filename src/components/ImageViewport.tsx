"use client";

import { useEffect, useRef, useState } from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Divider from "@mui/material/Divider";
import ToggleButton from "@mui/material/ToggleButton";
import PublishRoundedIcon from "@mui/icons-material/PublishRounded";
import CompareRoundedIcon from "@mui/icons-material/CompareRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import type { ColorGradePreset } from "@/types/colorGrade";
import { ColorGradeEngine } from "@/lib/grading/ColorGradeEngine";
import { createPreviewSourceCanvas } from "@/lib/image/renderPreview";
import { BeforeAfterSlider } from "./BeforeAfterSlider";
import { StatusMessage } from "./StatusMessage";
import styles from "./ImageViewport.module.css";
import type { WorkspaceStatus } from "@/types/colorGrade";

interface ImageViewportProps {
  bitmap: ImageBitmap;
  preset: ColorGradePreset;
  strength: number; // 0..100
  status: WorkspaceStatus;
  errorMessage: string | null;
  onReplace: () => void;
  onReset: () => void;
  onClear: () => void;
  onRenderingChange: (isRendering: boolean) => void;
}

const RENDER_DEBOUNCE_MS = 45;

export function ImageViewport({
  bitmap,
  preset,
  strength,
  status,
  errorMessage,
  onReplace,
  onReset,
  onClear,
  onRenderingChange,
}: ImageViewportProps) {
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const processedCanvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ColorGradeEngine | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const renderTokenRef = useRef(0);

  const [showComparison, setShowComparison] = useState(true);

  // Draw the always-visible original image and (re)initialize the WebGL
  // engine whenever the source bitmap changes.
  useEffect(() => {
    const originalCanvas = originalCanvasRef.current;
    const processedCanvas = processedCanvasRef.current;
    if (!originalCanvas || !processedCanvas) return;

    originalCanvas.width = bitmap.width;
    originalCanvas.height = bitmap.height;
    const ctx = originalCanvas.getContext("2d");
    ctx?.drawImage(bitmap, 0, 0);

    const previewSource = createPreviewSourceCanvas(bitmap);

    const engine = new ColorGradeEngine(processedCanvas);
    engine.setSourceImage(previewSource);
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [bitmap]);

  // Debounced re-render on preset/strength change.
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    const token = ++renderTokenRef.current;
    onRenderingChange(true);

    debounceTimer.current = setTimeout(() => {
      if (renderTokenRef.current !== token) return;
      const engine = engineRef.current;
      if (engine) {
        engine.render(preset, strength / 100);
      }
      onRenderingChange(false);
    }, RENDER_DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, strength]);

  return (
    <div className={styles.viewport}>
      <div className={styles.toolbar}>
        <Tooltip title="Replace image">
          <IconButton size="small" onClick={onReplace} aria-label="Replace image">
            <PublishRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title={showComparison ? "Hide before/after" : "Show before/after"}>
          <ToggleButton
            size="small"
            value="comparison"
            selected={showComparison}
            onChange={() => setShowComparison((prev) => !prev)}
            aria-label="Toggle before and after comparison"
            sx={{ border: "none", borderRadius: "8px", ml: 0.5 }}
          >
            <CompareRoundedIcon fontSize="small" />
          </ToggleButton>
        </Tooltip>

        <Tooltip title="Reset adjustments">
          <IconButton size="small" onClick={onReset} aria-label="Reset adjustments">
            <RestartAltRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <div className={styles.spacer} />

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />

        <Tooltip title="Clear image">
          <IconButton size="small" onClick={onClear} aria-label="Clear image">
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </div>

      <div className={styles.stageArea}>
        <BeforeAfterSlider
          showComparison={showComparison}
          aspectWidth={bitmap.width}
          aspectHeight={bitmap.height}
          originalCanvasRef={originalCanvasRef}
          processedCanvasRef={processedCanvasRef}
        />
        <StatusMessage status={status} errorMessage={errorMessage} />
      </div>
    </div>
  );
}
