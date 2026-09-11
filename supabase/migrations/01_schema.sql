-- =====================================================================
-- CARECONNECT — CORE DATABASE SCHEMA
-- Migration: 01_schema.sql
-- Target: Supabase (PostgreSQL 15+)
-- =====================================================================
-- Run order: 01_schema.sql -> 02_rls_policies.sql -> 03_functions_triggers.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- ENUM TYPES
-- ---------------------------------------------------------------------
create type user_role as enum (
  'admin',
  'doctor',
  'caregiver',
  'patient',
  'family_member'
);

create type patient_status as enum (
  'stable',
  'warning',
  'critical',
  'unassessed'   -- default before first doctor review
);

create type care_team_role as enum (
  'doctor',
  'caregiver',
  'family_member'
);

create type notification_type as enum (
  'new_vitals_log',       -- to doctor: caregiver submitted a log
  'status_update',        -- to caregiver/patient/family: doctor changed status
  'feedback_issued',      -- to caregiver/patient: doctor left instructions
  'critical_alert'        -- to family + caregiver + doctor: critical status
);

-- ---------------------------------------------------------------------
-- TABLE: users
-- Extends Supabase auth.users (1:1). id MUST match auth.users.id.
-- ---------------------------------------------------------------------
create table public.users (
  id              uuid primary key references auth.users(id) on delete cascade,
  role            user_role not null,
  full_name       text not null,
  email           text not null unique,
  phone           text,
  avatar_url      text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_users_role on public.users(role);
create index idx_users_email on public.users(email);

comment on table public.users is 'Profile + role for every authenticated actor. Mirrors auth.users 1:1.';

-- ---------------------------------------------------------------------
-- TABLE: patient_profiles
-- Satellite table for patient-specific clinical metadata + current status.
-- Kept separate from `users` so status changes don't touch the identity row.
-- ---------------------------------------------------------------------
create table public.patient_profiles (
  user_id             uuid primary key references public.users(id) on delete cascade,
  date_of_birth       date,
  sex                 text,
  primary_condition   text,             -- e.g. "Post-op cardiac recovery"
  current_status      patient_status not null default 'unassessed',
  status_updated_at   timestamptz,
  status_updated_by   uuid references public.users(id),  -- doctor who set it
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index idx_patient_profiles_status on public.patient_profiles(current_status);

comment on table public.patient_profiles is 'Clinical metadata + current live status badge for patients.';

-- ---------------------------------------------------------------------
-- TABLE: care_teams
-- Junction table. One patient can have many doctors/caregivers/family
-- members; one staff/family member can serve many patients.
-- ---------------------------------------------------------------------
create table public.care_teams (
  id                  uuid primary key default uuid_generate_v4(),
  patient_id          uuid not null references public.users(id) on delete cascade,
  member_id           uuid not null references public.users(id) on delete cascade,
  member_role         care_team_role not null,
  relationship_label  text,             -- e.g. "Daughter", "Primary Physician", "Night Shift"
  is_active           boolean not null default true,
  assigned_by         uuid references public.users(id),  -- admin who created the pairing
  assigned_at         timestamptz not null default now(),

  constraint uq_care_team_pairing unique (patient_id, member_id, member_role),
  constraint chk_member_role_matches check (true) -- enforced in trigger (03_functions_triggers.sql)
);

create index idx_care_teams_patient on public.care_teams(patient_id) where is_active = true;
create index idx_care_teams_member on public.care_teams(member_id) where is_active = true;
create index idx_care_teams_role on public.care_teams(member_role);

comment on table public.care_teams is 'Assigns doctors/caregivers/family members to a patient. Backbone of RLS visibility.';

-- ---------------------------------------------------------------------
-- TABLE: vitals_logs
-- Caregiver-submitted vitals + observation notes for a patient.
-- ---------------------------------------------------------------------
create table public.vitals_logs (
  id                uuid primary key default uuid_generate_v4(),
  patient_id        uuid not null references public.users(id) on delete cascade,
  caregiver_id      uuid not null references public.users(id) on delete restrict,

  bp_systolic       smallint,
  bp_diastolic      smallint,
  heart_rate        smallint,           -- bpm
  temperature_c     numeric(4,1),       -- Celsius, e.g. 37.2
  spo2              smallint,           -- % oxygen saturation
  notes             text,

  logged_at         timestamptz not null default now(),  -- when observation was taken
  created_at        timestamptz not null default now(),  -- when row was inserted

  constraint chk_spo2_range check (spo2 is null or (spo2 between 0 and 100)),
  constraint chk_hr_range check (heart_rate is null or (heart_rate between 0 and 300))
);

create index idx_vitals_patient_time on public.vitals_logs(patient_id, logged_at desc);
create index idx_vitals_caregiver on public.vitals_logs(caregiver_id);
-- Speeds up the doctor's triage queue (unreviewed logs, newest first)
create index idx_vitals_created_at on public.vitals_logs(created_at desc);

comment on table public.vitals_logs is 'Raw vitals + notes entered by caregivers. Immutable once created (append-only).';

-- ---------------------------------------------------------------------
-- TABLE: medical_reviews
-- Doctor's evaluation tied to one or more vitals logs. Writing a review
-- is also the mechanism that updates patient_profiles.current_status.
-- ---------------------------------------------------------------------
create table public.medical_reviews (
  id                uuid primary key default uuid_generate_v4(),
  patient_id        uuid not null references public.users(id) on delete cascade,
  doctor_id         uuid not null references public.users(id) on delete restrict,
  vitals_log_id     uuid references public.vitals_logs(id) on delete set null, -- the log that triggered this review, if any

  new_status        patient_status not null,
  feedback_notes    text not null,      -- clinical instructions/feedback shown to caregiver/patient
  is_urgent         boolean not null default false,

  reviewed_at       timestamptz not null default now()
);

create index idx_reviews_patient_time on public.medical_reviews(patient_id, reviewed_at desc);
create index idx_reviews_doctor on public.medical_reviews(doctor_id);
create index idx_reviews_vitals_log on public.medical_reviews(vitals_log_id);

comment on table public.medical_reviews is 'Doctor decisions: status change + feedback. Source of truth for status history.';

-- ---------------------------------------------------------------------
-- TABLE: notifications
-- Fan-out table for realtime alerts. One row per recipient per event.
-- ---------------------------------------------------------------------
create table public.notifications (
  id                  uuid primary key default uuid_generate_v4(),
  recipient_id        uuid not null references public.users(id) on delete cascade,
  patient_id          uuid not null references public.users(id) on delete cascade, -- context, for filtering
  type                notification_type not null,
  title               text not null,
  message             text not null,

  related_vitals_log_id  uuid references public.vitals_logs(id) on delete set null,
  related_review_id      uuid references public.medical_reviews(id) on delete set null,

  is_read             boolean not null default false,
  created_at          timestamptz not null default now()
);

create index idx_notifications_recipient on public.notifications(recipient_id, is_read, created_at desc);
create index idx_notifications_patient on public.notifications(patient_id);

comment on table public.notifications is 'Per-recipient alert feed. Powers Supabase Realtime subscriptions client-side.';

-- ---------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

create trigger trg_patient_profiles_updated_at
  before update on public.patient_profiles
  for each row execute function public.set_updated_at();
