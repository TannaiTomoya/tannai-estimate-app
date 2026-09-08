"use client";

import { useMemo, useState } from "react";
import { saveResultAction } from "@/app/actions";
import { calcResultDiff } from "@/lib/estimate-calc";
import styles from "@/components/estimate-form.module.css";

export default function EstimateResultForm({ estimate }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({
    actualWorkerCount: estimate.worker_count ?? 1,
    actualDays: estimate.planned_days ?? 1,
    actualMaterialPurchaseTotal: estimate.material_purchase_total || 0,
    actualConsumablesCost: estimate.consumables_cost || 0,
    actualTechFee: estimate.tech_fee || 0,
    actualMiscCost: estimate.misc_cost || 0,
    actualOrderAmount: estimate.subtotal || 0,
    completedOn: new Date().toISOString().slice(0, 10),
    diffReason: "",
    nextInsight: "",
  });

  const previewDiff = useMemo(
    () =>
      calcResultDiff(estimate, {
        actual_worker_count: form.actualWorkerCount,
        actual_days: form.actualDays,
        actual_material_purchase_total: form.actualMaterialPurchaseTotal,
        actual_consumables_cost: form.actualConsumablesCost,
        actual_tech_fee: form.actualTechFee,
        actual_misc_cost: form.actualMiscCost,
        actual_order_amount: form.actualOrderAmount,
      }),
    [estimate, form],
  );

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setPending(true);
    setError("");

    const formData = new FormData();
    formData.set("estimateId", estimate.id);
    Object.entries(form).forEach(([key, value]) => {
      formData.set(key, value);
    });

    const result = await saveResultAction(formData);
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <form className={styles.page} onSubmit={handleSubmit}>
      {error ? <p className={styles.error}>{error}</p> : null}

      <section className={styles.section}>
        <h2>見積もり（参考）</h2>
        <p>
          {estimate.title} / {estimate.worker_count}人 × {estimate.planned_days}
          日 / 税抜 ¥{Number(estimate.subtotal || 0).toLocaleString("ja-JP")}
        </p>
      </section>

      <section className={styles.section}>
        <h2>実績入力</h2>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label>実際の作業人数</label>
            <input
              type="number"
              min="0"
              value={form.actualWorkerCount}
              onChange={(e) => update("actualWorkerCount", e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label>実際の作業日数</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={form.actualDays}
              onChange={(e) => update("actualDays", e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label>実際の材料仕入れ合計</label>
            <input
              type="number"
              min="0"
              value={form.actualMaterialPurchaseTotal}
              onChange={(e) =>
                update("actualMaterialPurchaseTotal", e.target.value)
              }
            />
          </div>
          <div className={styles.field}>
            <label>実際の消耗品費</label>
            <input
              type="number"
              min="0"
              value={form.actualConsumablesCost}
              onChange={(e) => update("actualConsumablesCost", e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label>実際の技術料</label>
            <input
              type="number"
              min="0"
              value={form.actualTechFee}
              onChange={(e) => update("actualTechFee", e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label>実際の諸経費</label>
            <input
              type="number"
              min="0"
              value={form.actualMiscCost}
              onChange={(e) => update("actualMiscCost", e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label>実際の受注金額（税抜）</label>
            <input
              type="number"
              min="0"
              value={form.actualOrderAmount}
              onChange={(e) => update("actualOrderAmount", e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label>作業完了日</label>
            <input
              type="date"
              required
              value={form.completedOn}
              onChange={(e) => update("completedOn", e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2>差分（プレビュー）</h2>
        <ul className={styles.summaryList}>
          <li>
            <span>人日差</span>
            <span>{previewDiff.personDaysDiff}</span>
          </li>
          <li>
            <span>材料仕入差</span>
            <span>
              ¥{previewDiff.materialPurchaseDiff.toLocaleString("ja-JP")}
            </span>
          </li>
          <li>
            <span>その他費用差</span>
            <span>¥{previewDiff.otherCostDiff.toLocaleString("ja-JP")}</span>
          </li>
          <li>
            <span>金額差（税抜）</span>
            <span>¥{previewDiff.amountDiff.toLocaleString("ja-JP")}</span>
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2>実績差分メモ</h2>
        <div className={styles.field}>
          <label>差分の理由</label>
          <textarea
            value={form.diffReason}
            onChange={(e) => update("diffReason", e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label>次回に向けた気づき（任意）</label>
          <textarea
            value={form.nextInsight}
            onChange={(e) => update("nextInsight", e.target.value)}
          />
        </div>
        <div className={styles.actions}>
          <button className={styles.button} type="submit" disabled={pending}>
            {pending ? "保存中..." : "実績を保存する"}
          </button>
        </div>
      </section>
    </form>
  );
}
