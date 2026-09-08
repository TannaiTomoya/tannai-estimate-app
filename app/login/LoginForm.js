"use client";

import { useState } from "react";
import { loginAction } from "@/app/actions";
import styles from "./login.module.css";

export default function LoginForm() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setPending(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const result = await loginAction(formData);

    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.field}>
        <label htmlFor="password">管理者パスワード</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      <button className={styles.button} type="submit" disabled={pending}>
        {pending ? "ログイン中..." : "ログイン"}
      </button>
    </form>
  );
}
