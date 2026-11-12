-- 0029: expense date tolerance for Bangladesh time.
--
-- 0028 refused any expense dated after the database's current_date. The database runs in UTC, and
-- Bangladesh is UTC+6, so between 00:00 and 06:00 local time "today" is already tomorrow in the
-- database's eyes and a claim dated today was wrongly refused. Allow one day ahead.
-- Only the date check changes; every other rule in guard_expense stays as in 0028.

do $$
declare
  def text;
begin
  select pg_get_functiondef('public.guard_expense()'::regprocedure) into def;
  if position('new.expense_date > current_date' in def) = 0 then
    raise exception '0029: expected date check not found in guard_expense(); review before applying';
  end if;
  def := replace(def, 'new.expense_date > current_date', 'new.expense_date > current_date + 1');
  execute def;
end $$;
