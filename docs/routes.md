# 見積もりアプリ Version 1 ルーティング設計

前提: `docs/requirements.md`、`docs/screens.md`、画面設計の決定事項（Q1〜Q5）を反映する。

## 方針

- Next.js App Router を使う
- ページは `page.js` ベース（JavaScript、TypeScriptは使わない）
- Version 1の入口は `/estimates`
- 最優先で実装する画面は `/estimates/new`
- `/dashboard` と `/settings` は Version 1では作らない

## ルート一覧

| パス | ファイル想定 | 画面 | 備考 |
|---|---|---|---|
| `/` | `app/page.js` | （入口） | `/estimates` へ誘導またはリダイレクト |
| `/estimates` | `app/estimates/page.js` | 一覧 | ログイン後のメイン入口 |
| `/estimates/new` | `app/estimates/new/page.js` | 新規作成 | Version 1最優先 |
| `/estimates/[id]` | `app/estimates/[id]/page.js` | 詳細 | 保存後の着地 |
| `/estimates/[id]/edit` | `app/estimates/[id]/edit/page.js` | 編集 | new と同じフォームを再利用 |
| `/estimates/[id]/result` | `app/estimates/[id]/result/page.js` | 実績入力 | 見積もりとの差分を記録 |

## ディレクトリ構成（想定）

```
app/
  page.js
  layout.js
  estimates/
    page.js
    new/
      page.js
    [id]/
      page.js
      edit/
        page.js
      result/
        page.js
```

## 遷移ルール

### 新規作成
1. `/estimates` → `/estimates/new`
2. 保存成功 → `/estimates/[id]`

### 編集
1. `/estimates/[id]` → `/estimates/[id]/edit`
2. 保存成功 → `/estimates/[id]`

### 実績入力
1. `/estimates/[id]` → `/estimates/[id]/result`
2. 保存成功 → `/estimates/[id]`

### 一覧への戻り
- 詳細・新規・編集・実績のいずれからも `/estimates` へ戻れること

## 実装順（推奨）

1. `/estimates/new`（計算と表示が動く状態。保存は後でも可）
2. `/estimates/[id]`（詳細。保存後の着地）
3. `/estimates`（一覧）
4. `/estimates/[id]/edit`（new の再利用）
5. `/estimates/[id]/result`（実績）
6. `/`（一覧への誘導）

### 実績入力についての注記

- `/estimates/[id]/result` は実装順では最後だが、Version 1の完了条件に含める
- 実績入力がないと、父の見積もり判断が学習材料として残らない
- 事業検証上は必須機能として扱う

## Version 1で作らないルート

- `/dashboard`
- `/settings`
- 安全マップ・3D・CAD関連のルート

## 補足

- Supabase連携・認証・RLSは別ステップで実装する
- このドキュメントではルーティングと画面の対応だけを定義する
- コンポーネント配置の詳細は実装時に `components/` へ分ける
