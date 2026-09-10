"use client";

import Link from "next/link";
import styles from "./print.module.css";

export default function PrintToolbar({ estimateId, showDetail }) {
  return (
    <div className={`${styles.toolbar} no-print`}>
      <Link href={`/estimates/${estimateId}`} className={styles.toolbarLink}>
        ← 詳細へ戻る
      </Link>
      <Link
        href={`/estimates/${estimateId}/print${showDetail ? "" : "?detail=1"}`}
        className={styles.toolbarLink}
      >
        {showDetail ? "加工費の内訳を隠す" : "加工費の内訳を表示"}
      </Link>
      <button
        type="button"
        className={styles.printButton}
        onClick={() => window.print()}
      >
        印刷 / PDF保存
      </button>
    </div>
  );
}
