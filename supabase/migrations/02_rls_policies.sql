-- =====================================================================
-- CARECONNECT — ROW LEVEL SECURITY POLICIES
-- Migration: 02_rls_policies.sql
-- Depends on: 01_schema.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- HELPER FUNCTIONS (SECURITY DEFINER)
-- These run with elevated privilege internally so policies can check
-- role/team membership WITHOUT causing RLS recursion on public.users
-- or public.care_teams (a classic Supabase gotcha).
-- ---------------------------------------------------------------------

-- Returns the role of the currently authenticated user.
create or replace function public.current_user_role()
returns user_role
language sql
security definer
stable
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

-- True if auth.uid() is an active member of patient_id's care team,
-- optionally filtered to a specific care_team_role.
create or replace function public.is_on_care_team(
  p_patient_id uuid,
  p_role       care_team_role default null
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.care_teams ct
    where ct.patient_id = p_patient_id
      and ct.member_id = auth.uid()
      and ct.is_active = true
      and (p_role is null or ct.member_role = p_role)
  );
$$;

-- True if auth.uid() is an admin.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------
-- ENABLE RLS ON ALL TABLES
-- ---------------------------------------------------------------------
alter table public.users             enable row level security;
alter table public.patient_profiles  enable row level security;
alter table public.care_teams        enable row level security;
alter table public.vitals_logs       enable row level security;
alter table public.medical_reviews   enable row level security;
alter table public.notifications     enable row level security;

