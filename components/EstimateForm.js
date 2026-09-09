"use client";

import { useMemo, useState } from "react";
import {
  MARKUP_RATE_OPTIONS,
  STATUS_OPTIONS,
  UNIT_PRICE_OPTIONS,
  WORKLOAD_OPTIONS,
} from "@/lib/constants";
import {
  computeEstimateTotals,
  getRecommendedUnitPrice,
} from "@/lib/estimate-calc";
import { saveEstimateAction } from "@/app/actions";
import { formatYen, validateMoneyInput } from "@/lib/money-input";
import MoneyField from "./MoneyField";
import styles from "./estimate-form.module.css";

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function emptyMaterial() {
  return { name: "", unitPurchasePrice: "", quantity: "" };
}

function mapInitial(initial) {
  if (!initial) {
    const defaultCondition = {
      workload: "medium",
      includesConsumables: false,
      includesTechFee: false,
    };
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
      unitPrice: getRecommendedUnitPrice(defaultCondition).price,
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

  // 金額欄は整数のみ。小数点などが入っている欄は計算では 0 扱いにし、保存を止める。
  const money = useMemo(() => {
    const fields = {
      unitPrice: validateMoneyInput(form.unitPrice),
      consumablesCost: validateMoneyInput(form.consumablesCost),
      techFee: validateMoneyInput(form.techFee),
      miscCost: validateMoneyInput(form.miscCost),
    };
    const materialErrors = form.materials.map(
      (row) => validateMoneyInput(row.unitPurchasePrice).error,
    );
    const hasError =
      Object.values(fields).some((f) => f.error) ||
      materialErrors.some((e) => e);
    return { fields, materialErrors, hasError };
  }, [form]);

  const totals = useMemo(
    () =>
      computeEstimateTotals({
        workload: form.workload,
        includesConsumables: form.includesConsumables,
        includesTechFee: form.includesTechFee,
        workerCount: form.workerCount,
        plannedDays: form.plannedDays,
        unitPrice: money.fields.unitPrice.value ?? 0,
        materials: form.materials.map((row) => ({
          ...row,
          unitPurchasePrice: validateMoneyInput(row.unitPurchasePrice).value ?? 0,
        })),
        markupRate: form.markupRate,
        consumablesCost: money.fields.consumablesCost.value ?? 0,
        techFee: money.fields.techFee.value ?? 0,
        miscCost: money.fields.miscCost.value ?? 0,
      }),
    [form, money],
  );

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
    if (money.hasError) {
      setError(
        "金額欄に小数点や数字以外が入っています。赤く表示された欄を直してから保存してください。",
      );
      return;
    }
    setPending(true);
    setError("");

    const cleanMaterials = form.materials.map((row) => ({
      ...row,
      unitPurchasePrice: validateMoneyInput(row.unitPurchasePrice).value ?? 0,
    }));

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
      unitPrice: money.fields.unitPrice.value ?? 0,
      laborCost: totals.laborCost,
      markupRate: form.markupRate,
      materialPurchaseTotal: totals.materialPurchaseTotal,
      materialCost: totals.materialCost,
      consumablesCost: money.fields.consumablesCost.value ?? 0,
      techFee: money.fields.techFee.value ?? 0,
      miscCost: money.fields.miscCost.value ?? 0,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      totalWithTax: totals.totalWithTax,
      reasonUnitPrice: form.reasonUnitPrice,
      reasonManpower: form.reasonManpower,
      reasonDelivery: form.reasonDelivery,
      riskAlerts: totals.riskAlerts,
      status: form.status,
      materials: cleanMaterials,
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
            <label htmlFor="plannedDays">
              想定日数 <span className={styles.unit}>（半日は 0.5）</span>
            </label>
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
        <p className={styles.explain}>
          <strong>延べ人日（のべにんにち）</strong> = 作業人数 × 想定日数。
          「1人が1日働く」を1と数えた作業量です。
          <br />
          今回: {Number(form.workerCount) || 0}人 × {Number(form.plannedDays) || 0}日 ={" "}
          <strong>{totals.personDays} 人日</strong>
          。この数に1人1日単価をかけたものが工賃になります。
        </p>
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
        <MoneyField
          id="unitPrice"
          label="採用する1人1日単価（手動調整可）"
          value={form.unitPrice}
          onChange={(v) => updateField("unitPrice", v)}
          placeholder="例: 50000"
        />
        <p className={styles.hint}>
          推奨との差額:{" "}
          {formatYen((money.fields.unitPrice.value ?? 0) - totals.recommended.price)}
        </p>
        <p className={styles.hint}>
          工賃 = {totals.personDays} 人日 × {formatYen(money.fields.unitPrice.value ?? 0)} ={" "}
          <strong>{formatYen(totals.laborCost)}</strong>
        </p>
      </section>

      <section className={styles.section}>
        <h2>4. 材料費</h2>
        <p className={styles.explain}>
          使う材料を1つずつ書きます。材料が複数あるときは下の
          「＋ 材料をもう1つ追加」を押すと入力欄が増えます。
          材料を使わない場合は空欄のままで構いません。
        </p>
        {form.materials.map((row, index) => {
          const price = validateMoneyInput(row.unitPurchasePrice).value ?? 0;
          const qty = Number(row.quantity) || 0;
          return (
            <div className={styles.materialCard} key={index}>
              <div className={styles.materialHead}>
                <span>材料 {index + 1}</span>
                {form.materials.length > 1 ? (
                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        materials: prev.materials.filter((_, i) => i !== index),
                      }))
                    }
                  >
                    この材料を消す
                  </button>
                ) : null}
              </div>
              <div className={styles.grid}>
                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <label htmlFor={`material-name-${index}`}>材料名</label>
                  <input
                    id={`material-name-${index}`}
                    placeholder="例: 油圧ホース"
                    value={row.name}
                    onChange={(e) => updateMaterial(index, "name", e.target.value)}
                  />
                </div>
                <MoneyField
                  id={`material-price-${index}`}
                  label="仕入れ単価（1個あたり）"
                  value={row.unitPurchasePrice}
                  onChange={(v) => updateMaterial(index, "unitPurchasePrice", v)}
                  placeholder="例: 12000"
                  compact
                />
                <div className={`${styles.field} ${styles.fieldCompact}`}>
                  <label htmlFor={`material-qty-${index}`}>
                    数量 <span className={styles.unit}>（個数・小数可）</span>
                  </label>
                  <input
                    id={`material-qty-${index}`}
                    type="number"
                    min="0"
                    step="0.1"
                    inputMode="decimal"
                    placeholder="例: 2"
                    value={row.quantity}
                    onChange={(e) => updateMaterial(index, "quantity", e.target.value)}
                  />
                </div>
              </div>
              <p className={styles.materialTotal}>
                この材料の仕入れ額: {formatYen(price)} × {qty} ={" "}
                {formatYen(price * qty)}
              </p>
            </div>
          );
        })}
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
            ＋ 材料をもう1つ追加
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
          仕入れ合計 {formatYen(totals.materialPurchaseTotal)} × 掛け率{" "}
          {Number(form.markupRate) || 0} = 材料費{" "}
          <strong>{formatYen(totals.materialCost)}</strong>
        </p>
      </section>

      <section className={styles.section}>
        <h2>5. その他費用</h2>
        <p className={styles.explain}>
          金額は <strong>数字だけ</strong> で入力してください（例: 20000）。
          「20.000」のように小数点を入れると計算が合わなくなるため、入力できません。
        </p>
        <div className={styles.grid}>
          <MoneyField
            id="consumablesCost"
            label="消耗品費"
            value={form.consumablesCost}
            onChange={(v) => updateField("consumablesCost", v)}
          />
          <MoneyField
            id="techFee"
            label="技術料"
            value={form.techFee}
            onChange={(v) => updateField("techFee", v)}
          />
          <MoneyField
            id="miscCost"
            label="諸経費"
            value={form.miscCost}
            onChange={(v) => updateField("miscCost", v)}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2>6. 合計とアラート</h2>
        {money.hasError ? (
          <p className={styles.blockingNotice}>
            金額欄に小数点や数字以外が入っています。その欄は 0 として計算しています。
            直すまで保存できません。
          </p>
        ) : null}
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
            <span>{formatYen(money.fields.consumablesCost.value ?? 0)}</span>
          </li>
          <li>
            <span>技術料</span>
            <span>{formatYen(money.fields.techFee.value ?? 0)}</span>
          </li>
          <li>
            <span>諸経費</span>
            <span>{formatYen(money.fields.miscCost.value ?? 0)}</span>
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
          <button
            className={styles.button}
            type="submit"
            disabled={pending || money.hasError}
          >
            {pending
              ? "保存中..."
              : money.hasError
                ? "金額欄を直すと保存できます"
                : "保存する"}
          </button>
        </div>
      </section>
    </form>
  );
}
