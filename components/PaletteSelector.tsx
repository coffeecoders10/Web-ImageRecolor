import { predefinedPalettes, PredefinedPalette } from "@/data/predefinedPalettes";
import styles from "./PaletteSelector.module.css";

interface PaletteSelectorProps {
  selectedId: string | null;
  onSelect: (palette: PredefinedPalette) => void;
  disabled?: boolean;
}

export default function PaletteSelector({ selectedId, onSelect, disabled }: PaletteSelectorProps) {
  return (
    <div className={styles.grid}>
      {predefinedPalettes.map((palette) => {
        const isActive = palette.id === selectedId;
        return (
          <button
            key={palette.id}
            type="button"
            className={`${styles.option} ${isActive ? styles.active : ""}`}
            onClick={() => onSelect(palette)}
            disabled={disabled}
            aria-pressed={isActive}
          >
            <div className={styles.swatches}>
              {palette.colors.map((c, i) => (
                <div key={i} className={styles.swatch} style={{ backgroundColor: c.hex }} />
              ))}
            </div>
            <div className={styles.info}>
              <span className={styles.name}>{palette.name}</span>
              <span className={styles.description}>{palette.description}</span>
            </div>
            {isActive && (
              <svg
                className={styles.checkmark}
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden="true"
              >
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}
