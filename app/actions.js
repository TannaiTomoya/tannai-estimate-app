"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { isAuthSkipEnabled } from "@/lib/auth-skip";
import { INTERNAL_ADMIN_EMAIL, getAdminPassword } from "@/lib/admin-auth";
import {
  MARKUP_RATE_OPTIONS,
  STATUS_OPTIONS,
  TAX_RATE,
  WORKLOAD_OPTIONS,
} from "@/lib/constants";
import { computeEstimateTotals } from "@/lib/estimate-calc";
import { DEFAULT_MATERIAL_UNIT, defaultValidUntil, getCompany } from "@/lib/company";
import { describeDbError } from "@/lib/db-error";

export async function loginAction(formData) {
  const password = String(formData.get("password") || "");
  const adminPassword = getAdminPassword();

  if (!adminPassword) {
    return {
      error: "管理者ログインの設定が不完全です。智弥に連絡してください。",
    };
  }

  if (!password || password !== adminPassword) {
    return {
      error: "管理者パスワードが違います。もう一度確認してください。",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: INTERNAL_ADMIN_EMAIL,
    password: adminPassword,
  });

  if (error) {
    return {
      error: "管理者パスワードが違います。もう一度確認してください。",
    };
  }

  redirect("/estimates");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

function toInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

// 金額欄は整数のみ受け付ける。小数点が混ざっていたら保存を拒否する（20.000 の誤入力対策）。
function hasDecimalMoney(values) {
  return values.some((v) => {
    const s = String(v ?? "").trim();
    return s !== "" && (s.includes(".") || s.includes("。"));
  });
}
const MONEY_ERROR =
  "金額欄に小数点が含まれています。20000 のように数字だけで入力してください。";

function toNum(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseMaterials(raw) {
  if (!raw) return [];
  try {
    const list = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(list)) return [];
    return list
      .filter((row) => (row.name || "").trim() !== "")
      .map((row, index) => {
        const unitPurchasePrice = toInt(row.unitPurchasePrice);
        const quantity = toNum(row.quantity);
        return {
          name: String(row.name).trim(),
          unit_purchase_price: unitPurchasePrice,
          quantity,
          unit: String(row.unit || "").trim().slice(0, 10) || DEFAULT_MATERIAL_UNIT,
          line_total: Math.round(unitPurchasePrice * quantity),
          sort_order: index,
        };
      });
  } catch {
    return [];
  }
}

async function requireUser() {
  if (isAuthSkipEnabled()) {
    return { error: "開発用スキップ中は保存できません。ログインしてから保存してください。" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "ログインが必要です。" };
  }

  return { supabase, user };
}

const WORKLOAD_VALUES = new Set(WORKLOAD_OPTIONS.map((o) => o.value));
const STATUS_VALUES = new Set(STATUS_OPTIONS.map((o) => o.value));

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

/**
 * クライアントからは「入力値」だけを受け取り、金額・合計・推奨単価・アラートは
 * ここで lib/estimate-calc.js を使って再計算する（画面側の計算結果は信用しない）。
 */
export async function saveEstimateAction(payload) {
  const auth = await requireUser();
  if (auth.error) return { error: auth.error };

  const { supabase } = auth;
  const rawMaterials = Array.isArray(payload.materials) ? payload.materials : [];

  if (
    hasDecimalMoney([
      payload.unitPrice,
      payload.consumablesCost,
      payload.techFee,
      payload.miscCost,
      ...rawMaterials.map((row) => row?.unitPurchasePrice),
    ])
  ) {
    return { error: MONEY_ERROR };
  }

  // ---- 入力値の正規化 ----
  const input = {
    title: String(payload.title || "").trim(),
    customerName: String(payload.customerName || "").trim(),
    workLocation: String(payload.workLocation || "").trim() || null,
    estimateDate: String(payload.estimateDate || ""),
    deliveryDate: String(payload.deliveryDate || "") || null,
    validUntil: String(payload.validUntil || "") || null,
    customerNote: String(payload.customerNote || "").trim().slice(0, 2000) || null,
    workerCount: toInt(payload.workerCount),
    plannedDays: toNum(payload.plannedDays),
    workload: WORKLOAD_VALUES.has(payload.workload) ? payload.workload : "medium",
    includesConsumables: Boolean(payload.includesConsumables),
    includesTechFee: Boolean(payload.includesTechFee),
    workDescription: String(payload.workDescription || "").trim() || null,
    unitPrice: toInt(payload.unitPrice),
    markupRate: toNum(payload.markupRate, MARKUP_RATE_OPTIONS[0]),
    consumablesCost: toInt(payload.consumablesCost),
    techFee: toInt(payload.techFee),
    miscCost: toInt(payload.miscCost),
    reasonUnitPrice: String(payload.reasonUnitPrice || "").trim() || null,
    reasonManpower: String(payload.reasonManpower || "").trim() || null,
    reasonDelivery: String(payload.reasonDelivery || "").trim() || null,
    status: STATUS_VALUES.has(payload.status) ? payload.status : "draft",
  };
  const materials = parseMaterials(rawMaterials);

  if (!input.title || !input.customerName || !isValidDate(input.estimateDate)) {
    return { error: "案件名、顧客名、見積もり日は必須です。" };
  }
  if (input.deliveryDate && !isValidDate(input.deliveryDate)) {
    return { error: "顧客提示予定納期の形式が正しくありません。" };
  }
  if (input.validUntil && !isValidDate(input.validUntil)) {
    return { error: "見積有効期限の形式が正しくありません。" };
  }
  if (!input.validUntil) {
    input.validUntil = defaultValidUntil(input.estimateDate, getCompany().validDays);
  }
  const negatives = [
    input.workerCount,
    input.plannedDays,
    input.unitPrice,
    input.markupRate,
    input.consumablesCost,
    input.techFee,
    input.miscCost,
    ...materials.flatMap((m) => [m.unit_purchase_price, m.quantity]),
  ];
  if (negatives.some((v) => v < 0)) {
    return { error: "マイナスの値は入力できません。" };
  }

  // ---- サーバ側で再計算 ----
  const totals = computeEstimateTotals({
    workload: input.workload,
    includesConsumables: input.includesConsumables,
    includesTechFee: input.includesTechFee,
    workerCount: input.workerCount,
    plannedDays: input.plannedDays,
    unitPrice: input.unitPrice,
    materials: materials.map((m) => ({
      name: m.name,
      unitPurchasePrice: m.unit_purchase_price,
      quantity: m.quantity,
    })),
    markupRate: input.markupRate,
    consumablesCost: input.consumablesCost,
    techFee: input.techFee,
    miscCost: input.miscCost,
  });

  const estimateRow = {
    title: input.title,
    customer_name: input.customerName,
    work_location: input.workLocation,
    estimate_date: input.estimateDate,
    delivery_date: input.deliveryDate,
    worker_count: input.workerCount,
    planned_days: input.plannedDays,
    workload: input.workload,
    includes_consumables: input.includesConsumables,
    includes_tech_fee: input.includesTechFee,
    work_description: input.workDescription,
    recommended_unit_price: totals.recommended.price,
    recommended_price_label: totals.recommended.label,
    unit_price: input.unitPrice,
    labor_cost: totals.laborCost,
    material_markup_rate: input.markupRate,
    material_purchase_total: totals.materialPurchaseTotal,
    material_cost: totals.materialCost,
    consumables_cost: input.consumablesCost,
    tech_fee: input.techFee,
    misc_cost: input.miscCost,
    subtotal: totals.subtotal,
    tax_rate: TAX_RATE,
    tax_amount: totals.taxAmount,
    total_with_tax: totals.totalWithTax,
    reason_unit_price: input.reasonUnitPrice,
    reason_manpower: input.reasonManpower,
    reason_delivery: input.reasonDelivery,
    risk_alerts: totals.riskAlerts,
    status: input.status,
    valid_until: input.validUntil,
    customer_note: input.customerNote,
  };

  // ---- 本体＋材料明細を 1 トランザクションで保存（supabase/migrations/0003） ----
  const { data: estimateId, error } = await supabase.rpc("save_estimate", {
    p_id: payload.id || null,
    p_estimate: estimateRow,
    p_materials: materials,
  });

  if (error || !estimateId) {
    return {
      error: describeDbError(
        error || { code: "NO_DATA", message: "保存結果を取得できませんでした" },
        "rpc.save_estimate",
      ),
    };
  }

  redirect(`/estimates/${estimateId}`);
}

export async function saveResultAction(formData) {
  const auth = await requireUser();
  if (auth.error) return { error: auth.error };

  const { supabase, user } = auth;
  const estimateId = String(formData.get("estimateId") || "");

  if (!estimateId) {
    return { error: "見積もりが見つかりません。" };
  }

  if (
    hasDecimalMoney([
      formData.get("actualMaterialPurchaseTotal"),
      formData.get("actualConsumablesCost"),
      formData.get("actualTechFee"),
      formData.get("actualMiscCost"),
      formData.get("actualOrderAmount"),
    ])
  ) {
    return { error: MONEY_ERROR };
  }

  const row = {
    estimate_id: estimateId,
    user_id: user.id,
    actual_worker_count: toInt(formData.get("actualWorkerCount")),
    actual_days: toNum(formData.get("actualDays")),
    actual_material_purchase_total: toInt(
      formData.get("actualMaterialPurchaseTotal"),
    ),
    actual_consumables_cost: toInt(formData.get("actualConsumablesCost")),
    actual_tech_fee: toInt(formData.get("actualTechFee")),
    actual_misc_cost: toInt(formData.get("actualMiscCost")),
    actual_order_amount: toInt(formData.get("actualOrderAmount")),
    completed_on: String(formData.get("completedOn") || ""),
    diff_reason: String(formData.get("diffReason") || "").trim() || null,
    next_insight: String(formData.get("nextInsight") || "").trim() || null,
    updated_at: new Date().toISOString(),
  };

  if (!row.completed_on) {
    return { error: "作業完了日は必須です。" };
  }

  const { error } = await supabase.from("estimate_results").upsert(row, {
    onConflict: "estimate_id",
  });

  if (error) {
    return {
      error: `実績の保存に失敗しました。${describeDbError(error, "estimate_results.upsert")}`,
    };
  }

  redirect(`/estimates/${estimateId}`);
}
