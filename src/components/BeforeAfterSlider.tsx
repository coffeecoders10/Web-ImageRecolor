"use client";

import { useCallback, useRef, useState } from "react";
import UnfoldMoreRoundedIcon from "@mui/icons-material/UnfoldMoreRounded";
import styles from "./BeforeAfterSlider.module.css";

interface BeforeAfterSliderProps {
  showComparison: boolean;
  aspectWidth: number;
  aspectHeight: number;
  originalCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  processedCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export function BeforeAfterSlider({
  showComparison,
  aspectWidth,
  aspectHeight,
  originalCanvasRef,
  processedCanvasRef,
}: BeforeAfterSliderProps) {
  const [dividerPercent, setDividerPercent] = useState(50);
  const frameRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    const percent = ((clientX - rect.left) / rect.width) * 100;
    setDividerPercent(Math.min(100, Math.max(0, percent)));
  }, []);

  const handlePointerDown = (event: React.PointerEvent) => {
    draggingRef.current = true;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    updateFromClientX(event.clientX);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!draggingRef.current) return;
    updateFromClientX(event.clientX);
  };

  const handlePointerUp = (event: React.PointerEvent) => {
    draggingRef.current = false;
    (event.target as HTMLElement).releasePointerCapture(event.pointerId);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setDividerPercent((prev) => Math.max(0, prev - 5));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setDividerPercent((prev) => Math.min(100, prev + 5));
    } else if (event.key === "Home") {
      event.preventDefault();
      setDividerPercent(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setDividerPercent(100);
    }
  };

  const aspectRatio = aspectWidth && aspectHeight ? `${aspectWidth} / ${aspectHeight}` : undefined;

  return (
    <div className={styles.stage}>
      <div
        ref={frameRef}
        className={styles.imageFrame}
        style={{ aspectRatio, width: "100%", height: "100%" }}
      >
        <canvas ref={originalCanvasRef} className={styles.canvas} />

        {showComparison && (
          <>
            <div className={styles.label + " " + styles.labelBefore} aria-hidden="true">
              Before
            </div>
            <div className={styles.label + " " + styles.labelAfter} aria-hidden="true">
              After
            </div>
            <div
              className={styles.processedLayer}
              style={{ width: `${dividerPercent}%` }}
            >
              <canvas ref={processedCanvasRef} className={styles.canvas} />
            </div>
            <div
              className={styles.divider}
              style={{ left: `${dividerPercent}%` }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              <div
                role="slider"
                tabIndex={0}
                aria-label="Before and after comparison divider"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(dividerPercent)}
                className={styles.handle}
                onKeyDown={handleKeyDown}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
              >
                <UnfoldMoreRoundedIcon
                  fontSize="small"
                  sx={{ transform: "rotate(90deg)" }}
                />
              </div>
            </div>
          </>
        )}

        {!showComparison && (
          <div className={styles.processedLayer} style={{ width: "100%" }}>
            <canvas ref={processedCanvasRef} className={styles.canvas} />
          </div>
        )}
      </div>
    </div>
  );
}
