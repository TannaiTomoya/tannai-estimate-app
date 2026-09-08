/** 画面には出さない。Supabase Auth 用の内部固定メール */
export const INTERNAL_ADMIN_EMAIL = "admin@tannai-estimate.local";

export function getAdminPassword() {
  return String(process.env.ADMIN_PASSWORD || "");
}