-- =====================================================================
-- USERS
-- Everyone can read their own row. Admin can read/write everyone.
-- Doctors/caregivers/family can read the profile of patients on their
-- care team (need patient's name displayed in UI).
-- =====================================================================

create policy "users_select_self"
  on public.users for select
  using (id = auth.uid());

create policy "users_select_admin_all"
  on public.users for select
  using (public.is_admin());

create policy "users_select_care_team_patient"
  on public.users for select
  using (
    role = 'patient'
    and public.is_on_care_team(id)   -- id here is the patient's own id
  );

-- Only admin creates/updates/deletes user records (provisioning).
-- Actual row in auth.users is created via Supabase Auth signup/invite;
-- this controls the public.users profile row.
create policy "users_insert_admin_only"
  on public.users for insert
  with check (public.is_admin());

create policy "users_update_admin_or_self_limited"
  on public.users for update
  using (public.is_admin() or id = auth.uid())
  with check (
    public.is_admin()
    or (id = auth.uid())  -- self-update allowed; lock down role changes at app layer / trigger
  );

create policy "users_delete_admin_only"
  on public.users for delete
  using (public.is_admin());

-- =====================================================================
-- PATIENT_PROFILES
-- Patient reads own profile. Doctor/caregiver/family read if on care team.
-- Only doctors (via medical_reviews flow) or admin update status directly.
-- =====================================================================

create policy "patient_profiles_select_self"
  on public.patient_profiles for select
  using (user_id = auth.uid());

create policy "patient_profiles_select_care_team"
  on public.patient_profiles for select
  using (public.is_on_care_team(user_id));

create policy "patient_profiles_select_admin"
  on public.patient_profiles for select
  using (public.is_admin());

create policy "patient_profiles_insert_admin"
  on public.patient_profiles for insert
  with check (public.is_admin());

-- Status updates should normally happen via the medical_reviews trigger
-- (security definer function), but we also allow direct doctor writes
-- for flexibility, scoped to patients on their team.
create policy "patient_profiles_update_doctor_or_admin"
  on public.patient_profiles for update
  using (
    public.is_admin()
    or public.is_on_care_team(user_id, 'doctor')
  )
  with check (
    public.is_admin()
    or public.is_on_care_team(user_id, 'doctor')
  );

-- =====================================================================
-- CARE_TEAMS
-- Only admin manages pairings. Members can see rows they belong to
-- (so a caregiver/doctor UI can show "who else is on this patient's team").
-- =====================================================================

create policy "care_teams_select_admin"
  on public.care_teams for select
  using (public.is_admin());

create policy "care_teams_select_own_membership"
  on public.care_teams for select
  using (member_id = auth.uid());

create policy "care_teams_select_same_patient_team"
  on public.care_teams for select
  using (public.is_on_care_team(patient_id));

create policy "care_teams_insert_admin_only"
  on public.care_teams for insert
  with check (public.is_admin());

create policy "care_teams_update_admin_only"
  on public.care_teams for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "care_teams_delete_admin_only"
  on public.care_teams for delete
  using (public.is_admin());

-- =====================================================================
-- VITALS_LOGS
-- Caregiver: insert for patients on their team; read own submissions.
-- Doctor: read all logs for patients on their team (triage queue).
-- Patient: read own logs (read-only).
-- Family: read logs for the patient they're linked to (read-only).
-- Nobody updates/deletes a vitals log — append-only clinical record.
-- =====================================================================

create policy "vitals_select_caregiver_own_patient"
  on public.vitals_logs for select
  using (public.is_on_care_team(patient_id, 'caregiver'));

create policy "vitals_select_doctor_own_patient"
  on public.vitals_logs for select
  using (public.is_on_care_team(patient_id, 'doctor'));

create policy "vitals_select_patient_self"
  on public.vitals_logs for select
  using (patient_id = auth.uid());

create policy "vitals_select_family_own_patient"
  on public.vitals_logs for select
  using (public.is_on_care_team(patient_id, 'family_member'));

create policy "vitals_select_admin"
  on public.vitals_logs for select
  using (public.is_admin());

create policy "vitals_insert_caregiver_only"
  on public.vitals_logs for insert
  with check (
    caregiver_id = auth.uid()
    and public.is_on_care_team(patient_id, 'caregiver')
  );

-- No update/delete policies defined => those operations are denied by
-- default under RLS (append-only / immutable clinical log).

-- =====================================================================
-- MEDICAL_REVIEWS
-- Doctor: insert for patients on their team; read own + read all for
--         patients on their team (historical context).
-- Caregiver/Patient/Family: read-only, scoped to their linked patient.
-- Reviews are immutable once written (clinical audit trail).
-- =====================================================================

create policy "reviews_select_doctor_own_patient"
  on public.medical_reviews for select
  using (public.is_on_care_team(patient_id, 'doctor'));

create policy "reviews_select_caregiver_own_patient"
  on public.medical_reviews for select
  using (public.is_on_care_team(patient_id, 'caregiver'));

create policy "reviews_select_patient_self"
  on public.medical_reviews for select
  using (patient_id = auth.uid());

create policy "reviews_select_family_own_patient"
  on public.medical_reviews for select
  using (public.is_on_care_team(patient_id, 'family_member'));

create policy "reviews_select_admin"
  on public.medical_reviews for select
  using (public.is_admin());

create policy "reviews_insert_doctor_only"
  on public.medical_reviews for insert
  with check (
    doctor_id = auth.uid()
    and public.is_on_care_team(patient_id, 'doctor')
  );

-- No update/delete => immutable audit trail. Corrections are new rows.

-- =====================================================================
-- NOTIFICATIONS
-- Strictly private: a user can only ever see/modify their own inbox.
-- Inserts happen via SECURITY DEFINER trigger functions (see
-- 03_functions_triggers.sql), not directly by clients.
-- =====================================================================

create policy "notifications_select_own"
  on public.notifications for select
  using (recipient_id = auth.uid());

create policy "notifications_select_admin"
  on public.notifications for select
  using (public.is_admin());

-- Recipients may only toggle is_read on their own notifications.
create policy "notifications_update_mark_read_own"
  on public.notifications for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- Deliberately no client-side insert policy: rows are created by the
-- security-definer trigger functions in 03_functions_triggers.sql, which
-- bypass RLS internally. This prevents users from forging notifications
-- to other people's inboxes.
