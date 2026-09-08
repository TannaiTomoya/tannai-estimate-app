import LoginForm from "./LoginForm";
import { isAuthSkipEnabled } from "@/lib/auth-skip";
import styles from "./login.module.css";

export const metadata = {
  title: "ログイン | 見積もりアプリ",
};

export default function LoginPage() {
  const skip = isAuthSkipEnabled();

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>見積もりアプリ</h1>
        <p className={styles.help}>
          管理者パスワードを入力してください。ログインできない場合は、智弥に連絡してください。
        </p>
        {skip ? (
          <p className={styles.error}>
            開発用スキップ中です。本番ではこの表示は出ません。
          </p>
        ) : null}
        <LoginForm />
      </div>
    </main>
  );
}
