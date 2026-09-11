-- =====================================================================
-- CARECONNECT — FUNCTIONS & TRIGGERS
-- Migration: 03_functions_triggers.sql
-- Depends on: 01_schema.sql, 02_rls_policies.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TRIGGER: Enforce care_teams.member_role matches users.role
-- ---------------------------------------------------------------------
create or replace function public.enforce_care_team_role()
returns trigger
language plpgsql
security definer
as $$
declare
  v_actual_role public.user_role;
begin
  select role into v_actual_role from public.users where id = new.member_id;
  
  if v_actual_role::text != new.member_role::text then
    raise exception 'care_team_role (%) must match users.role (%)', new.member_role, v_actual_role;
  end if;
  
  return new;
end;
$$;

create trigger trg_enforce_care_team_role
  before insert or update on public.care_teams
  for each row execute function public.enforce_care_team_role();

-- ---------------------------------------------------------------------
-- 2. TRIGGER: Notify doctors on new vitals_logs insert
-- ---------------------------------------------------------------------
create or replace function public.notify_doctors_on_new_vitals()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.notifications (
    recipient_id,
    patient_id,
    type,
    title,
    message,
    related_vitals_log_id
  )
  select 
    ct.member_id,
    new.patient_id,
    'new_vitals_log',
    'New Vitals Log',
    'A new vitals log has been submitted.',
    new.id
  from public.care_teams ct
  where ct.patient_id = new.patient_id
    and ct.member_role = 'doctor'
    and ct.is_active = true;

  return new;
end;
$$;

create trigger trg_notify_doctors_on_new_vitals
  after insert on public.vitals_logs
  for each row execute function public.notify_doctors_on_new_vitals();

-- ---------------------------------------------------------------------
-- 3. TRIGGER: medical_reviews insert -> update status & notify
-- ---------------------------------------------------------------------
create or replace function public.process_medical_review()
returns trigger
language plpgsql
security definer
as $$
declare
  v_vitals_caregiver_id uuid;
begin
  -- 1) Update patient_profiles.current_status
  update public.patient_profiles
  set current_status = new.new_status,
      status_updated_at = now(),
      status_updated_by = new.doctor_id
  where user_id = new.patient_id;

  -- 2) Find the caregiver who submitted the related vitals log (if any)
  if new.vitals_log_id is not null then
    select caregiver_id into v_vitals_caregiver_id 
    from public.vitals_logs 
    where id = new.vitals_log_id;
  end if;

  -- 3) Normal notifications for patient, family, and submitting caregiver
  
  -- Notify Patient
  insert into public.notifications (recipient_id, patient_id, type, title, message, related_review_id)
  values (new.patient_id, new.patient_id, 'feedback_issued', 'Doctor Review', 'A doctor has reviewed your status.', new.id);

  -- Notify Caregiver (if linked to a specific log)
  if v_vitals_caregiver_id is not null then
    insert into public.notifications (recipient_id, patient_id, type, title, message, related_review_id)
    values (v_vitals_caregiver_id, new.patient_id, 'feedback_issued', 'Doctor Review', 'A doctor has reviewed the vitals log you submitted.', new.id);
  end if;

  -- Notify Family Members
  insert into public.notifications (
    recipient_id, 
    patient_id, 
    type, 
    title, 
    message, 
    related_review_id
  )
  select 
    ct.member_id,
    new.patient_id,
    'status_update',
    'Status Update',
    'The patient status has been updated by a doctor.',
    new.id
  from public.care_teams ct
  where ct.patient_id = new.patient_id
    and ct.member_role = 'family_member'
    and ct.is_active = true;

  -- 4) If new_status = 'critical', fan-out 'critical_alert' to the WHOLE active care team
  if new.new_status = 'critical' then
    insert into public.notifications (
      recipient_id, 
      patient_id, 
      type, 
      title, 
      message, 
      related_review_id
    )
    select 
      ct.member_id,
      new.patient_id,
      'critical_alert',
      'CRITICAL ALERT',
      'Patient status has been marked as CRITICAL.',
      new.id
    from public.care_teams ct
    where ct.patient_id = new.patient_id
      and ct.is_active = true;
  end if;

  return new;
end;
$$;

create trigger trg_process_medical_review
  after insert on public.medical_reviews
  for each row execute function public.process_medical_review();
