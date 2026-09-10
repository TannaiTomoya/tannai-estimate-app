# 見積書印刷 設計（Version 1.1）

## 目的
`/estimates/[id]` の内容から、顧客に渡せる見積書を A4 で印刷・PDF 保存する。
社内情報（推奨単価・仕入れ単価・判断理由など）は一切印字しない。

## ルート
| パス | 内容 |
|---|---|
| `/estimates/[id]/print` | 見積書レイアウト。`?detail=1` で作業費の内訳（人数×日数×単価）を表示 |

- 詳細画面の操作ボタンに「見積書を印刷」を追加
- 認証は既存 middleware で保護
- PDF 化はブラウザ標準の印刷 → 「PDF として保存」（ライブラリ不要）

## 自社情報
- `lib/company.js` の `getCompany()` が環境変数 `COMPANY_*` から読む（`docs/env-setup.md`）
- リポジトリが公開のため、コードに住所・電話・登録番号は書かない
- 空欄の項目は行ごと非表示

## 印字する項目
| 欄 | 元データ | ルール |
|---|---|---|
| 見積番号 | `estimates.estimate_no` | `YYYYMMDD-NN`。新規保存時に RPC が同日連番で採番。更新では不変 |
| 見積日 | `estimate_date` | `2026年9月4日` 形式 |
| 有効期限 | `valid_until` | 既定 = 見積日 + `COMPANY_VALID_DAYS`（30）。フォームで変更可 |
| 宛名 | `customer_name` + 「御中」 | 固定 |
| 件名 | `title` | |
| 作業内容 | `work_description` | 空なら非表示 |
| 作業場所 | `work_location` | 空なら非表示 |
| 納期 | `delivery_date` | 空なら「別途ご相談」 |
| 加工費 | `labor_cost` | 常に1行目。数量1・単位「式」・単価「—」。`?detail=1` で `（2人 × 3日 × @¥50,000）` を補記 |
| 材料 | `estimate_materials` 全行 | 品名・数量・単位（`unit`）・単価・金額 |
| 材料の単価 | `round(unit_purchase_price × material_markup_rate)` | 仕入れ単価・掛け率は非表示 |
| 材料の金額 | `round(line_total × material_markup_rate)` | 最終行で丸め差を吸収し、材料合計 = `material_cost` |
| 消耗品費 / 技術料 / 諸経費 | 各列 | 0円は行ごと省略。数量1・式 |
| 小計 / 消費税(10%) / 合計（税込） | `subtotal` / `tax_amount` / `total_with_tax` | |
| 備考 | `customer_note`（無ければ `COMPANY_DEFAULT_NOTE`） | 両方空なら欄ごと非表示 |
| 発行者 | `COMPANY_*` | 社名・〒・住所・TEL/FAX・登録番号 |

## 印字しない項目
推奨単価・推奨ライン・差額 / 作業負荷 / 人数・日数・単価（detail OFF 時）/ 仕入れ単価・掛け率 /
消耗品込み・技術料込みフラグ / リスクアラート / 判断理由メモ / 実績・差分 / ステータス / 実質単価

## DB 変更（`supabase/migrations/0004_print_fields.sql`）
- `estimates.estimate_no text` / `valid_until date` / `customer_note text`（NULL 許容）
- `estimate_materials.unit text not null default '個'`
- `save_estimate()` を差し替え（採番・新列・単位対応）

## フォーム変更
- 材料行に「単位」欄（候補: 個・枚・本・m・kg・式・セット、自由入力可）
- 新セクション「顧客向け情報」: 有効期限（date）・顧客向け備考（textarea）

## 印刷 CSS
- `@page { size: A4 portrait; margin: 15mm }`
- 白背景・黒文字・ゴシック
- ツールバー（印刷ボタン・内訳トグル・戻る）は `@media print` で非表示
- Three.js 背景は印刷時 `display: none`
