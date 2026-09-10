# Supabase マイグレーション

`migrations/` の SQL を **番号順** に Supabase ダッシュボードの SQL Editor で実行する。
すべて冪等（何度流しても同じ状態になる）なので、既存 DB に流しても壊れない。

| ファイル | 内容 | 既存 DB への適用 |
|---|---|---|
| `0001_schema.sql` | 3テーブル・制約・インデックス・`updated_at` トリガー | 実行推奨（トリガーが追加される） |
| `0002_rls_and_grants.sql` | GRANT・RLS・ポリシー | 実行推奨（GRANT 漏れを防ぐ） |
| `0003_save_estimate_rpc.sql` | `save_estimate()` 関数（本体＋明細を1トランザクション保存） | **必須**（アプリがこの関数を呼ぶ） |
| `0004_print_fields.sql` | 見積書用の列（見積番号・有効期限・顧客備考・材料単位）＋採番＋`save_estimate()` 差し替え | **必須** |

## 新しい Supabase プロジェクトに構築する場合

1. `0001` → `0002` → `0003` → `0004` を順に実行
2. Authentication → Users で `admin@tannai-estimate.local` を作成（`docs/supabase-changes.md` 参照）
3. `.env.local` / Vercel に環境変数を設定（`docs/env-setup.md` 参照）

## スキーマを変更するとき

- 直接ダッシュボードで列を足さず、`000N_*.sql` を追加してから実行する
- `docs/database.md` も同時に更新する
