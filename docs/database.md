# 見積もりアプリ Version 1 データベース設計

前提: `docs/requirements.md`、`docs/screens.md`、`docs/routes.md` を反映する。  
DB: Supabase（PostgreSQL）  
この文書は設計のみ。SQL・接続コードは別ステップで実装する。

## 1. 設計方針

- 見積もりと判断理由はあとから検証できる形で保存する（合計だけでなく入力値も残す）
- 推奨単価と採用単価を両方保存し、どれだけ調整したかを追えるようにする
- 見積もりと実績は別テーブルとし、見積もりIDで紐づける
- 材料明細は複数行あるため、見積もり本体とは別テーブルにする
- 利用者は1〜2名。すべての業務テーブルに `user_id` を持ち、`auth.users` と紐づける
- RLSを有効にし、本人のデータのみ読み書きできるようにする
- Version 1では顧客マスタ、設定マスタ、作業パターン、画像テーブルは作らない

## 2. テーブル一覧

| テーブル名 | 役割 | なぜ必要か |
|---|---|---|
| `estimates` | 見積もりの本体（案件情報・作業条件・単価・費用・合計・判断理由・ステータス） | `/estimates/new`・詳細・編集の中心データ |
| `estimate_materials` | 見積もりの材料明細（1見積もりに複数行） | 材料名ごとの仕入れ単価・数量を残すため |
| `estimate_results` | 作業後の実績と差分メモ（1見積もりに0または1件） | 事業検証・学習材料として見積もりと比較するため |

補足: Supabase組み込みの `auth.users` はログインユーザー管理用。アプリ側でユーザーテーブルは新規作成しない。

## 3. ER関係（概要）

```
auth.users (1)
  └─ estimates (多)           … user_id
       ├─ estimate_materials (多) … estimate_id
       └─ estimate_results (0..1) … estimate_id（ユニーク）
```

## 4. テーブル詳細

### 4-1. `estimates`（見積もり本体）

#### 役割
1件の見積もりを表す。一覧・詳細・編集・保存の主テーブル。

#### なぜこのテーブルが必要か
案件情報から合計・判断理由まで、画面上のほとんどの項目を1レコードで扱えるようにするため。計算結果も保存し、後から「当時いくらと出したか」を再現できるようにする。

#### カラム

| カラム名 | データ型 | NULL | 説明 |
|---|---|---|---|
| `id` | `uuid` | NO | 主キー。デフォルト `gen_random_uuid()` |
| `user_id` | `uuid` | NO | 作成者。`auth.users.id` への外部キー |
| `title` | `text` | NO | 案件名 |
| `customer_name` | `text` | NO | 顧客名 |
| `work_location` | `text` | YES | 作業場所 |
| `estimate_date` | `date` | NO | 見積もり日 |
| `delivery_date` | `date` | YES | 顧客提示予定納期 |
| `worker_count` | `integer` | NO | 作業人数 |
| `planned_days` | `numeric(6,1)` | NO | 想定日数（半日など小数を許容） |
| `workload` | `text` | NO | 作業負荷。`low` / `medium` / `high` |
| `includes_consumables` | `boolean` | NO | 消耗品を含むか。デフォルト `false` |
| `includes_tech_fee` | `boolean` | NO | 技術料を含むか。デフォルト `false` |
| `work_description` | `text` | YES | 作業内容の簡単な説明 |
| `recommended_unit_price` | `integer` | NO | 推奨1人1日単価（円） |
| `recommended_price_label` | `text` | YES | 推奨の根拠ライン名（例: 会社維持ライン） |
| `unit_price` | `integer` | NO | 採用単価（円） |
| `labor_cost` | `integer` | NO | 工賃（円） |
| `material_markup_rate` | `numeric(6,2)` | NO | 材料の掛け率。デフォルト `1.00` |
| `material_purchase_total` | `integer` | NO | 材料仕入れ合計（円）。デフォルト `0` |
| `material_cost` | `integer` | NO | 材料費（仕入れ合計 × 掛け率）（円）。デフォルト `0` |
| `consumables_cost` | `integer` | NO | 消耗品費（円）。デフォルト `0` |
| `tech_fee` | `integer` | NO | 技術料（円）。デフォルト `0` |
| `misc_cost` | `integer` | NO | 諸経費（円）。デフォルト `0` |
| `subtotal` | `integer` | NO | 小計・税抜（円） |
| `tax_rate` | `numeric(4,2)` | NO | 消費税率。Version 1は `0.10` 固定 |
| `tax_amount` | `integer` | NO | 消費税額（円） |
| `total_with_tax` | `integer` | NO | 合計・税込（円） |
| `reason_unit_price` | `text` | YES | 単価を決めた理由 |
| `reason_manpower` | `text` | YES | 人数・日数を決めた理由 |
| `reason_delivery` | `text` | YES | 納期を決めた理由 |
| `risk_alerts` | `jsonb` | NO | 保存時点のアラート文言配列。デフォルト `[]` |
| `status` | `text` | NO | `draft` / `presented` / `won` / `lost` / `done`。デフォルト `draft` |
| `created_at` | `timestamptz` | NO | 作成日時。デフォルト `now()` |
| `updated_at` | `timestamptz` | NO | 更新日時。デフォルト `now()` |

