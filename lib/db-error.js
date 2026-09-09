/**
 * Supabase / PostgreSQL のエラーを、利用者が次に何をすべきか分かる日本語に変換する。
 * 2人だけで使う社内アプリなので、エラーコードと原文もそのまま表示して原因追跡を優先する。
 */
const MESSAGES = {
  // 権限・認証
  "42501":
    "データベースの権限がありません。Supabase で GRANT（docs/supabase-changes.md 2-2）を実行してください。",
  PGRST301: "ログインの有効期限が切れました。もう一度ログインしてください。",
  // スキーマ不一致
  PGRST204: "データベースに必要な列がありません。テーブル定義を確認してください。",
  PGRST205: "テーブルが見つかりません。テーブル定義を確認してください。",
  PGRST202:
    "保存用の関数が見つかりません。supabase/migrations/0003_save_estimate_rpc.sql を実行してください。",
  P0002: "対象の見積もりが見つかりません。",
  "42P01": "テーブルが存在しません。テーブル定義を確認してください。",
  "42703": "存在しない列を保存しようとしました。テーブル定義を確認してください。",
  // 制約
  "23502": "必須項目が空です。入力内容を確認してください。",
  "23503": "関連するデータが見つかりません（ログインユーザーまたは見積もりID）。",
  "23505": "同じデータがすでに存在します。",
  "23514": "入力値が許容範囲外です（マイナスの金額や不正な区分など）。",
  "22003": "数値が大きすぎます。",
  "22P02": "数値や日付の形式が正しくありません。",
};

export function describeDbError(error, context = "") {
  const code = error?.code ? String(error.code) : "";
  const base =
    MESSAGES[code] || "保存に失敗しました。しばらくしてから再度お試しください。";
  const detail = [code && `code: ${code}`, error?.message]
    .filter(Boolean)
    .join(" / ");

  // Vercel のランタイムログにも残す
  console.error(`[db-error]${context ? ` ${context}` : ""}`, {
    code,
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
  });

  return detail ? `${base}（${detail}）` : base;
}
