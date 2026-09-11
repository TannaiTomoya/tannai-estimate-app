/**
 * 見積書に印字する自社情報。
 * リポジトリは公開されているため、住所・電話・登録番号などはコードに書かず
 * 環境変数（.env.local / Vercel）から読む。サーバーコンポーネント専用。
 *
 * 空の項目は見積書に印字しない（行ごと非表示）。
 */
function env(name) {
  return String(process.env[name] || "").trim();
}

export function getCompany() {
  const validDays = Number(env("COMPANY_VALID_DAYS"));
  return {
    name: env("COMPANY_NAME"),
    representative: env("COMPANY_REPRESENTATIVE"),
    postalCode: env("COMPANY_POSTAL_CODE"),
    address: env("COMPANY_ADDRESS"),
    tel: env("COMPANY_TEL"),
    fax: env("COMPANY_FAX"),
    invoiceNumber: env("COMPANY_INVOICE_NUMBER"),
    validDays: Number.isFinite(validDays) && validDays > 0 ? validDays : 30,
    defaultNote: env("COMPANY_DEFAULT_NOTE"),
    defaultStaff: env("COMPANY_DEFAULT_STAFF"),
  };
}

/** 見積日から有効期限までの日数（見積書の「見積日より○日間」用）。不正なら null */
export function daysBetween(fromDate, toDate) {
  const parse = (s) => {
    const [y, m, d] = String(s || "").split("-").map(Number);
    return y && m && d ? Date.UTC(y, m - 1, d) : null;
  };
  const a = parse(fromDate);
  const b = parse(toDate);
  if (a == null || b == null) return null;
  return Math.round((b - a) / 86400000);
}

/** 見積書の作業費行の名称（固定） */
export const LABOR_LABEL = "加工費";

/** 材料の単位候補（フォームの datalist 用。自由入力も可） */
export const MATERIAL_UNIT_OPTIONS = ["個", "枚", "本", "m", "kg", "式", "セット"];
export const DEFAULT_MATERIAL_UNIT = "個";

/** 有効期限の既定値 = 見積日 + validDays */
export function defaultValidUntil(estimateDate, validDays = 30) {
  const [y, m, day] = String(estimateDate || "").split("-").map(Number);
  if (!y || !m || !day) return "";
  // UTC で日付計算し、タイムゾーンによるズレを避ける
  const d = new Date(Date.UTC(y, m - 1, day + validDays));
  return d.toISOString().slice(0, 10);
}
