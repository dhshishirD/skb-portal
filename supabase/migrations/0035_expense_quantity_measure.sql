-- 0035: quantity and measure on expense claims.
--
-- The Form 7 report lists what was bought with a quantity and a unit price. A claim already has the shop name
-- (vendor_name) and the receipt number (receipt_ref) from 0028; this adds two optional columns:
--   quantity  how many were bought (more than zero, up to 3 decimals)
--   measure   the unit, e.g. kg, pcs, bag (up to 30 characters)
-- Both are optional, so existing claims and the existing claim form keep working. Like the other claim fields,
-- they cannot be changed after the claim is filed. Only that rule is added to guard_expense(); every other rule
-- stays as it is (including the date tolerance from 0029).

alter table public.expenses add column if not exists quantity numeric(14,3);
alter table public.expenses add column if not exists measure text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'expenses_quantity_positive' and conrelid = 'public.expenses'::regclass) then
    alter table public.expenses add constraint expenses_quantity_positive check (quantity is null or quantity > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'expenses_measure_length' and conrelid = 'public.expenses'::regclass) then
    alter table public.expenses add constraint expenses_measure_length check (measure is null or char_length(btrim(measure)) between 1 and 30);
  end if;
end $$;

do $$
declare
  def text;
  needle constant text := 'or new.receipt_ref is distinct from old.receipt_ref';
begin
  select pg_get_functiondef('public.guard_expense()'::regprocedure) into def;
  if position(needle in def) = 0 then
    raise exception '0035: expected receipt_ref rule not found in guard_expense(); review before applying';
  end if;
  if position('new.quantity is distinct from old.quantity' in def) = 0 then
    def := replace(def, needle, needle || E'\n     or new.quantity is distinct from old.quantity\n     or new.measure is distinct from old.measure');
    execute def;
  end if;
end $$;