#### 主キー
- `id`

#### 外部キー
- `user_id` → `auth.users(id)`（ON DELETE CASCADE）

#### チェック制約（推奨）
- `workload IN ('low', 'medium', 'high')`
- `status IN ('draft', 'presented', 'won', 'lost', 'done')`
- `worker_count >= 0`
- `planned_days >= 0`
- `unit_price >= 0`
- `material_markup_rate >= 0`

#### ユニーク制約
- なし（同じ案件名の再見積もりを許容する）

#### インデックス候補
- `estimates_user_id_idx` … `(user_id)`
- `estimates_user_estimate_date_idx` … `(user_id, estimate_date DESC)`（一覧の新しい順）
- `estimates_user_status_idx` … `(user_id, status)`（将来の絞り込み用）

#### 補足
- 延べ人日・推奨との差額・1人日あたり実質単価は、表示時に計算してよい。Version 1では必須カラムにしない
- `risk_alerts` は画面表示用に再計算もできるが、保存時点の警告を残すためにJSONBで保持する

---

### 4-2. `estimate_materials`（材料明細）

#### 役割
見積もり1件に紐づく材料の行データ。

#### なぜこのテーブルが必要か
材料は「ボルト」「ホース」など複数行になる。本体テーブルに押し込むと後から検証しづらいため、行ごとに分ける。

#### カラム

| カラム名 | データ型 | NULL | 説明 |
|---|---|---|---|
| `id` | `uuid` | NO | 主キー。デフォルト `gen_random_uuid()` |
| `estimate_id` | `uuid` | NO | 親見積もり。`estimates.id` への外部キー |
| `user_id` | `uuid` | NO | 所有者。RLS用。`auth.users.id` への外部キー |
| `name` | `text` | NO | 材料名 |
| `unit_purchase_price` | `integer` | NO | 仕入れ単価（円） |
| `quantity` | `numeric(10,2)` | NO | 数量 |
| `line_total` | `integer` | NO | 行合計（仕入れ単価 × 数量）（円） |
| `sort_order` | `integer` | NO | 表示順。デフォルト `0` |
| `created_at` | `timestamptz` | NO | 作成日時。デフォルト `now()` |

#### 主キー
- `id`

#### 外部キー
- `estimate_id` → `estimates(id)`（ON DELETE CASCADE）
- `user_id` → `auth.users(id)`（ON DELETE CASCADE）

#### ユニーク制約
- なし

#### インデックス候補
- `estimate_materials_estimate_id_idx` … `(estimate_id, sort_order)`
- `estimate_materials_user_id_idx` … `(user_id)`

#### 補足
- 掛け率は見積もり全体で1つ（`estimates.material_markup_rate`）とする。行ごとの掛け率は Version 1では持たない
- 編集時は「親見積もりの明細を削除して入れ直す」か「差分更新」のどちらかでよい。初学者向けには入れ直しが簡単

---

### 4-3. `estimate_results`（実績）

#### 役割
見積もり1件に対する作業後の実績と差分メモ。

#### なぜこのテーブルが必要か
見積もり判断を学習材料として残すため。本体を上書きすると「当時の見積もり」が消えるので、別テーブルにする。1見積もりにつき実績は1件までとする。

#### カラム

| カラム名 | データ型 | NULL | 説明 |
|---|---|---|---|
| `id` | `uuid` | NO | 主キー。デフォルト `gen_random_uuid()` |
| `estimate_id` | `uuid` | NO | 対象見積もり。`estimates.id` への外部キー |
| `user_id` | `uuid` | NO | 所有者。RLS用。`auth.users.id` への外部キー |
| `actual_worker_count` | `integer` | NO | 実際の作業人数 |
| `actual_days` | `numeric(6,1)` | NO | 実際の作業日数 |
| `actual_material_purchase_total` | `integer` | NO | 実際の材料仕入れ合計（円）。デフォルト `0` |
| `actual_consumables_cost` | `integer` | NO | 実際の消耗品費（円）。デフォルト `0` |
| `actual_tech_fee` | `integer` | NO | 実際の技術料（円）。デフォルト `0` |
| `actual_misc_cost` | `integer` | NO | 実際の諸経費（円）。デフォルト `0` |
| `actual_order_amount` | `integer` | NO | 実際の受注金額・税抜（円） |
| `completed_on` | `date` | NO | 作業完了日 |
| `diff_reason` | `text` | YES | 差分の理由 |
| `next_insight` | `text` | YES | 次回に向けた気づき |
| `created_at` | `timestamptz` | NO | 作成日時。デフォルト `now()` |
| `updated_at` | `timestamptz` | NO | 更新日時。デフォルト `now()` |

