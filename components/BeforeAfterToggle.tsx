import styles from "./BeforeAfterToggle.module.css";

interface BeforeAfterToggleProps {
  showBefore: boolean;
  onChange: (showBefore: boolean) => void;
  disabled?: boolean;
}

export default function BeforeAfterToggle({ showBefore, onChange, disabled }: BeforeAfterToggleProps) {
  return (
    <div className={styles.toggle} role="group" aria-label="Before and after toggle">
      <button
        type="button"
        className={`${styles.option} ${showBefore ? styles.active : ""}`}
        onClick={() => onChange(true)}
        disabled={disabled}
      >
        Before
      </button>
      <button
        type="button"
        className={`${styles.option} ${!showBefore ? styles.active : ""}`}
        onClick={() => onChange(false)}
        disabled={disabled}
      >
        After
      </button>
    </div>
  );
}
