"use client";

import { useCallback, useRef, useState } from "react";
import styles from "./ImageUploader.module.css";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

interface ImageUploaderProps {
  onImageSelected: (file: File) => void;
  onError: (message: string) => void;
}

export default function ImageUploader({ onImageSelected, onError }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndEmit = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      if (!ACCEPTED_TYPES.includes(file.type)) {
        onError("Unsupported file type. Please upload a PNG, JPG, JPEG, or WebP image.");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        onError("Image is too large. Please upload a file under 25MB.");
        return;
      }
      onImageSelected(file);
    },
    [onImageSelected, onError]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      validateAndEmit(e.dataTransfer.files[0]);
    },
    [validateAndEmit]
  );

  return (
    <div
      className={`${styles.dropzone} ${isDragging ? styles.dragging : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className={styles.hiddenInput}
        onChange={(e) => validateAndEmit(e.target.files?.[0])}
      />
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <path d="M12 16V4M12 4l-4 4M12 4l4 4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className={styles.primaryText}>Drag & drop an image</p>
      <p className={styles.secondaryText}>or</p>
      <button type="button" className={styles.chooseButton}>
        Choose Image
      </button>
      <p className={styles.formats}>PNG, JPG, JPEG, WebP</p>
    </div>
  );
}
