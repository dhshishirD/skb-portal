-- 0047: a person can see the place of their own check-in and check-out.
-- Owner's decision (changes the step-1 rule "only the Executive Director and the Super Admin see places"):
-- the person sees their OWN places too; the Executive Director and the Super Admin still see everyone's (0046).
-- The row-level policy attendance_logs_select_own already limits the table to the person's own rows, so adding these
-- columns to the column grant exposes nothing about anyone else. The correction details stay unreadable here.
grant select (check_in_lat, check_in_lng, check_in_accuracy_m, check_out_lat, check_out_lng, check_out_accuracy_m)
  on public.attendance_logs to authenticated;
