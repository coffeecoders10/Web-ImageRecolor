import styles from "./ProcessingModal.module.css";

export default function ProcessingModal() {
  return (
    <div className={styles.overlay} role="status" aria-live="polite">
      <div className={styles.modal}>
        <span className={styles.spinner} aria-hidden="true" />
        <span className={styles.text}>Your image is being processed…</span>
      </div>
    </div>
  );
}
