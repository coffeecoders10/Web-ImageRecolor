import { AppHeader } from "@/components/AppHeader";
import { ColorGradeWorkspace } from "@/components/ColorGradeWorkspace";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <AppHeader />
      <main className={styles.main}>
        <ColorGradeWorkspace />
      </main>
    </div>
  );
}
