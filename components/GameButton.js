"use client";

import Link from "next/link";
import styles from "./GameButton.module.css";

export default function GameButton({
  href,
  children,
  variant = "a",
  onClick,
  type = "button",
  className = "",
}) {
  const classNames = [
    styles.btn,
    styles[variant] || styles.a,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (href) {
    return (
      <Link href={href} className={classNames}>
        <span className={styles.face}>{children}</span>
      </Link>
    );
  }

  return (
    <button type={type} className={classNames} onClick={onClick}>
      <span className={styles.face}>{children}</span>
    </button>
  );
}
