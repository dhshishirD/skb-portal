-- 0042: letters on the SKB letterhead pad.
--
-- Any staff member writes a letter as a draft (private to them, the Executive Director and the Super Admin) and
-- issues it: no approval step, so nothing waits on one person. Issuing is the one moment a Ref number is spent:
-- SKB-001/26 (the sequence of the year, restarting each year), given by the database so two people never get the
-- same number and no number is skipped. After issue the letter is locked; a wrong letter is cancelled (its number
-- stays in the register, with a reason) and a corrected one is written as a new letter.
--   * Issued and cancelled letters form a register every staff member reads (drafts stay private).
--   * The signature on a letter is only the signature of the person who issues it (their saved signature from the
--     Work Log page), added when they tick "add my signature"; nobody can put another person's signature on a letter.
--   * The organisation stamp is one picture any staff member may upload or replace (private bucket, server only);
--     a letter can carry it if one is saved.
--   * The Executive Director or Super Admin can set where the numbering stands (never below the highest number
--     already issued that year), for example to continue from the paper register.
-- Additive: new tables, functions, bucket and policies only.

create table if not exists public.letters (
  id             uuid primary key default gen_random_uuid(),
  created_by     uuid default auth.uid() references public.profiles(id) on delete set null,
  status         text not null default 'draft' check (status in ('draft','issued','void')),
  ref_year       int,
  ref_seq        int,
  ref_no         text,
  letter_date    date,
  to_lines       text not null default '' check (char_length(to_lines) <= 600),
  subject        text not null default '' check (char_length(subject) <= 250),
  salutation     text not null default 'Dear Sir/Madam,' check (char_length(salutation) <= 80),
  body           text not null default '' check (char_length(body) <= 8000),
  closing        text not null default 'Sincerely,' check (char_length(closing) <= 60),
  signatory_name  text not null default '' check (char_length(signatory_name) <= 120),
  signatory_title text not null default '' check (char_length(signatory_title) <= 160),
  cc             text not null default '' check (char_length(cc) <= 500),
  with_signature boolean not null default false,
  with_stamp     boolean not null default false,
  signature_user_id uuid references public.profiles(id) on delete set null,
  issued_by      uuid references public.profiles(id) on delete set null,
  issued_at      timestamptz,
  void_reason    text check (void_reason is null or char_length(void_reason) <= 200),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create unique index if not exists letters_ref_unique on public.letters (ref_year, ref_seq) where ref_seq is not null;
create unique index if not exists letters_ref_no_unique on public.letters (ref_no) where ref_no is not null;
create index if not exists letters_created_by_idx on public.letters (created_by);
create index if not exists letters_issued_by_idx on public.letters (issued_by);
create index if not exists letters_signature_user_idx on public.letters (signature_user_id);
create index if not exists letters_status_date_idx on public.letters (status, letter_date desc);

create table if not exists public.letter_counters (
  year     int primary key check (year between 2000 and 2200),
  last_seq int not null default 0 check (last_seq >= 0)
);
alter table public.letter_counters enable row level security;
revoke all on table public.letter_counters from anon, authenticated;

create table if not exists public.org_stamp (
  id         boolean primary key default true check (id),
  image_path text not null,
  mime_type  text not null check (mime_type in ('image/png','image/jpeg')),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
create index if not exists org_stamp_updated_by_idx on public.org_stamp (updated_by);
alter table public.org_stamp enable row level security;
revoke all on table public.org_stamp from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('org-stamp', 'org-stamp', false, 1048576, array['image/png', 'image/jpeg'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ===== the guard: who may change a letter, and how =====
create or replace function public.guard_letter()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  is_ed boolean;
begin
  if me is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  is_ed := public.has_any_role(array['executive','super_admin']::public.app_role[]);

  if tg_op = 'INSERT' then
    new.created_by := me;
    new.status := 'draft';
    new.ref_year := null; new.ref_seq := null; new.ref_no := null; new.letter_date := null;
    new.issued_by := null; new.issued_at := null; new.void_reason := null; new.signature_user_id := null;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.status <> 'draft' then
      raise exception 'this letter has already been issued, so it cannot be deleted' using errcode = '42501';
    end if;
    if not (coalesce(me = old.created_by, false) or is_ed) then
      raise exception 'only the person who wrote this letter can do this' using errcode = '42501';
    end if;
    return old;
  end if;

  -- UPDATE. issue_letter() sets this flag for its own update and for nothing else.
  if coalesce(current_setting('app.letter_issue', true), '') = '1' then
    return new;
  end if;
  if new.created_by is distinct from old.created_by then
    raise exception 'the writer of a letter cannot change' using errcode = '42501';
  end if;
  if not (coalesce(me = old.created_by, false) or is_ed) then
    raise exception 'only the person who wrote this letter can do this' using errcode = '42501';
  end if;

  if old.status = 'draft' then
    if new.status <> 'draft' then
      raise exception 'a letter is issued with the Issue button, which gives it its Ref number' using errcode = '42501';
    end if;
    new.ref_year := null; new.ref_seq := null; new.ref_no := null; new.letter_date := null;
    new.issued_by := null; new.issued_at := null; new.void_reason := null; new.signature_user_id := null;
    new.updated_at := now();
    return new;
  end if;

  if old.status = 'issued' and new.status = 'void' then
    if new.void_reason is null or btrim(new.void_reason) = '' then
      raise exception 'a reason is needed to cancel a letter' using errcode = '42501';
    end if;
    -- only the status and the reason change
    new.ref_year := old.ref_year; new.ref_seq := old.ref_seq; new.ref_no := old.ref_no; new.letter_date := old.letter_date;
    new.to_lines := old.to_lines; new.subject := old.subject; new.salutation := old.salutation; new.body := old.body;
    new.closing := old.closing; new.signatory_name := old.signatory_name; new.signatory_title := old.signatory_title;
    new.cc := old.cc; new.with_signature := old.with_signature; new.with_stamp := old.with_stamp;
    new.signature_user_id := old.signature_user_id; new.issued_by := old.issued_by; new.issued_at := old.issued_at;
    new.updated_at := now();
    return new;
  end if;

  raise exception 'this letter has already been issued or cancelled, so it cannot be changed' using errcode = '42501';
end $$;
revoke execute on function public.guard_letter() from public, anon, authenticated;
drop trigger if exists guard_letter on public.letters;
create trigger guard_letter before insert or update or delete on public.letters
  for each row execute function public.guard_letter();
drop trigger if exists audit_letters_insert on public.letters;
create trigger audit_letters_insert after insert on public.letters
  for each row execute function public.log_audit();
drop trigger if exists audit_letters_status on public.letters;
create trigger audit_letters_status after update on public.letters
  for each row when (old.status is distinct from new.status) execute function public.log_audit();

-- ===== issue: spend the next Ref number =====
create or replace function public.issue_letter(_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  l public.letters%rowtype;
  yr int := extract(year from public.dhaka_today())::int;
  seq int;
  ref text;
begin
  if me is null or not (public.is_staff_member() or public.has_any_role(array['executive','super_admin']::public.app_role[])) then
    raise exception 'only staff can issue a letter' using errcode = '42501';
  end if;
  select * into l from public.letters where id = _id for update;
  if not found then
    raise exception 'letter not found' using errcode = 'P0002';
  end if;
  if not (coalesce(me = l.created_by, false) or public.has_any_role(array['executive','super_admin']::public.app_role[])) then
    raise exception 'only the person who wrote this letter can do this' using errcode = '42501';
  end if;
  if l.status <> 'draft' then
    raise exception 'this letter has already been issued' using errcode = '42501';
  end if;
  if btrim(l.to_lines) = '' or btrim(l.subject) = '' or btrim(l.body) = '' or btrim(l.signatory_name) = '' then
    raise exception 'who the letter is to, the subject, the text and the name of the signer is needed' using errcode = '42501';
  end if;
  if l.with_signature and not exists (select 1 from public.staff_signatures g where g.user_id = me) then
    raise exception 'save your signature first, or issue the letter without it' using errcode = '42501';
  end if;
  if l.with_stamp and not exists (select 1 from public.org_stamp) then
    raise exception 'no stamp has been saved yet' using errcode = '42501';
  end if;

  insert into public.letter_counters (year, last_seq) values (yr, 1)
    on conflict (year) do update set last_seq = public.letter_counters.last_seq + 1
    returning last_seq into seq;
  ref := 'SKB-' || lpad(seq::text, 3, '0') || '/' || lpad((yr % 100)::text, 2, '0');

  perform set_config('app.letter_issue', '1', true);
  update public.letters set
    status = 'issued', ref_year = yr, ref_seq = seq, ref_no = ref,
    letter_date = public.dhaka_today(), issued_by = me, issued_at = now(),
    signature_user_id = case when l.with_signature then me else null end,
    updated_at = now()
  where id = _id;
  perform set_config('app.letter_issue', '', true);
  return ref;
end $$;
revoke execute on function public.issue_letter(uuid) from public, anon;
grant execute on function public.issue_letter(uuid) to authenticated;

-- the number the next issued letter will get this year (for the page)
create or replace function public.next_letter_number(_year int)
returns int language sql stable security definer set search_path = '' as $$
  select case when public.is_staff_member() or public.has_any_role(array['executive','super_admin']::public.app_role[])
    then coalesce((select last_seq from public.letter_counters where year = _year), 0) + 1 end;
$$;
revoke execute on function public.next_letter_number(int) from public, anon;
grant execute on function public.next_letter_number(int) to authenticated;

-- the Executive Director or Super Admin sets where the numbering stands (never below what was already issued)
create or replace function public.set_letter_counter(_year int, _last int)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null and not public.has_any_role(array['executive','super_admin']::public.app_role[]) then
    raise exception 'only the Executive Director or the Super Admin can set the numbering' using errcode = '42501';
  end if;
  if _last < 0 or _last > 99999 then
    raise exception 'the number must be between 0 and 99999' using errcode = '22023';
  end if;
  if _last < coalesce((select max(ref_seq) from public.letters where ref_year = _year), 0) then
    raise exception 'the number cannot be lower than the highest Ref already issued this year' using errcode = '22023';
  end if;
  insert into public.letter_counters (year, last_seq) values (_year, _last)
    on conflict (year) do update set last_seq = excluded.last_seq;
end $$;
revoke execute on function public.set_letter_counter(int, int) from public, anon;
grant execute on function public.set_letter_counter(int, int) to authenticated;

-- ===== who reads and writes letters =====
alter table public.letters enable row level security;
revoke all on table public.letters from anon, authenticated;
grant select, insert, update, delete on table public.letters to authenticated;

drop policy if exists letters_select on public.letters;
create policy letters_select on public.letters for select to authenticated
  using (
    (status <> 'draft' and public.is_staff_member())
    or created_by = (select auth.uid())
    or public.has_any_role(array['executive','super_admin']::public.app_role[])
  );
drop policy if exists letters_insert on public.letters;
create policy letters_insert on public.letters for insert to authenticated
  with check (created_by = (select auth.uid()) and public.is_staff_member());
drop policy if exists letters_update on public.letters;
create policy letters_update on public.letters for update to authenticated
  using (created_by = (select auth.uid()) or public.has_any_role(array['executive','super_admin']::public.app_role[]))
  with check (created_by = (select auth.uid()) or public.has_any_role(array['executive','super_admin']::public.app_role[]));
drop policy if exists letters_delete on public.letters;
create policy letters_delete on public.letters for delete to authenticated
  using (status = 'draft' and (created_by = (select auth.uid()) or public.has_any_role(array['executive','super_admin']::public.app_role[])));
