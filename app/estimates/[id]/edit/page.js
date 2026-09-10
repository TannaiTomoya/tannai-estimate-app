import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import EstimateForm from "@/components/EstimateForm";
import { createClient } from "@/utils/supabase/server";
import { isAuthSkipEnabled } from "@/lib/auth-skip";
import { getCompany } from "@/lib/company";
import styles from "@/components/estimate-form.module.css";

export const metadata = {
  title: "見積もり編集 | 見積もりアプリ",
};

export default async function EditEstimatePage({ params }) {
  if (isAuthSkipEnabled()) {
    return (
      <main className={styles.page}>
        <p className={styles.banner}>開発用スキップ中のため編集できません。</p>
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

  return (
    <main>
      <div className={styles.page}>
        <div className={styles.topNav}>
          <Link href={`/estimates/${id}`}>← 詳細へ</Link>
          <h1>見積もり編集</h1>
          <span />
        </div>
      </div>
      <EstimateForm
        initialEstimate={{ ...estimate, materials: materials || [] }}
        validDays={getCompany().validDays}
      />
    </main>
  );
}