#### 主キー
- `id`

#### 外部キー
- `estimate_id` → `estimates(id)`（ON DELETE CASCADE）
- `user_id` → `auth.users(id)`（ON DELETE CASCADE）

#### ユニーク制約
- `estimate_results_estimate_id_key` … `estimate_id`（1見積もりに実績は1件）

#### インデックス候補
- `estimate_results_user_id_idx` … `(user_id)`
- `estimate_results_estimate_id_idx` … `(estimate_id)`（ユニーク制約で実質カバー）

#### 補足
- 人日差・金額差・実質単価差は、見積もり側の値と突き合わせてアプリ側で計算してよい
- 「実績入力済みか」は一覧で `estimate_results` の有無（LEFT JOIN または存在確認）で判定する

## 5. auth.users との関係

| アプリテーブル | 関係 | 意味 |
|---|---|---|
| `estimates.user_id` | → `auth.users.id` | 見積もりの所有者 |
| `estimate_materials.user_id` | → `auth.users.id` | 明細の所有者（親と同じユーザー） |
| `estimate_results.user_id` | → `auth.users.id` | 実績の所有者（親と同じユーザー） |

- ログインは Supabase Auth を使う前提
- Version 1ではプロフィール用の `profiles` テーブルは作らない（必要になったら後続）
- `estimate_materials` / `estimate_results` にも `user_id` を持たせる理由: RLSを各テーブルでシンプルに書けるため。親経由だけにするとポリシーが複雑になりやすい

## 6. RLS（Row Level Security）

すべての業務テーブルで RLS を有効にする。

### 共通ルール
- 認証済みユーザーのみアクセス可能
- `user_id = auth.uid()` の行だけ SELECT / INSERT / UPDATE / DELETE 可能
- 他人の見積もり・明細・実績は見えない・触れない

### テーブル別

#### `estimates`
- SELECT: `user_id = auth.uid()`
- INSERT: `user_id = auth.uid()`（自分のID以外では作れない）
- UPDATE: `user_id = auth.uid()`
- DELETE: `user_id = auth.uid()`

#### `estimate_materials`
- SELECT / INSERT / UPDATE / DELETE: `user_id = auth.uid()`
- 追加推奨: 親見積もりも自分のものに限定する  
  （`estimate_id` が、同じ `user_id` の `estimates` に存在すること）

#### `estimate_results`
- SELECT / INSERT / UPDATE / DELETE: `user_id = auth.uid()`
- 追加推奨: 親見積もりも自分のものに限定する
- ユニーク制約により、同じ見積もりへの二重作成はDB側で防ぐ

### Version 1でやらないRLS
- ロール別権限（管理者・一般）
- 家族間での共有ポリシー（必要なら後で `shared_with` 等を検討）
- 匿名公開用ポリシー

## 7. 画面との対応

| 画面 | 主な読み書き |
|---|---|
| `/estimates/new` | `estimates` INSERT、`estimate_materials` INSERT |
| `/estimates/[id]` | `estimates` SELECT、`estimate_materials` SELECT、`estimate_results` SELECT |
| `/estimates` | `estimates` SELECT（必要なら results の有無も） |
| `/estimates/[id]/edit` | `estimates` UPDATE、材料明細の入れ直し |
| `/estimates/[id]/result` | `estimate_results` INSERT または UPDATE |

## 8. Version 1で作らないテーブル

- `customers`（顧客マスタ）
- `settings` / `unit_price_options`（単価候補はアプリ定数で持つ）
- `work_patterns`（作業パターン）
- `estimate_images` / Storage連携テーブル
- 安全マップ・3D・CAD関連テーブル
- `profiles`（当面は `auth.users` のみ）

## 9. 実装時の注意

- SQL・マイグレーション・Supabase接続コードはこの文書では書かない
- `.env.local` に URL / Anon Key を置き、Git管理しない
- 金額は円単位の整数（`integer`）で扱い、小数誤差を避ける
- 日数だけ小数（半日）を許容する
- `updated_at` はトリガーで自動更新すると安全（実装ステップで追加）
- まずはローカル計算が動く画面を作り、その後にこの設計で保存・読込を接続する
