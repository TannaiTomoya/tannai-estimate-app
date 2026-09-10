import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { isAuthSkipEnabled } from "@/lib/auth-skip";
import { getCompany } from "@/lib/company";
import {
  buildQuoteLines,
  formatJaDate,
  formatYenPlain,
} from "@/lib/estimate-print";
import { describeDbError } from "@/lib/db-error";
import PrintToolbar from "./PrintToolbar";
import styles from "./print.module.css";

export const metadata = {
  title: "見積書 | 見積もりアプリ",
};

export default async function EstimatePrintPage({ params, searchParams }) {
  if (isAuthSkipEnabled()) {
    return (
      <main className={styles.wrap}>
        <p className={styles.warn}>開発用スキップ中のため見積書は表示できません。</p>
        <Link href="/estimates">一覧へ</Link>
      </main>
    );
  }

  const { id } = await params;
  const query = (await searchParams) || {};
  const showDetail = query.detail === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: estimate, error } = await supabase
    .from("estimates")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return (
      <main className={styles.wrap}>
        <p className={styles.warn}>{describeDbError(error, "print.estimates.select")}</p>
      </main>
    );
  }
  if (!estimate) notFound();

  const { data: materials } = await supabase
    .from("estimate_materials")
    .select("*")
    .eq("estimate_id", id)
    .order("sort_order", { ascending: true });

  const company = getCompany();
  const lines = buildQuoteLines(estimate, materials || [], { showLaborDetail: showDetail });
  const note = estimate.customer_note || company.defaultNote || "";
  const taxPercent = Math.round((Number(estimate.tax_rate) || 0.1) * 100);

  const missingCompany = !company.name;

  return (
    <main className={styles.wrap}>
      <PrintToolbar estimateId={id} showDetail={showDetail} />

      {missingCompany ? (
        <p className={`${styles.warn} no-print`}>
          自社情報（COMPANY_NAME など）が環境変数に設定されていません。発行者欄が空になります。
          設定方法は docs/env-setup.md を参照してください。
        </p>
      ) : null}
      {!estimate.estimate_no ? (
        <p className={`${styles.warn} no-print`}>
          この見積もりには見積番号がありません。編集画面で一度保存すると採番されます。
        </p>
      ) : null}

      <article className={styles.sheet}>
        <h1 className={styles.title}>御見積書</h1>

        <div className={styles.head}>
          <div className={styles.headLeft}>
            <div className={styles.customer}>{estimate.customer_name} 御中</div>
            <p className={styles.greeting}>下記のとおりお見積り申し上げます。</p>
          </div>
          <div className={styles.headRight}>
            {estimate.estimate_no ? <p>見積番号: {estimate.estimate_no}</p> : null}
            <p>見積日: {formatJaDate(estimate.estimate_date)}</p>
            {estimate.valid_until ? (
              <p>有効期限: {formatJaDate(estimate.valid_until)}</p>
            ) : null}
            <div className={styles.issuer}>
              {company.name ? <p className={styles.issuerName}>{company.name}</p> : null}
              {company.representative ? <p>{company.representative}</p> : null}
              {company.postalCode ? <p>〒{company.postalCode}</p> : null}
              {company.address ? <p>{company.address}</p> : null}
              {company.tel || company.fax ? (
                <p>
                  {company.tel ? `TEL ${company.tel}` : ""}
                  {company.tel && company.fax ? "　" : ""}
                  {company.fax ? `FAX ${company.fax}` : ""}
                </p>
              ) : null}
              {company.invoiceNumber ? <p>登録番号 {company.invoiceNumber}</p> : null}
            </div>
          </div>
        </div>

        <table className={styles.meta}>
          <tbody>
            <tr>
              <th>件　名</th>
              <td>{estimate.title}</td>
            </tr>
            {estimate.work_description ? (
              <tr>
                <th>作業内容</th>
                <td>{estimate.work_description}</td>
              </tr>
            ) : null}
            {estimate.work_location ? (
              <tr>
                <th>作業場所</th>
                <td>{estimate.work_location}</td>
              </tr>
            ) : null}
            <tr>
              <th>納　期</th>
              <td>
                {estimate.delivery_date
                  ? formatJaDate(estimate.delivery_date)
                  : "別途ご相談"}
              </td>
            </tr>
          </tbody>
        </table>

        <div className={styles.total}>
          <span>お見積金額（税込）</span>
          <span className={styles.totalValue}>
            ¥{formatYenPlain(estimate.total_with_tax)}
          </span>
        </div>

        <table className={styles.lines}>
          <thead>
            <tr>
              <th style={{ width: "46%" }}>品名</th>
              <th>数量</th>
              <th>単位</th>
              <th>単価</th>
              <th>金額</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={`${line.name}-${i}`}>
                <td className={styles.name}>
                  {line.name}
                  {line.detail ? <span className={styles.detail}>{line.detail}</span> : null}
                </td>
                <td className={styles.num}>{line.quantity}</td>
                <td className={styles.unit}>{line.unit}</td>
                <td className={styles.num}>
                  {line.unitPrice == null ? "—" : formatYenPlain(line.unitPrice)}
                </td>
                <td className={styles.num}>{formatYenPlain(line.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <table className={styles.sums}>
          <tbody>
            <tr>
              <th>小計（税抜）</th>
              <td>¥{formatYenPlain(estimate.subtotal)}</td>
            </tr>
            <tr>
              <th>消費税（{taxPercent}%）</th>
              <td>¥{formatYenPlain(estimate.tax_amount)}</td>
            </tr>
            <tr className={styles.grand}>
              <th>合計（税込）</th>
              <td>¥{formatYenPlain(estimate.total_with_tax)}</td>
            </tr>
          </tbody>
        </table>

        {note ? (
          <div className={styles.note}>
            <div className={styles.noteLabel}>備考</div>
            {note}
          </div>
        ) : null}
      </article>
    </main>
  );
}
