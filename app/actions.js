"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { isAuthSkipEnabled } from "@/lib/auth-skip";
import { TAX_RATE } from "@/lib/constants";

export async function loginAction(formData) {
  const password = String(formData.get("password") || "");
  const email = String(process.env.ADMIN_EMAIL || "").trim();

  if (!email) {
    return {
      error: "管理者ログインの設定が不完全です。智弥に連絡してください。",
    };
  }

  if (!password) {
    return {
      error: "管理者パスワードが違います。もう一度確認してください。",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
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

export async function saveEstimateAction(payload) {
  const auth = await requireUser();
  if (auth.error) return { error: auth.error };

  const { supabase, user } = auth;
  const materials = parseMaterials(payload.materials);
  const riskAlerts = Array.isArray(payload.riskAlerts)
    ? payload.riskAlerts
    : [];

  const estimateRow = {
    title: String(payload.title || "").trim(),
    customer_name: String(payload.customerName || "").trim(),
    work_location: String(payload.workLocation || "").trim() || null,
    estimate_date: payload.estimateDate,
    delivery_date: payload.deliveryDate || null,
    worker_count: toInt(payload.workerCount),
    planned_days: toNum(payload.plannedDays),
    workload: payload.workload || "medium",
    includes_consumables: Boolean(payload.includesConsumables),
    includes_tech_fee: Boolean(payload.includesTechFee),
    work_description: String(payload.workDescription || "").trim() || null,
    recommended_unit_price: toInt(payload.recommendedUnitPrice),
    recommended_price_label: payload.recommendedPriceLabel || null,
    unit_price: toInt(payload.unitPrice),
    labor_cost: toInt(payload.laborCost),
    material_markup_rate: toNum(payload.markupRate, 1),
    material_purchase_total: toInt(payload.materialPurchaseTotal),
    material_cost: toInt(payload.materialCost),
    consumables_cost: toInt(payload.consumablesCost),
    tech_fee: toInt(payload.techFee),
    misc_cost: toInt(payload.miscCost),
    subtotal: toInt(payload.subtotal),
    tax_rate: TAX_RATE,
    tax_amount: toInt(payload.taxAmount),
    total_with_tax: toInt(payload.totalWithTax),
    reason_unit_price: String(payload.reasonUnitPrice || "").trim() || null,
    reason_manpower: String(payload.reasonManpower || "").trim() || null,
    reason_delivery: String(payload.reasonDelivery || "").trim() || null,
    risk_alerts: riskAlerts,
    status: payload.status || "draft",
    updated_at: new Date().toISOString(),
  };

  if (!estimateRow.title || !estimateRow.customer_name || !estimateRow.estimate_date) {
    return { error: "案件名、顧客名、見積もり日は必須です。" };
  }

  let estimateId = payload.id || null;

  if (estimateId) {
    const { error } = await supabase
      .from("estimates")
      .update(estimateRow)
      .eq("id", estimateId);

    if (error) {
      return { error: "保存に失敗しました。しばらくしてから再度お試しください。" };
    }

    await supabase.from("estimate_materials").delete().eq("estimate_id", estimateId);
  } else {
    const { data, error } = await supabase
      .from("estimates")
      .insert({ ...estimateRow, user_id: user.id })
      .select("id")
      .single();

    if (error || !data) {
      return { error: "保存に失敗しました。しばらくしてから再度お試しください。" };
    }
    estimateId = data.id;
  }

  if (materials.length > 0) {
    const materialRows = materials.map((row) => ({
      ...row,
      estimate_id: estimateId,
      user_id: user.id,
    }));
    const { error: materialError } = await supabase
      .from("estimate_materials")
      .insert(materialRows);

    if (materialError) {
      return { error: "材料明細の保存に失敗しました。" };
    }
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
    return { error: "実績の保存に失敗しました。" };
  }

  redirect(`/estimates/${estimateId}`);
}
