-- Migration 0009: Private document storage
--
-- Project documents (Form-3/7/8, NID copies, vouchers, photos) must never be reachable by a
-- public URL. The bucket is private; the app serves files through short-lived signed URLs
-- created by authenticated server code (see src/app/api/storage/upload/route.ts).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-documents',
  'project-documents',
  false,
  26214400, -- 25 MB
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- No storage.objects policies are created for this bucket on purpose: browser clients
-- (anon/authenticated) get no direct access. Only the server (service role) reads/writes,
-- after checking the user's session.
