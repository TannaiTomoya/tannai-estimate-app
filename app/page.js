import Link from "next/link";
import GameButton from "@/components/GameButton";
import styles from "./page.module.css";

export const metadata = {
  title: "見積もりアプリ | 丹内建機サービス",
  description:
    "丹内建機サービス向け見積もり作成アプリ。ログインから保存・実績入力まで直感的に進めます。",
};

const STEPS = [
  {
    no: "01",
    title: "ログイン",
    body: "管理者パスワードを入力してスタート。メール入力は不要です。",
    tip: "パスワードは智弥から受け取ったものを使います。",
  },
  {
    no: "02",
    title: "新規作成",
    body: "「新規見積もりを作成する」を押して、案件名・顧客名を入れます。",
    tip: "1画面ですべて入力できます。途中ページ分けはありません。",
  },
  {
    no: "03",
    title: "条件と単価",
    body: "人数・日数・負荷を入れると、推奨単価が参考表示されます。候補から選ぶか、手動で調整します。",
    tip: "推奨はたたき台です。最後は自分の判断でOK。",
  },
  {
    no: "04",
    title: "費用と合計",
    body: "材料・消耗品・技術料・諸経費を足すと、税込合計と注意アラートが出ます。",
    tip: "安すぎる単価などは画面が教えてくれます。",
  },
  {
    no: "05",
    title: "理由を書いて保存",
    body: "なぜその単価・人数にしたかをメモして保存。詳細画面で内容を確認できます。",
    tip: "保存後に編集や実績入力へ進めます。",
  },
  {
    no: "06",
    title: "実績で振り返る",
    body: "作業後に実績を入れると、見積もりとの差分が残ります。次回の精度アップに使います。",
    tip: "ここまでが Version 1 のゴールです。",
  },
];

export default function HomePage() {
  return (
    <main className={styles.wrap}>
      <div className={styles.device}>
        <div className={styles.speaker}>
          <span />
          <span />
          <span />
          <span />
        </div>

        <p className={styles.brand}>TANNAI KENKI SERVICE</p>
        <h1 className={styles.title}>見積もりアプリ</h1>
        <p className={styles.lead}>
          父の経験を見える化し、実案件1件の見積もりをすばやく作るためのアプリです。
          下のステージどおり進めれば迷いません。
        </p>

        <section className={styles.screen} aria-label="遊び方">
          <p className={styles.screenLabel}>HOW TO PLAY</p>
          <ol className={styles.steps}>
            {STEPS.map((step) => (
              <li key={step.no} className={styles.step}>
                <div className={styles.stepNo}>{step.no}</div>
                <div>
                  <h2>{step.title}</h2>
                  <p>{step.body}</p>
                  <p className={styles.tip}>{step.tip}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.controls} aria-label="操作">
          <div className={styles.dpad} aria-hidden="true">
            <span className={styles.dpadUp} />
            <span className={styles.dpadLeft} />
            <span className={styles.dpadCenter} />
            <span className={styles.dpadRight} />
            <span className={styles.dpadDown} />
          </div>

          <div className={styles.actionCluster}>
            <div className={styles.abRow}>
              <div className={styles.abItem}>
                <GameButton href="/login" variant="b">
                  B ログイン
                </GameButton>
                <span className={styles.abLabel}>PASSWORD</span>
              </div>
              <div className={styles.abItem}>
                <GameButton href="/login" variant="a">
                  A スタート
                </GameButton>
                <span className={styles.abLabel}>BEGIN</span>
              </div>
            </div>
            <GameButton href="/login" variant="primary">
              ゲーム開始（ログインへ）
            </GameButton>
            <GameButton href="/estimates" variant="start">
              Select / 一覧へ
            </GameButton>
          </div>
        </section>

        <p className={styles.note}>
          一覧・作成画面はログイン後のみ開けます。使い方はこのページに戻ればいつでも確認できます。
          {" "}
          <Link href="/login">ログイン画面へ</Link>
        </p>
      </div>
    </main>
  );
}
