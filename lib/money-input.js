/**
 * 金額欄の入力ルール（整数のみ）。
 * - 全角数字・カンマ・空白は自動で除去する
 * - 小数点（. や 。）はエラー。20.000 を 20000 と 20 のどちらか判定できないため自動変換しない
 */

const FULLWIDTH_DIGITS = "０１２３４５６７８９";

export function normalizeMoneyInput(raw) {
  let s = String(raw ?? "");
  s = s.replace(/[０-９]/g, (ch) => String(FULLWIDTH_DIGITS.indexOf(ch)));
  s = s.replace(/[，,\s￥¥円]/g, "");
  s = s.replace(/。/g, ".");
  return s;
}

export function validateMoneyInput(raw) {
  const s = normalizeMoneyInput(raw);
  if (s === "" || s === "-") return { value: 0, error: "" };
  if (s.includes(".")) {
    return {
      value: null,
      error:
        "金額に小数点は使えません。20000 のように数字だけで入力してください。",
    };
  }
  if (!/^-?\d+$/.test(s)) {
    return { value: null, error: "金額は数字だけで入力してください。" };
  }
  const n = Number(s);
  if (n < 0) {
    return { value: null, error: "金額はマイナスにできません。" };
  }
  return { value: n, error: "" };
}

export function formatYen(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "¥0";
  return `¥${Math.round(n).toLocaleString("ja-JP")}`;
}

export function isIntegerString(raw) {
  return validateMoneyInput(raw).error === "";
}
