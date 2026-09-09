-- 見積もりアプリ Version 1 スキーマ（docs/database.md と同一内容）
-- 冪等: 既に手作成済みの DB に流しても壊れない（create ... if not exists）

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------
-- estimates（見積もり本体）
-- ---------------------------------------------------------------
create table if not exists public.estimates (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  title                   text not null,
  customer_name           text not null,
  work_location           text,
  estimate_date           date not null,
  delivery_date           date,
  worker_count            integer not null check (worker_count >= 0),
  planned_days            numeric(6,1) not null check (planned_days >= 0),
  workload                text not null check (workload in ('low', 'medium', 'high')),
  includes_consumables    boolean not null default false,
  includes_tech_fee       boolean not null default false,
  work_description        text,
  recommended_unit_price  integer not null check (recommended_unit_price >= 0),
  recommended_price_label text,
  unit_price              integer not null check (unit_price >= 0),
  labor_cost              integer not null check (labor_cost >= 0),
  material_markup_rate    numeric(6,2) not null default 1.00 check (material_markup_rate >= 0),
  material_purchase_total integer not null default 0 check (material_purchase_total >= 0),
  material_cost           integer not null default 0 check (material_cost >= 0),
  consumables_cost        integer not null default 0 check (consumables_cost >= 0),
  tech_fee                integer not null default 0 check (tech_fee >= 0),
  misc_cost               integer not null default 0 check (misc_cost >= 0),
  subtotal                integer not null check (subtotal >= 0),
  tax_rate                numeric(4,2) not null default 0.10,
  tax_amount              integer not null check (tax_amount >= 0),
  total_with_tax          integer not null check (total_with_tax >= 0),
  reason_unit_price       text,
  reason_manpower         text,
  reason_delivery         text,
  risk_alerts             jsonb not null default '[]'::jsonb,
  status                  text not null default 'draft'
                            check (status in ('draft', 'presented', 'won', 'lost', 'done')),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists estimates_user_id_idx on public.estimates (user_id);
create index if not exists estimates_user_estimate_date_idx on public.estimates (user_id, estimate_date desc);
create index if not exists estimates_user_status_idx on public.estimates (user_id, status);

-- ---------------------------------------------------------------
-- estimate_materials（材料明細）
-- ---------------------------------------------------------------
create table if not exists public.estimate_materials (
  id                  uuid primary key default gen_random_uuid(),
  estimate_id         uuid not null references public.estimates(id) on delete cascade,
  user_id             uuid not null references auth.users(id) on delete cascade,
  name                text not null,
  unit_purchase_price integer not null check (unit_purchase_price >= 0),
  quantity            numeric(10,2) not null check (quantity >= 0),
  line_total          integer not null check (line_total >= 0),
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now()
);

create index if not exists estimate_materials_estimate_id_idx on public.estimate_materials (estimate_id, sort_order);
create index if not exists estimate_materials_user_id_idx on public.estimate_materials (user_id);

-- ---------------------------------------------------------------
-- estimate_results（実績）
-- ---------------------------------------------------------------
create table if not exists public.estimate_results (
  id                             uuid primary key default gen_random_uuid(),
  estimate_id                    uuid not null unique references public.estimates(id) on delete cascade,
  user_id                        uuid not null references auth.users(id) on delete cascade,
  actual_worker_count            integer not null check (actual_worker_count >= 0),
  actual_days                    numeric(6,1) not null check (actual_days >= 0),
  actual_material_purchase_total integer not null default 0,
  actual_consumables_cost        integer not null default 0,
  actual_tech_fee                integer not null default 0,
  actual_misc_cost               integer not null default 0,
  actual_order_amount            integer not null,
  completed_on                   date not null,
  diff_reason                    text,
  next_insight                   text,
  created_at                     timestamptz not null default now(),
  updated_at                     timestamptz not null default now()
);

create index if not exists estimate_results_user_id_idx on public.estimate_results (user_id);

-- ---------------------------------------------------------------
-- updated_at 自動更新トリガー
-- ---------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists estimates_set_updated_at on public.estimates;
create trigger estimates_set_updated_at
  before update on public.estimates
  for each row execute function public.set_updated_at();

drop trigger if exists estimate_results_set_updated_at on public.estimate_results;
create trigger estimate_results_set_updated_at
  before update on public.estimate_results
  for each row execute function public.set_updated_at();
