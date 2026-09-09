"use client";

import { formatYen, validateMoneyInput } from "@/lib/money-input";
import styles from "./estimate-form.module.css";

/**
 * 金額入力欄（整数のみ・円）。
 * value は文字列または数値。小数点が入るとエラー文を表示する。
 */
export default function MoneyField({
  id,
  label,
  value,
  onChange,
  placeholder = "例: 20000",
  hint,
  compact = false,
  step = 1,
}) {
  const { value: parsed, error } = validateMoneyInput(value);
  const showPreview = !error && String(value ?? "") !== "";

  return (
    <div className={`${styles.field} ${compact ? styles.fieldCompact : ""}`}>
      {label ? (
        <label htmlFor={id}>
          {label} <span className={styles.unit}>（円・整数）</span>
        </label>
      ) : null}
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        step={step}
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? "true" : "false"}
        className={error ? styles.inputError : undefined}
      />
      {error ? (
        <p className={styles.fieldError}>{error}</p>
      ) : showPreview ? (
        <p className={styles.preview}>= {formatYen(parsed)}</p>
      ) : hint ? (
        <p className={styles.fieldHint}>{hint}</p>
      ) : null}
    </div>
  );
}
