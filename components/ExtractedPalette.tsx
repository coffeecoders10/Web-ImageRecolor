import { ExtractedColor } from "@/lib/paletteExtraction";
import { rgbToHex } from "@/lib/colorConversion";
import styles from "./ExtractedPalette.module.css";

interface ExtractedPaletteProps {
  colors: ExtractedColor[];
}

export default function ExtractedPalette({ colors }: ExtractedPaletteProps) {
  if (colors.length === 0) return null;

  return (
    <div className={styles.wrapper}>
      <span className={styles.label}>Source palette</span>
      <div className={styles.swatchRow}>
        {colors.map((color, i) => (
          <div
            key={i}
            className={styles.swatch}
            style={{
              width: `${Math.max(color.percentage * 100, 4)}%`,
              backgroundColor: rgbToHex(color.rgb),
            }}
            title={`${rgbToHex(color.rgb)} — ${Math.round(color.percentage * 100)}%`}
          />
        ))}
      </div>
    </div>
  );
}
