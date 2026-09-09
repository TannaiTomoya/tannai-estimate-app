-- RLS とテーブル権限（GRANT）
-- 冪等: 何度流しても同じ状態になる
--
-- 重要: RLS ポリシーだけでは不十分。テーブル権限（GRANT）が authenticated ロールに無いと
--       42501 permission denied for table estimates で全ての読み書きが拒否される。

-- ---------------------------------------------------------------
-- 1. テーブル権限
-- ---------------------------------------------------------------
grant usage on schema public to authenticated;

grant select, insert, update, delete
  on public.estimates, public.estimate_materials, public.estimate_results
  to authenticated;

-- 匿名（未ログイン）には何も許可しない
revoke all on public.estimates, public.estimate_materials, public.estimate_results from anon;

-- ---------------------------------------------------------------
-- 2. RLS 有効化
-- ---------------------------------------------------------------
alter table public.estimates          enable row level security;
alter table public.estimate_materials enable row level security;
alter table public.estimate_results   enable row level security;

-- ---------------------------------------------------------------
-- 3. ポリシー（認証済みなら全行参照可、書き込みは自分の user_id のみ）
-- ---------------------------------------------------------------
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

-- ---------------------------------------------------------------
-- 確認用（3テーブル × 4権限 = 12行返れば OK）
-- ---------------------------------------------------------------
-- select table_name, privilege_type
--   from information_schema.role_table_grants
--  where grantee = 'authenticated' and table_schema = 'public'
--    and table_name in ('estimates', 'estimate_materials', 'estimate_results')
--  order by table_name, privilege_type;
