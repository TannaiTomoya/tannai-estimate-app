import { LABOR_LABEL } from "@/lib/company";

/** 2026-09-04 → 2026年9月4日 */
export function formatJaDate(value) {
  if (!value) return "";
  const [y, m, d] = String(value).split("-").map(Number);
  if (!y || !m || !d) return String(value);
  return `${y}年${m}月${d}日`;
}

export function formatYenPlain(value) {
  return Math.round(Number(value) || 0).toLocaleString("ja-JP");
}

/**
 * 材料行を「販売価格（掛け率適用後）」に変換する。
 * 行ごとに丸めると合計が estimates.material_cost とズレることがあるため、
 * 最終行で差額を吸収して合計を必ず一致させる。
 */
export function buildMaterialLines(materials, markupRate, materialCost) {
  const rate = Number(markupRate) || 1;
  const rows = (materials || []).filter((m) => (m.name || "").trim() !== "");
  if (rows.length === 0) return [];

  const lines = rows.map((m) => ({
    name: m.name,
    quantity: Number(m.quantity) || 0,
    unit: m.unit || "個",
    unitPrice: Math.round((Number(m.unit_purchase_price) || 0) * rate),
    amount: Math.round((Number(m.line_total) || 0) * rate),
  }));

  const sum = lines.reduce((s, l) => s + l.amount, 0);
  const target = Math.round(Number(materialCost) || 0);
  const diff = target - sum;
  if (diff !== 0) {
    lines[lines.length - 1].amount += diff;
  }
  return lines;
}

/**
 * 見積書の明細行（加工費 → 材料 → その他費用）。0円のその他費用は省略。
 */
export function buildQuoteLines(estimate, materials, { showLaborDetail = false } = {}) {
  const lines = [];

  lines.push({
    name: LABOR_LABEL,
    detail: showLaborDetail
      ? `（${estimate.worker_count}人 × ${Number(estimate.planned_days)}日 × @¥${formatYenPlain(estimate.unit_price)}）`
      : "",
    quantity: 1,
    unit: "式",
    unitPrice: null,
    amount: Number(estimate.labor_cost) || 0,
  });

  for (const m of buildMaterialLines(
    materials,
    estimate.material_markup_rate,
    estimate.material_cost,
  )) {
    lines.push({ ...m, detail: "" });
  }

  const extras = [
    ["消耗品費", estimate.consumables_cost],
    ["技術料", estimate.tech_fee],
    ["諸経費", estimate.misc_cost],
  ];
  for (const [name, value] of extras) {
    const amount = Number(value) || 0;
    if (amount > 0) {
      lines.push({ name, detail: "", quantity: 1, unit: "式", unitPrice: null, amount });
    }
  }

  return lines;
}
