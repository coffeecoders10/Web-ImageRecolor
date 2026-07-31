import styles from "./DownloadButton.module.css";

interface DownloadButtonProps {
  onDownload: () => void;
  onReset: () => void;
  disabled?: boolean;
}

export default function DownloadButton({ onDownload, onReset, disabled }: DownloadButtonProps) {
  return (
    <div className={styles.row}>
      <button type="button" className={styles.download} onClick={onDownload} disabled={disabled}>
        Download Image
      </button>
      <button type="button" className={styles.reset} onClick={onReset}>
        Reset
      </button>
    </div>
  );
}
