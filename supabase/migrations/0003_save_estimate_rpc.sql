-- 見積もり本体＋材料明細を 1 トランザクションで保存する RPC
--
-- 呼び出し: supabase.rpc('save_estimate', { p_id, p_estimate, p_materials })
--   p_id        : uuid または null（null なら新規作成）
--   p_estimate  : estimates の列名をキーにした jsonb（user_id / id / created_at は無視される）
--   p_materials : [{ name, unit_purchase_price, quantity, line_total, sort_order }, ...]
-- 戻り値: 保存した見積もりの id
--
-- security invoker のため、RLS / GRANT は呼び出しユーザーのまま適用される。
-- 途中でエラーが起きればすべてロールバックされ、「本体だけ更新されて明細が消える」事故が起きない。

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

  -- jsonb -> 行型。列名が一致しないキーは無視される（jsonb_populate_record の仕様）
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
      risk_alerts, status
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
      coalesce(v_row.risk_alerts, '[]'::jsonb), coalesce(v_row.status, 'draft')
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
      updated_at              = now()
    where id = p_id
    returning id into v_id;

    if v_id is null then
      raise exception '見積もりが見つかりません' using errcode = 'P0002';
    end if;

    delete from public.estimate_materials where estimate_id = v_id;
  end if;

  -- 材料明細を入れ直す
  insert into public.estimate_materials (
    estimate_id, user_id, name, unit_purchase_price, quantity, line_total, sort_order
  )
  select
    v_id,
    v_uid,
    m.name,
    coalesce(m.unit_purchase_price, 0),
    coalesce(m.quantity, 0),
    coalesce(m.line_total, 0),
    coalesce(m.sort_order, 0)
  from jsonb_to_recordset(coalesce(p_materials, '[]'::jsonb)) as m(
    name text,
    unit_purchase_price integer,
    quantity numeric,
    line_total integer,
    sort_order integer
  )
  where m.name is not null and btrim(m.name) <> '';

  return v_id;
end;
$$;

revoke all on function public.save_estimate(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.save_estimate(uuid, jsonb, jsonb) to authenticated;
