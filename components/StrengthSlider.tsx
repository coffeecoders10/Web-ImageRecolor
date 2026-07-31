import styles from "./StrengthSlider.module.css";

interface StrengthSliderProps {
  value: number; // 0-100
  onChange: (value: number) => void;
  disabled?: boolean;
}

export default function StrengthSlider({ value, onChange, disabled }: StrengthSliderProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.headerRow}>
        <span className={styles.label}>Strength</span>
        <span className={styles.value}>{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className={styles.slider}
        aria-label="Recoloring strength"
      />
    </div>
  );
}
