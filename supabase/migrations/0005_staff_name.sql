-- 担当者欄の追加と save_estimate() の差し替え（docs/print-design.md）
-- 冪等: 何度流しても同じ状態になる
-- 前提: 0004_print_fields.sql が適用済み

-- ---------------------------------------------------------------
-- 1. 列追加
-- ---------------------------------------------------------------
alter table public.estimates
  add column if not exists staff_name text;   -- 担当者名（見積書に印字。押印は手押し）

-- ---------------------------------------------------------------
-- 2. save_estimate() 差し替え（staff_name 対応。他は 0004 と同じ）
-- ---------------------------------------------------------------
create or replace function public.save_estimate(
  p_id        uuid,
  p_estimate  jsonb,
  p_materials jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
  v_row public.estimates%rowtype;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  v_row := jsonb_populate_record(null::public.estimates, p_estimate);

  if v_row.title is null or btrim(v_row.title) = ''
     or v_row.customer_name is null or btrim(v_row.customer_name) = ''
     or v_row.estimate_date is null then
    raise exception '案件名、顧客名、見積もり日は必須です' using errcode = '23502';
  end if;

  if p_id is null then
    insert into public.estimates (
      user_id, title, customer_name, work_location, estimate_date, delivery_date,
      worker_count, planned_days, workload, includes_consumables, includes_tech_fee,
      work_description, recommended_unit_price, recommended_price_label, unit_price,
      labor_cost, material_markup_rate, material_purchase_total, material_cost,
      consumables_cost, tech_fee, misc_cost, subtotal, tax_rate, tax_amount,
      total_with_tax, reason_unit_price, reason_manpower, reason_delivery,
      risk_alerts, status,
      estimate_no, valid_until, customer_note, staff_name
    ) values (
      v_uid, v_row.title, v_row.customer_name, v_row.work_location, v_row.estimate_date, v_row.delivery_date,
      coalesce(v_row.worker_count, 0), coalesce(v_row.planned_days, 0), coalesce(v_row.workload, 'medium'),
      coalesce(v_row.includes_consumables, false), coalesce(v_row.includes_tech_fee, false),
      v_row.work_description, coalesce(v_row.recommended_unit_price, 0), v_row.recommended_price_label,
      coalesce(v_row.unit_price, 0), coalesce(v_row.labor_cost, 0), coalesce(v_row.material_markup_rate, 1),
      coalesce(v_row.material_purchase_total, 0), coalesce(v_row.material_cost, 0),
      coalesce(v_row.consumables_cost, 0), coalesce(v_row.tech_fee, 0), coalesce(v_row.misc_cost, 0),
      coalesce(v_row.subtotal, 0), coalesce(v_row.tax_rate, 0.10), coalesce(v_row.tax_amount, 0),
      coalesce(v_row.total_with_tax, 0), v_row.reason_unit_price, v_row.reason_manpower, v_row.reason_delivery,
      coalesce(v_row.risk_alerts, '[]'::jsonb), coalesce(v_row.status, 'draft'),
      public.next_estimate_no(v_row.estimate_date),
      coalesce(v_row.valid_until, v_row.estimate_date + 30),
      v_row.customer_note,
      nullif(btrim(coalesce(v_row.staff_name, '')), '')
    )
    returning id into v_id;
  else
    update public.estimates set
      title                   = v_row.title,
      customer_name           = v_row.customer_name,
      work_location           = v_row.work_location,
      estimate_date           = v_row.estimate_date,
      delivery_date           = v_row.delivery_date,
      worker_count            = coalesce(v_row.worker_count, 0),
      planned_days            = coalesce(v_row.planned_days, 0),
      workload                = coalesce(v_row.workload, 'medium'),
      includes_consumables    = coalesce(v_row.includes_consumables, false),
      includes_tech_fee       = coalesce(v_row.includes_tech_fee, false),
      work_description        = v_row.work_description,
      recommended_unit_price  = coalesce(v_row.recommended_unit_price, 0),
      recommended_price_label = v_row.recommended_price_label,
      unit_price              = coalesce(v_row.unit_price, 0),
      labor_cost              = coalesce(v_row.labor_cost, 0),
      material_markup_rate    = coalesce(v_row.material_markup_rate, 1),
      material_purchase_total = coalesce(v_row.material_purchase_total, 0),
      material_cost           = coalesce(v_row.material_cost, 0),
      consumables_cost        = coalesce(v_row.consumables_cost, 0),
      tech_fee                = coalesce(v_row.tech_fee, 0),
      misc_cost               = coalesce(v_row.misc_cost, 0),
      subtotal                = coalesce(v_row.subtotal, 0),
      tax_rate                = coalesce(v_row.tax_rate, 0.10),
      tax_amount              = coalesce(v_row.tax_amount, 0),
      total_with_tax          = coalesce(v_row.total_with_tax, 0),
      reason_unit_price       = v_row.reason_unit_price,
      reason_manpower         = v_row.reason_manpower,
      reason_delivery         = v_row.reason_delivery,
      risk_alerts             = coalesce(v_row.risk_alerts, '[]'::jsonb),
      status                  = coalesce(v_row.status, 'draft'),
      -- 見積番号は更新では変えない。旧データ（NULL）だけは採番する
      estimate_no             = coalesce(estimate_no, public.next_estimate_no(v_row.estimate_date)),
      valid_until             = coalesce(v_row.valid_until, v_row.estimate_date + 30),
      customer_note           = v_row.customer_note,
      staff_name              = nullif(btrim(coalesce(v_row.staff_name, '')), ''),
      updated_at              = now()
    where id = p_id
    returning id into v_id;

    if v_id is null then
      raise exception '見積もりが見つかりません' using errcode = 'P0002';
    end if;

    delete from public.estimate_materials where estimate_id = v_id;
  end if;

  insert into public.estimate_materials (
    estimate_id, user_id, name, unit_purchase_price, quantity, unit, line_total, sort_order
  )
  select
    v_id,
    v_uid,
    m.name,
    coalesce(m.unit_purchase_price, 0),
    coalesce(m.quantity, 0),
    coalesce(nullif(btrim(m.unit), ''), '個'),
    coalesce(m.line_total, 0),
    coalesce(m.sort_order, 0)
  from jsonb_to_recordset(coalesce(p_materials, '[]'::jsonb)) as m(
    name text,
    unit_purchase_price integer,
    quantity numeric,
    unit text,
    line_total integer,
    sort_order integer
  )
  where m.name is not null and btrim(m.name) <> '';

  return v_id;
end;
$$;

revoke all on function public.save_estimate(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.save_estimate(uuid, jsonb, jsonb) to authenticated;
