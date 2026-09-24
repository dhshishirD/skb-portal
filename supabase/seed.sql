-- supabase/seed.sql
-- FAKE SEED DATA ONLY FOR LOCAL DEVELOPMENT & DEMONSTRATION
-- Never run against production.

begin;

-- ===== 1. Organizations =====
insert into public.organizations (id, name, type, country) values
  ('00000000-0000-0000-0000-0000000000a1', 'Internal HQ Organization', 'internal', 'Bangladesh'),
  ('00000000-0000-0000-0000-0000000000d1', 'USAID Bangladesh (Donor)', 'donor', 'USA'),
  ('00000000-0000-0000-0000-0000000000d2', 'EU Development Fund (Donor)', 'donor', 'Belgium'),
  ('00000000-0000-0000-0000-0000000000p1', 'BRAC Implementing Partner', 'implementing_partner', 'Bangladesh'),
  ('00000000-0000-0000-0000-0000000000p2', 'Coast Trust Partner', 'implementing_partner', 'Bangladesh')
on conflict (id) do nothing;

-- ===== 2. Locations (Bangladesh Hierarchy Sample) =====
-- Divisions
insert into public.locations (id, parent_id, level, name_en, name_bn, code) values
  ('00000000-0000-0000-0001-000000000001', null, 'division', 'Dhaka', 'ঢাকা', 'DIV-DHAKA'),
  ('00000000-0000-0000-0001-000000000002', null, 'division', 'Chattogram', 'চট্টগ্রাম', 'DIV-CTG')
on conflict (id) do nothing;

-- Districts
insert into public.locations (id, parent_id, level, name_en, name_bn, code) values
  ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0001-000000000001', 'district', 'Dhaka', 'ঢাকা', 'DIST-DHAKA'),
  ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0001-000000000002', 'district', 'Coxs Bazar', 'কক্সবাজার', 'DIST-COXB'),
  ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0001-000000000002', 'district', 'Bandarban', 'বান্দরবান', 'DIST-BNDR'),
  ('00000000-0000-0000-0002-000000000004', '00000000-0000-0000-0001-000000000001', 'district', 'Kurigram', 'কুড়িগ্রাম', 'DIST-KURI')
on conflict (id) do nothing;

-- Upazilas
insert into public.locations (id, parent_id, level, name_en, name_bn, code) values
  ('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0002-000000000002', 'upazila', 'Ukhiya', 'উখিয়া', 'UP-UKHIYA'),
  ('00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0002-000000000002', 'upazila', 'Teknaf', 'টেকনাফ', 'UP-TEKNAF'),
  ('00000000-0000-0000-0003-000000000003', '00000000-0000-0000-0002-000000000003', 'upazila', 'Thanchi', 'থানচি', 'UP-THANCHI'),
  ('00000000-0000-0000-0003-000000000004', '00000000-0000-0000-0002-000000000004', 'upazila', 'Chilmari', 'চিলমারী', 'UP-CHILMARI')
on conflict (id) do nothing;

-- ===== 3. Grants =====
insert into public.grants (id, code, title, donor_org_id, currency, total_amount, status) values
  ('20000000-0000-0000-0000-000000000001', 'G1-USAID', 'Coastal Climate Resilience Grant', '00000000-0000-0000-0000-0000000000d1', 'USD', 500000.00, 'active'),
  ('20000000-0000-0000-0000-000000000002', 'G2-EUDEV', 'Primary Healthcare & Sanitation Grant', '00000000-0000-0000-0000-0000000000d2', 'EUR', 350000.00, 'active'),
  ('20000000-0000-0000-0000-000000000003', 'G3-USAID', 'Youth Livelihoods & Vocational Skills', '00000000-0000-0000-0000-0000000000d1', 'USD', 250000.00, 'active')
on conflict (id) do nothing;

-- ===== 4. Projects =====
insert into public.projects (id, code, title, description, grant_id, stage) values
  ('30000000-0000-0000-0000-000000000001', 'P1-CLIMATE', 'Coastal Embankment & Mangrove Protection', 'Afforestation and community embankment repair in Teknaf', '20000000-0000-0000-0000-000000000001', 'implementation'),
  ('30000000-0000-0000-0000-000000000002', 'P2-HEALTH', 'Community Health Clinics in Coxs Bazar', 'Mobile health units and WASH sanitation infrastructure', '20000000-0000-0000-0000-000000000002', 'implementation'),
  ('30000000-0000-0000-0000-000000000003', 'P3-YOUTH', 'Vocational Skills Training in Kurigram', 'IT and handicraft training workshops for youth', '20000000-0000-0000-0000-000000000003', 'approved'),
  ('30000000-0000-0000-0000-000000000004', 'P4-EMERGENCY', 'Monsoon Flood Disaster Preparedness', 'Pre-positioning emergency relief packages', '20000000-0000-0000-0000-000000000001', 'proposal')
