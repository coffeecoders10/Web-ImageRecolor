"use client";

import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import styles from "./AppHeader.module.css";

export function AppHeader() {
  return (
    <header className={styles.header}>
      <span className={styles.productName}>GradeLab</span>
      <span className={styles.divider} aria-hidden="true" />
      <span className={styles.label}>Local browser processing</span>
      <div className={styles.spacer} />
      <div className={styles.privacyBadge}>
        <ShieldRoundedIcon sx={{ fontSize: 15 }} />
        Your image never leaves this device
      </div>
    </header>
  );
}
