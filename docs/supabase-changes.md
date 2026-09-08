# Supabase 変更項目（管理者パスワードのみログイン）

アプリは **管理者パスワードのみ** でログインする（メール入力なし）。  
裏では固定メール `admin@tannai-estimate.local` で Supabase Auth に入る（画面には出ない）。

## SQL で必須の変更: なし

テーブル追加は不要。

| 対象 | 要否 | 内容 |
|---|---|---|
| CREATE TABLE | 不要 | 変更なし |
| RLS 差し替え | 未実施なら必要 | 下の SQL |
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

## 3. env

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
ADMIN_PASSWORD=...
```

`ADMIN_EMAIL` は使わない（廃止）。