on conflict (id) do nothing;

-- ===== 5. Auth Users & Profiles (1 User per Role) =====
insert into auth.users (id, email) values
  ('10000000-0000-0000-0000-000000000001', 'admin@ngo-portal.org'),
  ('10000000-0000-0000-0000-000000000002', 'executive@ngo-portal.org'),
  ('10000000-0000-0000-0000-000000000003', 'pm@ngo-portal.org'),
  ('10000000-0000-0000-0000-000000000004', 'officer@ngo-portal.org'),
  ('10000000-0000-0000-0000-000000000005', 'field@ngo-portal.org'),
  ('10000000-0000-0000-0000-000000000006', 'finance@ngo-portal.org'),
  ('10000000-0000-0000-0000-000000000007', 'procurement@ngo-portal.org'),
  ('10000000-0000-0000-0000-000000000008', 'me@ngo-portal.org'),
  ('10000000-0000-0000-0000-000000000009', 'donor1@ngo-portal.org'),
  ('10000000-0000-0000-0000-00000000000a', 'partner1@ngo-portal.org'),
  ('10000000-0000-0000-0000-00000000000b', 'auditor@ngo-portal.org')
on conflict (id) do nothing;

-- Profiles
update public.profiles set org_id = '00000000-0000-0000-0000-0000000000a1', full_name = 'System Administrator' where id = '10000000-0000-0000-0000-000000000001';
update public.profiles set org_id = '00000000-0000-0000-0000-0000000000a1', full_name = 'Executive Director' where id = '10000000-0000-0000-0000-000000000002';
update public.profiles set org_id = '00000000-0000-0000-0000-0000000000a1', full_name = 'Rahim PM' where id = '10000000-0000-0000-0000-000000000003';
update public.profiles set org_id = '00000000-0000-0000-0000-0000000000a1', full_name = 'Tariq Project Officer' where id = '10000000-0000-0000-0000-000000000004';
update public.profiles set org_id = '00000000-0000-0000-0000-0000000000a1', full_name = 'Karim Field Officer' where id = '10000000-0000-0000-0000-000000000005';
update public.profiles set org_id = '00000000-0000-0000-0000-0000000000a1', full_name = 'Fatema Finance Manager' where id = '10000000-0000-0000-0000-000000000006';
update public.profiles set org_id = '00000000-0000-0000-0000-0000000000a1', full_name = 'Kamal Procurement Specialist' where id = '10000000-0000-0000-0000-000000000007';
update public.profiles set org_id = '00000000-0000-0000-0000-0000000000a1', full_name = 'Nasrin M&E Officer' where id = '10000000-0000-0000-0000-000000000008';
update public.profiles set org_id = '00000000-0000-0000-0000-0000000000d1', full_name = 'USAID Grant Officer' where id = '10000000-0000-0000-0000-000000000009';
update public.profiles set org_id = '00000000-0000-0000-0000-0000000000p1', full_name = 'BRAC Field Coordinator' where id = '10000000-0000-0000-0000-00000000000a';
update public.profiles set org_id = '00000000-0000-0000-0000-0000000000a1', full_name = 'Independent Auditor' where id = '10000000-0000-0000-0000-00000000000b';

-- Roles
insert into public.user_roles (user_id, role) values
  ('10000000-0000-0000-0000-000000000001', 'super_admin'),
  ('10000000-0000-0000-0000-000000000002', 'executive'),
  ('10000000-0000-0000-0000-000000000003', 'programme_manager'),
  ('10000000-0000-0000-0000-000000000004', 'project_officer'),
  ('10000000-0000-0000-0000-000000000005', 'field_officer'),
  ('10000000-0000-0000-0000-000000000006', 'finance'),
  ('10000000-0000-0000-0000-000000000007', 'procurement'),
  ('10000000-0000-0000-0000-000000000008', 'me_officer'),
  ('10000000-0000-0000-0000-000000000009', 'donor'),
  ('10000000-0000-0000-0000-00000000000a', 'partner'),
  ('10000000-0000-0000-0000-00000000000b', 'auditor')
on conflict (user_id, role) do nothing;

-- Project Access Assignments
insert into public.user_project_access (user_id, project_id, expires_at) values
  ('10000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', null),
  ('10000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000004', null),
  ('10000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001', null),
  ('10000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000001', null),
  ('10000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000001', null),
  ('10000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-000000000001', now() + interval '30 days')
on conflict (user_id, project_id) do nothing;

commit;
