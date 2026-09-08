import { LABOR_LINES, TAX_RATE } from "@/lib/constants";

export function getRecommendedUnitPrice({
  workload,
  includesConsumables,
  includesTechFee,
}) {
  const isHighLoad =
    workload === "high" || includesConsumables || includesTechFee;

  if (isHighLoad) {
    return {
      price: LABOR_LINES.highLoadMin.price,
      maxPrice: LABOR_LINES.highLoadMax.price,
      label: LABOR_LINES.highLoadMin.label,
    };
  }

  // 手間代のみ・負荷低 → 最低ライン / 通常案件（負荷中） → 会社維持ライン
  if (workload === "low") {
    return {
      price: LABOR_LINES.minimum.price,
      maxPrice: null,
      label: LABOR_LINES.minimum.label,
    };
  }

  return {
    price: LABOR_LINES.maintain.price,
    maxPrice: null,
    label: LABOR_LINES.maintain.label,
  };
}

export function calcPersonDays(workerCount, plannedDays) {
  const workers = Number(workerCount) || 0;
  const days = Number(plannedDays) || 0;
  return Math.round(workers * days * 10) / 10;
}

export function calcLaborCost(workerCount, plannedDays, unitPrice) {
  const personDays = calcPersonDays(workerCount, plannedDays);
  const price = Number(unitPrice) || 0;
  return Math.round(personDays * price);
}

export function calcMaterialPurchaseTotal(materials) {
  return (materials || []).reduce((sum, row) => {
    const price = Number(row.unitPurchasePrice) || 0;
    const qty = Number(row.quantity) || 0;
    return sum + Math.round(price * qty);
  }, 0);
}

export function calcMaterialCost(purchaseTotal, markupRate) {
  const rate = Number(markupRate) || 0;
  return Math.round((Number(purchaseTotal) || 0) * rate);
}

export function calcSubtotal({
  laborCost,
  materialCost,
  consumablesCost,
  techFee,
  miscCost,
}) {
  return (
    (Number(laborCost) || 0) +
    (Number(materialCost) || 0) +
    (Number(consumablesCost) || 0) +
    (Number(techFee) || 0) +
    (Number(miscCost) || 0)
  );
}

export function calcTax(subtotal, taxRate = TAX_RATE) {
  return Math.round((Number(subtotal) || 0) * taxRate);
}

export function calcTotalWithTax(subtotal, taxAmount) {
  return (Number(subtotal) || 0) + (Number(taxAmount) || 0);
}

export function calcEffectiveUnitPrice(subtotal, personDays) {
  if (!personDays) return null;
  return Math.round((Number(subtotal) || 0) / personDays);
}

export function buildRiskAlerts({
  unitPrice,
  includesConsumables,
  includesTechFee,
  consumablesCost,
  techFee,
  materials,
  markupRate,
  workerCount,
  plannedDays,
}) {
  const alerts = [];
  const price = Number(unitPrice) || 0;
  const hasMaterials = (materials || []).some(
    (row) => (row.name || "").trim() !== "",
  );

  if (price < LABOR_LINES.minimum.price) {
    alerts.push("採用単価が手間代最低ライン（30,000円）を下回っています。");
  } else if (price < LABOR_LINES.maintain.price) {
    alerts.push("採用単価が会社維持ライン（50,000円）を下回っています。");
  }

  if (includesConsumables && (Number(consumablesCost) || 0) === 0) {
    alerts.push("消耗品込みですが、消耗品費が0円です。");
  }

  if (includesTechFee && (Number(techFee) || 0) === 0) {
    alerts.push("技術料込みですが、技術料が0円です。");
  }

  if (hasMaterials && (Number(markupRate) || 0) <= 1) {
    alerts.push("材料明細がありますが、掛け率が1.0以下です。");
  }

  if ((Number(workerCount) || 0) === 0 || (Number(plannedDays) || 0) === 0) {
    alerts.push("作業人数または想定日数が0です。");
  }

  return alerts;
}

export function computeEstimateTotals(input) {
  const recommended = getRecommendedUnitPrice(input);
  const personDays = calcPersonDays(input.workerCount, input.plannedDays);
  const laborCost = calcLaborCost(
    input.workerCount,
    input.plannedDays,
    input.unitPrice,
  );
  const materialPurchaseTotal = calcMaterialPurchaseTotal(input.materials);
  const materialCost = calcMaterialCost(
    materialPurchaseTotal,
    input.markupRate,
  );
  const subtotal = calcSubtotal({
    laborCost,
    materialCost,
    consumablesCost: input.consumablesCost,
    techFee: input.techFee,
    miscCost: input.miscCost,
  });
  const taxAmount = calcTax(subtotal);
  const totalWithTax = calcTotalWithTax(subtotal, taxAmount);
  const effectiveUnitPrice = calcEffectiveUnitPrice(subtotal, personDays);
  const riskAlerts = buildRiskAlerts({
    ...input,
    markupRate: input.markupRate,
  });

  return {
    recommended,
    personDays,
    laborCost,
    materialPurchaseTotal,
    materialCost,
    subtotal,
    taxRate: TAX_RATE,
    taxAmount,
    totalWithTax,
    effectiveUnitPrice,
    riskAlerts,
  };
}

export function calcResultDiff(estimate, result) {
  const estimatePersonDays = calcPersonDays(
    estimate.worker_count,
    estimate.planned_days,
  );
  const actualPersonDays = calcPersonDays(
    result.actual_worker_count,
    result.actual_days,
  );
  const estimateOther =
    (estimate.consumables_cost || 0) +
    (estimate.tech_fee || 0) +
    (estimate.misc_cost || 0);
  const actualOther =
    (result.actual_consumables_cost || 0) +
    (result.actual_tech_fee || 0) +
    (result.actual_misc_cost || 0);

  return {
    personDaysDiff: Math.round((actualPersonDays - estimatePersonDays) * 10) / 10,
    materialPurchaseDiff:
      (result.actual_material_purchase_total || 0) -
      (estimate.material_purchase_total || 0),
    otherCostDiff: actualOther - estimateOther,
    amountDiff:
      (result.actual_order_amount || 0) - (estimate.subtotal || 0),
    estimateEffective: calcEffectiveUnitPrice(
      estimate.subtotal,
      estimatePersonDays,
    ),
    actualEffective: calcEffectiveUnitPrice(
      result.actual_order_amount,
      actualPersonDays,
    ),
  };
}
