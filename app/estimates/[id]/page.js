import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { isAuthSkipEnabled } from "@/lib/auth-skip";
import {
  STATUS_LABELS,
  WORKLOAD_LABELS,
} from "@/lib/constants";
import { calcResultDiff } from "@/lib/estimate-calc";
import styles from "@/components/estimate-form.module.css";

export const metadata = {
  title: "見積もり詳細 | 見積もりアプリ",
};

function yen(value) {
  return `¥${Number(value || 0).toLocaleString("ja-JP")}`;
}

export default async function EstimateDetailPage({ params }) {
  if (isAuthSkipEnabled()) {
    return (
      <main className={styles.page}>
        <p className={styles.banner}>開発用スキップ中のため詳細は表示できません。</p>
        <Link href="/estimates">一覧へ</Link>
      </main>
    );
  }

  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: estimate } = await supabase
    .from("estimates")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!estimate) notFound();

  const { data: materials } = await supabase
    .from("estimate_materials")
    .select("*")
    .eq("estimate_id", id)
    .order("sort_order", { ascending: true });

  const { data: result } = await supabase
    .from("estimate_results")
    .select("*")
    .eq("estimate_id", id)
    .maybeSingle();

  const alerts = Array.isArray(estimate.risk_alerts)
    ? estimate.risk_alerts
    : [];
  const diff = result ? calcResultDiff(estimate, result) : null;

  return (
    <main className={styles.page}>
      <div className={styles.topNav}>
        <Link href="/estimates">← 一覧へ</Link>
        <h1>見積もり詳細</h1>
        <span />
      </div>

      <p className={styles.hint}>保存しました。内容を確認してください。</p>

      <div className={styles.actions}>
        <Link className={styles.buttonSecondary} href={`/estimates/${id}/edit`}>
          編集
        </Link>
        <Link className={styles.buttonSecondary} href={`/estimates/${id}/print`}>
          見積書を印刷
        </Link>
        <Link className={styles.button} href={`/estimates/${id}/result`}>
          実績入力
        </Link>
      </div>

      <section className={styles.section}>
        <h2>案件情報</h2>
        <div className={styles.detailBlock}>
          <p>案件名: {estimate.title}</p>
          <p>顧客名: {estimate.customer_name}</p>
          <p>作業場所: {estimate.work_location || "—"}</p>
          <p>見積番号: {estimate.estimate_no || "—（保存し直すと採番されます）"}</p>
          <p>見積もり日: {estimate.estimate_date}</p>
          <p>予定納期: {estimate.delivery_date || "—"}</p>
          <p>見積有効期限: {estimate.valid_until || "—"}</p>
          <p>顧客向け備考: {estimate.customer_note || "—"}</p>
          <p>ステータス: {STATUS_LABELS[estimate.status] || estimate.status}</p>
        </div>
      </section>

      <section className={styles.section}>
        <h2>作業条件・単価</h2>
        <div className={styles.detailBlock}>
          <p>
            人数 {estimate.worker_count} / 日数 {estimate.planned_days} / 負荷{" "}
            {WORKLOAD_LABELS[estimate.workload] || estimate.workload}
          </p>
          <p>
            消耗品込み: {estimate.includes_consumables ? "はい" : "いいえ"} /
            技術料込み: {estimate.includes_tech_fee ? "はい" : "いいえ"}
          </p>
          <p>作業内容: {estimate.work_description || "—"}</p>
          <p>
            推奨単価: {yen(estimate.recommended_unit_price)}（
            {estimate.recommended_price_label || "—"}）
          </p>
          <p>採用単価: {yen(estimate.unit_price)}</p>
        </div>
      </section>

      <section className={styles.section}>
        <h2>材料明細</h2>
        {(materials || []).length === 0 ? (
          <p className={styles.hint}>材料明細なし</p>
        ) : (
          <ul>
            {(materials || []).map((row) => (
              <li key={row.id}>
                {row.name} / 仕入 {yen(row.unit_purchase_price)} × {row.quantity}
                {row.unit || "個"} = {yen(row.line_total)}
              </li>
            ))}
          </ul>
        )}
        <p className={styles.hint}>
          掛け率 {estimate.material_markup_rate} / 材料費{" "}
          {yen(estimate.material_cost)}
        </p>
      </section>

      <section className={styles.section}>
        <h2>合計</h2>
        {alerts.length > 0 ? (
          <div className={styles.alerts}>
            <ul>
              {alerts.map((alert) => (
                <li key={alert}>{alert}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <ul className={styles.summaryList}>
          <li>
            <span>工賃</span>
            <span>{yen(estimate.labor_cost)}</span>
          </li>
          <li>
            <span>材料費</span>
            <span>{yen(estimate.material_cost)}</span>
          </li>
          <li>
            <span>消耗品費</span>
            <span>{yen(estimate.consumables_cost)}</span>
          </li>
          <li>
            <span>技術料</span>
            <span>{yen(estimate.tech_fee)}</span>
          </li>
          <li>
            <span>諸経費</span>
            <span>{yen(estimate.misc_cost)}</span>
          </li>
          <li>
            <span>小計（税抜）</span>
            <span>{yen(estimate.subtotal)}</span>
          </li>
          <li>
            <span>消費税</span>
            <span>{yen(estimate.tax_amount)}</span>
          </li>
        </ul>
        <p className={styles.total}>合計（税込）: {yen(estimate.total_with_tax)}</p>
      </section>

      <section className={styles.section}>
        <h2>判断理由メモ</h2>
        <p>単価: {estimate.reason_unit_price || "—"}</p>
        <p>人数・日数: {estimate.reason_manpower || "—"}</p>
        <p>納期: {estimate.reason_delivery || "—"}</p>
      </section>

      {result ? (
        <section className={styles.section}>
          <h2>実績</h2>
          <p>
            実際: {result.actual_worker_count}人 × {result.actual_days}日 /
            完了日 {result.completed_on}
          </p>
          <p>受注金額（税抜）: {yen(result.actual_order_amount)}</p>
          {diff ? (
            <ul className={styles.summaryList}>
              <li>
                <span>人日差</span>
                <span>{diff.personDaysDiff}</span>
              </li>
              <li>
                <span>材料仕入差</span>
                <span>{yen(diff.materialPurchaseDiff)}</span>
              </li>
              <li>
                <span>その他費用差</span>
                <span>{yen(diff.otherCostDiff)}</span>
              </li>
              <li>
                <span>金額差（税抜）</span>
                <span>{yen(diff.amountDiff)}</span>
              </li>
            </ul>
          ) : null}
          <p>差分の理由: {result.diff_reason || "—"}</p>
          <p>次回への気づき: {result.next_insight || "—"}</p>
        </section>
      ) : (
        <section className={styles.section}>
          <h2>実績</h2>
          <p className={styles.hint}>まだ実績が入力されていません。</p>
        </section>
      )}
    </main>
  );
}
