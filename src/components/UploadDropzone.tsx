"use client";

import { useCallback, useRef, useState } from "react";
import UploadRoundedIcon from "@mui/icons-material/UploadRounded";
import styles from "./UploadDropzone.module.css";

interface UploadDropzoneProps {
  onFileSelected: (file: File) => void;
}

const ACCEPT = "image/jpeg,image/png,image/webp";

export function UploadDropzone({ onFileSelected }: UploadDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      const file = fileList?.[0];
      if (file) onFileSelected(file);
    },
    [onFileSelected]
  );

  const handleDragEnter = (event: React.DragEvent) => {
    event.preventDefault();
    dragCounter.current += 1;
    setIsDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragActive(false);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    dragCounter.current = 0;
    setIsDragActive(false);
    handleFiles(event.dataTransfer.files);
  };

  const openFilePicker = () => inputRef.current?.click();

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFilePicker();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload an image. Drop a file here or press Enter to browse."
      className={`${styles.dropzone} ${isDragActive ? styles.dropzoneActive : ""}`}
      onClick={openFilePicker}
      onKeyDown={handleKeyDown}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className={styles.iconWrap}>
        <UploadRoundedIcon fontSize="medium" />
      </div>
      <div className={styles.title}>Drop an image here or browse</div>
      <div className={styles.subtitle}>
        Supports JPEG, PNG, and WebP up to 30MB and 24 megapixels. Your image never
        leaves this device.
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className={styles.hiddenInput}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
