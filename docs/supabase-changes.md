# Supabase 変更項目（管理者ログイン暫定対応）

アプリ側は「管理者パスワードのみ」でログインする。  
裏では `ADMIN_EMAIL` ＋入力パスワードで Supabase Auth に入る。

## 結論: SQL で必須の変更はない

テーブル定義の追加・削除は不要。すでに作済みの5テーブルのままでよい。

| 対象 | 要否 | 内容 |
|---|---|---|
| `estimates` 等の CREATE TABLE | 不要 | 変更なし |
| RLS ポリシー差し替え | **未実施なら必要** | 下の SQL。実施済みなら再実行不要 |
| Auth ユーザー作成 | **必要（管理画面）** | SQL ではなく Authentication → Users |
| `profiles` / `posts` | 不要 | ハンズオン用。見積もりでは未使用 |

## 1. 管理画面でやること（SQL ではない）

Authentication → Users → **Add user**

- Email: `.env.local` の `ADMIN_EMAIL` と同じ値
- Password: 父・本人が使う **管理者パスワード**
- Auto Confirm User: **ON**

既存ユーザーを使う場合は、そのメールを `ADMIN_EMAIL` に書く。

## 2. RLS（未実施の場合のみ SQL Editor で実行）

目的: 認証済みなら見積もりを共有して読める（管理者アカウント1人運用でも、将来2人に戻しても使える）。

すでに `*_authenticated_all` がある場合は **スキップ**。

```sql
-- 旧「本人のみ」ポリシーを削除
drop policy if exists "estimates_select_own" on public.estimates;
drop policy if exists "estimates_insert_own" on public.estimates;
drop policy if exists "estimates_update_own" on public.estimates;
drop policy if exists "estimates_delete_own" on public.estimates;

drop policy if exists "estimate_materials_select_own" on public.estimate_materials;
drop policy if exists "estimate_materials_insert_own" on public.estimate_materials;
drop policy if exists "estimate_materials_update_own" on public.estimate_materials;
drop policy if exists "estimate_materials_delete_own" on public.estimate_materials;

drop policy if exists "estimate_results_select_own" on public.estimate_results;
drop policy if exists "estimate_results_insert_own" on public.estimate_results;
drop policy if exists "estimate_results_update_own" on public.estimate_results;
drop policy if exists "estimate_results_delete_own" on public.estimate_results;

-- 念のため同名の新ポリシーがあれば消してから作り直す
drop policy if exists "estimates_authenticated_all" on public.estimates;
drop policy if exists "estimate_materials_authenticated_all" on public.estimate_materials;
drop policy if exists "estimate_results_authenticated_all" on public.estimate_results;

create policy "estimates_authenticated_all"
  on public.estimates for all to authenticated
  using (true) with check (auth.uid() = user_id);

create policy "estimate_materials_authenticated_all"
  on public.estimate_materials for all to authenticated
  using (true) with check (auth.uid() = user_id);

create policy "estimate_results_authenticated_all"
  on public.estimate_results for all to authenticated
  using (true) with check (auth.uid() = user_id);
```

## 3. やらなくてよい SQL

- 管理者パスワード用の新テーブル
- `profiles` の更新
- パスワードを DB に保存する処理（Auth が持つ）

## 4. アプリ側の env（再掲）

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
ADMIN_EMAIL=共有アカウントのメール
```

Vercel にも同じ3つ。`ENABLE_AUTH_SKIP` は本番に置かない。
