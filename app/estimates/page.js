import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { isAuthSkipEnabled } from "@/lib/auth-skip";
import { logoutAction } from "@/app/actions";
import { STATUS_LABELS } from "@/lib/constants";
import styles from "./estimates.module.css";

export const metadata = {
  title: "見積もり一覧 | 見積もりアプリ",
};

function formatYen(value) {
  return `¥${Number(value || 0).toLocaleString("ja-JP")}`;
}

export default async function EstimatesPage() {
  const skip = isAuthSkipEnabled();
  let estimates = [];
  let resultIds = new Set();

  if (!skip) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const { data } = await supabase
      .from("estimates")
      .select(
        "id, estimate_date, title, customer_name, total_with_tax, status",
      )
      .order("estimate_date", { ascending: false })
      .order("created_at", { ascending: false });

    estimates = data || [];

    if (estimates.length > 0) {
      const { data: results } = await supabase
        .from("estimate_results")
        .select("estimate_id")
        .in(
          "estimate_id",
          estimates.map((item) => item.id),
        );
      resultIds = new Set((results || []).map((item) => item.estimate_id));
    }
  }

  return (
    <main className={styles.shell}>
      {skip ? (
        <p className={styles.banner}>開発用スキップ中（本番では使用しません）</p>
      ) : null}

      <header className={styles.header}>
        <div>
          <p className={styles.brand}>Tannai Kenki Service</p>
          <h1>見積もりアプリ</h1>
        </div>
        {!skip ? (
          <form action={logoutAction}>
            <button className={styles.logoutButton} type="submit">
              LOGOUT
            </button>
          </form>
        ) : null}
      </header>

      <div className={styles.actions}>
        <Link className={styles.primaryLink} href="/estimates/new">
          新規見積もりを作成する
        </Link>
      </div>

      <section className={styles.tableWrap}>
        <h2 className={styles.tableTitle}>Archive / 過去の見積もり一覧</h2>
        {estimates.length === 0 ? (
          <p className={styles.empty}>まだ見積もりがありません。上のボタンから作成してください。</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>見積もり日</th>
                <th>案件名</th>
                <th>顧客名</th>
                <th>合計（税込）</th>
                <th>ステータス</th>
                <th>実績</th>
              </tr>
            </thead>
            <tbody>
              {estimates.map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link href={`/estimates/${item.id}`}>{item.estimate_date}</Link>
                  </td>
                  <td>
                    <Link href={`/estimates/${item.id}`}>{item.title}</Link>
                  </td>
                  <td>{item.customer_name}</td>
                  <td>{formatYen(item.total_with_tax)}</td>
                  <td>{STATUS_LABELS[item.status] || item.status}</td>
                  <td>{resultIds.has(item.id) ? "入力済み" : "未入力"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
