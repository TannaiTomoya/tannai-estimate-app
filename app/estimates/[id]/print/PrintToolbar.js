"use client";

import { useState } from "react";
import Link from "next/link";
import { externalBrowserUrl } from "@/lib/in-app-browser";
import styles from "./print.module.css";

export default function PrintToolbar({ estimateId, showDetail, inApp }) {
  const [printHelp, setPrintHelp] = useState(false);

  const pdfHref = `/estimates/${estimateId}/pdf${showDetail ? "?detail=1" : ""}`;

  function handlePrint() {
    if (typeof window.print !== "function") {
      setPrintHelp(true);
      return;
    }
    window.print();
    // iOS の一部ブラウザは print() を無視するため、手順も併せて表示する
    setPrintHelp(true);
  }

  return (
    <div className="no-print">
      <div className={styles.toolbar}>
        <Link href={`/estimates/${estimateId}`} className={styles.toolbarLink}>
          ← 詳細へ戻る
        </Link>
        <Link
          href={`/estimates/${estimateId}/print${showDetail ? "" : "?detail=1"}`}
          className={styles.toolbarLink}
        >
          {showDetail ? "加工費の内訳を隠す" : "加工費の内訳を表示"}
        </Link>
      </div>

      <div className={styles.actions}>
        <a href={pdfHref} className={styles.pdfButton} target="_blank" rel="noopener">
          PDFを開く（保存・印刷）
        </a>
        {inApp ? null : (
          <button type="button" className={styles.printButton} onClick={handlePrint}>
            この画面を印刷
          </button>
        )}
      </div>

      {inApp ? (
        <div className={styles.notice} data-testid="in-app-notice">
          <p>
            {inApp} アプリ内のブラウザでは印刷ボタンが使えません。上の「PDFを開く」から保存・印刷するか、
            Safari / Chrome で開き直してください。
          </p>
          {inApp === "LINE" ? (
            <button
              type="button"
              className={styles.noticeButton}
              onClick={() => {
                window.location.href = externalBrowserUrl(window.location.href);
              }}
            >
              Safari / Chrome で開く
            </button>
          ) : (
            <p>右上（または右下）のメニュー「…」→「ブラウザで開く」を選んでください。</p>
          )}
          <p className={styles.noticeSub}>※ 外部ブラウザでは最初にログインが必要です。ログイン後はこの見積書に戻ります。</p>
        </div>
      ) : null}

      {printHelp && !inApp ? (
        <p className={styles.noticeSub}>
          印刷画面が出ない場合: iPhone は共有ボタン →「プリント」、Android は「⋮」→「共有」→「印刷」。
          または「PDFを開く」をご利用ください。
        </p>
      ) : null}
    </div>
  );
}
