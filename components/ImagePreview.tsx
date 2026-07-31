import styles from "./ImagePreview.module.css";

interface ImagePreviewProps {
  src: string | null;
  alt: string;
  placeholderLabel?: string;
}

export default function ImagePreview({ src, alt, placeholderLabel }: ImagePreviewProps) {
  return (
    <div className={styles.frame}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className={styles.image} />
      ) : (
        <div className={styles.placeholder}>
          <span>{placeholderLabel ?? "No image yet"}</span>
        </div>
      )}
    </div>
  );
}
