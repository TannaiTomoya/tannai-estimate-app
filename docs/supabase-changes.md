# Supabase 変更項目（管理者パスワードのみログイン）

アプリは **管理者パスワードのみ** でログインする（メール入力なし）。  
裏では固定メール `admin@tannai-estimate.local` で Supabase Auth に入る（画面には出ない）。

## SQL で必須の変更: なし

テーブル追加は不要。

| 対象 | 要否 | 内容 |
|---|---|---|
| CREATE TABLE | 不要 | 変更なし |
| RLS 差し替え | 未実施なら必要 | 下の SQL |
| テーブル権限 GRANT | **未実施なら必要** | 2-2 の SQL |
| RPC 関数 `save_estimate` | **必要** | `supabase/migrations/0003_save_estimate_rpc.sql` |
| Auth ユーザー | **必要（管理画面）** | 下記の固定メール＋ADMIN_PASSWORD |

## 1. Authentication → Users（必須）

**Add user**

- Email: `admin@tannai-estimate.local`（一字一句このまま）
- Password: `.env.local` / Vercel の `ADMIN_PASSWORD` と同じ値
- Auto Confirm User: **ON**

既に別メールのユーザーしかない場合は、上記メールで新規作成する。

## 2. RLS（未実施の場合のみ）

```sql
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

## 2-2. テーブル権限 GRANT（必須・未実施なら保存が全て失敗する）

RLS ポリシーが正しくても、テーブル権限が `authenticated` ロールに無いと
`42501 permission denied for table estimates` で INSERT/SELECT が拒否される
（画面上は「保存に失敗しました」/ 一覧が空、になる）。

```sql
grant usage on schema public to authenticated;
grant select, insert, update, delete
  on public.estimates, public.estimate_materials, public.estimate_results
  to authenticated;
```

確認用（3テーブル × 4権限 = 12行出れば OK）:

```sql
select table_name, privilege_type
  from information_schema.role_table_grants
 where grantee = 'authenticated'
   and table_schema = 'public'
   and table_name in ('estimates', 'estimate_materials', 'estimate_results')
 order by table_name, privilege_type;
```

## 2-3. 保存用 RPC 関数（必須）

アプリは `save_estimate()` 関数を呼んで本体＋材料明細を1トランザクションで保存する。
`supabase/migrations/0003_save_estimate_rpc.sql` を SQL Editor で実行する。
未実行だと保存時に `PGRST202`（関数が見つからない）が表示される。

## 3. env

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
ADMIN_PASSWORD=...
```

`ADMIN_EMAIL` は使わない（廃止）。
