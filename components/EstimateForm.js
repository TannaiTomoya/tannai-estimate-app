"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MARKUP_RATE_OPTIONS,
  STATUS_OPTIONS,
  UNIT_PRICE_OPTIONS,
  WORKLOAD_OPTIONS,
} from "@/lib/constants";
import { computeEstimateTotals } from "@/lib/estimate-calc";
import { saveEstimateAction } from "@/app/actions";
import styles from "./estimate-form.module.css";

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function emptyMaterial() {
  return { name: "", unitPurchasePrice: "", quantity: "" };
}

function mapInitial(initial) {
  if (!initial) {
    return {
      id: null,
      title: "",
      customerName: "",
      workLocation: "",
      estimateDate: todayString(),
      deliveryDate: "",
      workerCount: 1,
      plannedDays: 1,
      workload: "medium",
      includesConsumables: false,
      includesTechFee: false,
      workDescription: "",
      unitPrice: 50000,
      materials: [emptyMaterial()],
      markupRate: 1.2,
      consumablesCost: 0,
      techFee: 0,
      miscCost: 0,
      reasonUnitPrice: "",
      reasonManpower: "",
      reasonDelivery: "",
      status: "draft",
    };
  }

  return {
    id: initial.id,
    title: initial.title || "",
    customerName: initial.customer_name || "",
    workLocation: initial.work_location || "",
    estimateDate: initial.estimate_date || todayString(),
    deliveryDate: initial.delivery_date || "",
    workerCount: initial.worker_count ?? 1,
    plannedDays: initial.planned_days ?? 1,
    workload: initial.workload || "medium",
    includesConsumables: Boolean(initial.includes_consumables),
    includesTechFee: Boolean(initial.includes_tech_fee),
    workDescription: initial.work_description || "",
    unitPrice: initial.unit_price ?? 50000,
    materials:
      initial.materials?.length > 0
        ? initial.materials.map((row) => ({
            name: row.name || "",
            unitPurchasePrice: row.unit_purchase_price ?? "",
            quantity: row.quantity ?? "",
          }))
        : [emptyMaterial()],
    markupRate: Number(initial.material_markup_rate) || 1.2,
    consumablesCost: initial.consumables_cost || 0,
    techFee: initial.tech_fee || 0,
    miscCost: initial.misc_cost || 0,
    reasonUnitPrice: initial.reason_unit_price || "",
    reasonManpower: initial.reason_manpower || "",
    reasonDelivery: initial.reason_delivery || "",
    status: initial.status || "draft",
  };
}

