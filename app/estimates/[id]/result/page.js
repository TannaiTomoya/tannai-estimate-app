import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import EstimateResultForm from "@/components/EstimateResultForm";
import { createClient } from "@/utils/supabase/server";
import { isAuthSkipEnabled } from "@/lib/auth-skip";
import styles from "@/components/estimate-form.module.css";

export const metadata = {
  title: "実績入力 | 見積もりアプリ",
};

export default async function EstimateResultPage({ params }) {
  if (isAuthSkipEnabled()) {
    return (
      <main className={styles.page}>
        <p className={styles.banner}>開発用スキップ中のため実績入力できません。</p>
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

  return (
    <main>
      <div className={styles.page}>
        <div className={styles.topNav}>
          <Link href={`/estimates/${id}`}>← 詳細へ</Link>
          <h1>実績入力</h1>
          <span />
        </div>
      </div>
      <EstimateResultForm estimate={estimate} />
    </main>
  );
}
