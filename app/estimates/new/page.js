import Link from "next/link";
import EstimateForm from "@/components/EstimateForm";
import { isAuthSkipEnabled } from "@/lib/auth-skip";
import { getCompany } from "@/lib/company";
import styles from "@/components/estimate-form.module.css";

export const metadata = {
  title: "新規見積もり | 見積もりアプリ",
};

export default function NewEstimatePage() {
  const skip = isAuthSkipEnabled();
  const company = getCompany();

  return (
    <main>
      <div className={styles.page}>
        <div className={styles.topNav}>
          <Link href="/estimates">← 一覧へ</Link>
          <h1>新規見積もり作成</h1>
          <span />
        </div>
      </div>
      <EstimateForm
        authSkipped={skip}
        validDays={company.validDays}
        defaultStaff={company.defaultStaff}
      />
    </main>
  );
}