export default function EstimateForm({ initialEstimate = null, authSkipped = false }) {
  const [form, setForm] = useState(() => mapInitial(initialEstimate));
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const totals = useMemo(
    () =>
      computeEstimateTotals({
        workload: form.workload,
        includesConsumables: form.includesConsumables,
        includesTechFee: form.includesTechFee,
        workerCount: form.workerCount,
        plannedDays: form.plannedDays,
        unitPrice: form.unitPrice,
        materials: form.materials,
        markupRate: form.markupRate,
        consumablesCost: form.consumablesCost,
        techFee: form.techFee,
        miscCost: form.miscCost,
      }),
    [form],
  );

  useEffect(() => {
    if (initialEstimate) return;
    setForm((prev) => ({
      ...prev,
      unitPrice: totals.recommended.price,
    }));
    // 初回のみ推奨単価を採用単価へ反映
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateMaterial(index, key, value) {
    setForm((prev) => {
      const materials = prev.materials.map((row, i) =>
        i === index ? { ...row, [key]: value } : row,
      );
      return { ...prev, materials };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setPending(true);
    setError("");

    const result = await saveEstimateAction({
      id: form.id,
      title: form.title,
      customerName: form.customerName,
      workLocation: form.workLocation,
      estimateDate: form.estimateDate,
      deliveryDate: form.deliveryDate,
      workerCount: form.workerCount,
      plannedDays: form.plannedDays,
      workload: form.workload,
      includesConsumables: form.includesConsumables,
      includesTechFee: form.includesTechFee,
      workDescription: form.workDescription,
      recommendedUnitPrice: totals.recommended.price,
      recommendedPriceLabel: totals.recommended.label,
      unitPrice: form.unitPrice,
      laborCost: totals.laborCost,
      markupRate: form.markupRate,
      materialPurchaseTotal: totals.materialPurchaseTotal,
      materialCost: totals.materialCost,
      consumablesCost: form.consumablesCost,
      techFee: form.techFee,
      miscCost: form.miscCost,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      totalWithTax: totals.totalWithTax,
      reasonUnitPrice: form.reasonUnitPrice,
      reasonManpower: form.reasonManpower,
      reasonDelivery: form.reasonDelivery,
      riskAlerts: totals.riskAlerts,
      status: form.status,
      materials: form.materials,
    });

    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  const reasonMissing =
    !form.reasonUnitPrice.trim() || !form.reasonManpower.trim();

  return (
    <form className={styles.page} onSubmit={handleSubmit}>
      {authSkipped ? (
        <p className={styles.banner}>
          開発用スキップ中です。保存には通常ログインが必要です。
        </p>
      ) : null}

      {error ? <p className={styles.error}>{error}</p> : null}

      <section className={styles.section}>
        <h2>1. 案件情報</h2>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label htmlFor="title">案件名</label>
            <input
              id="title"
              required
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="customerName">顧客名</label>
            <input
              id="customerName"
              required
              value={form.customerName}
              onChange={(e) => updateField("customerName", e.target.value)}
            />
          </div>
          <div className={`${styles.field} ${styles.fieldFull}`}>
            <label htmlFor="workLocation">作業場所（任意）</label>
            <input
              id="workLocation"
              value={form.workLocation}
              onChange={(e) => updateField("workLocation", e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="estimateDate">見積もり日</label>
            <input
              id="estimateDate"
              type="date"
              required
              value={form.estimateDate}
              onChange={(e) => updateField("estimateDate", e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="deliveryDate">顧客提示予定納期（任意）</label>
            <input
              id="deliveryDate"
              type="date"
              value={form.deliveryDate}
              onChange={(e) => updateField("deliveryDate", e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2>2. 作業条件</h2>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label htmlFor="workerCount">作業人数</label>
            <input
              id="workerCount"
              type="number"
              min="0"
              step="1"
              value={form.workerCount}
              onChange={(e) => updateField("workerCount", e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="plannedDays">想定日数</label>
            <input
              id="plannedDays"
              type="number"
              min="0"
              step="0.5"
              value={form.plannedDays}
              onChange={(e) => updateField("plannedDays", e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="workload">作業負荷</label>
            <select
              id="workload"
              value={form.workload}
              onChange={(e) => updateField("workload", e.target.value)}
            >
              {WORKLOAD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="includesConsumables">消耗品を含むか</label>
            <select
              id="includesConsumables"
              value={form.includesConsumables ? "yes" : "no"}
              onChange={(e) =>
                updateField("includesConsumables", e.target.value === "yes")
              }
            >
              <option value="no">いいえ</option>
              <option value="yes">はい</option>
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="includesTechFee">技術料を含むか</label>
            <select
              id="includesTechFee"
              value={form.includesTechFee ? "yes" : "no"}
              onChange={(e) =>
                updateField("includesTechFee", e.target.value === "yes")
              }
            >
              <option value="no">いいえ</option>
              <option value="yes">はい</option>
            </select>
          </div>
          <div className={`${styles.field} ${styles.fieldFull}`}>
            <label htmlFor="workDescription">作業内容の簡単な説明（任意）</label>
            <textarea
              id="workDescription"
              value={form.workDescription}
              onChange={(e) => updateField("workDescription", e.target.value)}
            />
          </div>
        </div>
        <p className={styles.hint}>延べ人日: {totals.personDays}</p>
      </section>

      <section className={styles.section}>
        <h2>3. 単価と工賃（参考）</h2>
        <p className={styles.hint}>
          推奨単価（参考）: ¥{totals.recommended.price.toLocaleString("ja-JP")}
          {totals.recommended.maxPrice
            ? ` 〜 ¥${totals.recommended.maxPrice.toLocaleString("ja-JP")}`
            : ""}{" "}
          （{totals.recommended.label}）
        </p>
        <p className={styles.hint}>単価候補から選択</p>
        <div className={styles.chips}>
          {UNIT_PRICE_OPTIONS.map((price) => (
            <button
              key={price}
              type="button"
              className={
                Number(form.unitPrice) === price
                  ? styles.chipActive
                  : styles.chip
              }
              onClick={() => updateField("unitPrice", price)}
            >
              {price === totals.recommended.price ? "★ " : ""}
              ¥{price.toLocaleString("ja-JP")}
            </button>
          ))}
        </div>
        <div className={styles.field}>
          <label htmlFor="unitPrice">採用単価（手動調整可）</label>
          <input
            id="unitPrice"
            type="number"
            min="0"
            step="1000"
            value={form.unitPrice}
            onChange={(e) => updateField("unitPrice", e.target.value)}
          />
        </div>
        <p className={styles.hint}>
          推奨との差額: ¥
          {(
            Number(form.unitPrice) - totals.recommended.price
          ).toLocaleString("ja-JP")}
        </p>
        <p className={styles.hint}>
          工賃: ¥{totals.laborCost.toLocaleString("ja-JP")}
        </p>
      </section>

      <section className={styles.section}>
        <h2>4. 材料費</h2>
        {form.materials.map((row, index) => (
          <div className={styles.row} key={index}>
            <input
              placeholder="材料名"
              value={row.name}
              onChange={(e) => updateMaterial(index, "name", e.target.value)}
            />
            <input
              type="number"
              placeholder="仕入れ単価"
              value={row.unitPurchasePrice}
              onChange={(e) =>
                updateMaterial(index, "unitPurchasePrice", e.target.value)
              }
            />
            <input
              type="number"
              placeholder="数量"
              value={row.quantity}
              onChange={(e) => updateMaterial(index, "quantity", e.target.value)}
            />
            <button
              type="button"
              className={styles.buttonSecondary}
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  materials: prev.materials.filter((_, i) => i !== index),
                }))
              }
            >
              削除
            </button>
          </div>
        ))}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.buttonSecondary}
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                materials: [...prev.materials, emptyMaterial()],
              }))
            }
          >
            行を追加
          </button>
        </div>
        <div className={styles.field}>
          <label htmlFor="markupRate">掛け率</label>
          <select
            id="markupRate"
            value={form.markupRate}
            onChange={(e) => updateField("markupRate", e.target.value)}
          >
            {MARKUP_RATE_OPTIONS.map((rate) => (
              <option key={rate} value={rate}>
                {rate}
              </option>
            ))}
            <option value={form.markupRate}>その他（下で調整）</option>
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="markupRateManual">掛け率（自由入力）</label>
          <input
            id="markupRateManual"
            type="number"
            min="0"
            step="0.01"
            value={form.markupRate}
            onChange={(e) => updateField("markupRate", e.target.value)}
          />
        </div>
        <p className={styles.hint}>
          仕入れ合計: ¥{totals.materialPurchaseTotal.toLocaleString("ja-JP")} /
          材料費: ¥{totals.materialCost.toLocaleString("ja-JP")}
        </p>
      </section>

      <section className={styles.section}>
        <h2>5. その他費用</h2>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label htmlFor="consumablesCost">消耗品費</label>
            <input
              id="consumablesCost"
              type="number"
              min="0"
              value={form.consumablesCost}
              onChange={(e) => updateField("consumablesCost", e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="techFee">技術料</label>
            <input
              id="techFee"
              type="number"
              min="0"
              value={form.techFee}
              onChange={(e) => updateField("techFee", e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="miscCost">諸経費</label>
            <input
              id="miscCost"
              type="number"
              min="0"
              value={form.miscCost}
              onChange={(e) => updateField("miscCost", e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2>6. 合計とアラート</h2>
        {totals.riskAlerts.length > 0 ? (
          <div className={styles.alerts}>
            <strong>注意</strong>
            <ul>
              {totals.riskAlerts.map((alert) => (
                <li key={alert}>{alert}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <ul className={styles.summaryList}>
          <li>
            <span>工賃</span>
            <span>¥{totals.laborCost.toLocaleString("ja-JP")}</span>
          </li>
          <li>
            <span>材料費</span>
            <span>¥{totals.materialCost.toLocaleString("ja-JP")}</span>
          </li>
          <li>
            <span>消耗品費</span>
            <span>¥{Number(form.consumablesCost || 0).toLocaleString("ja-JP")}</span>
          </li>
          <li>
            <span>技術料</span>
            <span>¥{Number(form.techFee || 0).toLocaleString("ja-JP")}</span>
          </li>
          <li>
            <span>諸経費</span>
            <span>¥{Number(form.miscCost || 0).toLocaleString("ja-JP")}</span>
          </li>
          <li>
            <span>小計（税抜）</span>
            <span>¥{totals.subtotal.toLocaleString("ja-JP")}</span>
          </li>
          <li>
            <span>消費税（10%）</span>
            <span>¥{totals.taxAmount.toLocaleString("ja-JP")}</span>
          </li>
        </ul>
        <p className={styles.total}>
          合計（税込）: ¥{totals.totalWithTax.toLocaleString("ja-JP")}
        </p>
        <p className={styles.hint}>
          1人日あたり実質単価:{" "}
          {totals.effectiveUnitPrice == null
            ? "—"
            : `¥${totals.effectiveUnitPrice.toLocaleString("ja-JP")}`}
        </p>
      </section>

      <section className={styles.section}>
        <h2>7. 判断理由メモ</h2>
        {reasonMissing ? (
          <p className={styles.notice}>
            単価・人数日数の理由が未入力です。保存はできますが、できるだけ記入してください。
          </p>
        ) : null}
        <div className={styles.field}>
          <label htmlFor="reasonUnitPrice">単価を決めた理由</label>
          <textarea
            id="reasonUnitPrice"
            value={form.reasonUnitPrice}
            onChange={(e) => updateField("reasonUnitPrice", e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="reasonManpower">人数・日数を決めた理由</label>
          <textarea
            id="reasonManpower"
            value={form.reasonManpower}
            onChange={(e) => updateField("reasonManpower", e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="reasonDelivery">納期を決めた理由（任意）</label>
          <textarea
            id="reasonDelivery"
            value={form.reasonDelivery}
            onChange={(e) => updateField("reasonDelivery", e.target.value)}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2>8. 保存</h2>
        <div className={styles.field}>
          <label htmlFor="status">ステータス</label>
          <select
            id="status"
            value={form.status}
            onChange={(e) => updateField("status", e.target.value)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.actions}>
          <button className={styles.button} type="submit" disabled={pending}>
            {pending ? "保存中..." : "保存する"}
          </button>
        </div>
      </section>
    </form>
  );
}
