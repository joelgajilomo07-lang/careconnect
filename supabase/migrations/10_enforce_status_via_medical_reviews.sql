-- =====================================================================
-- CARECONNECT — ENFORCE STATUS UPDATES ONLY VIA MEDICAL REVIEWS
-- Migration: 10_enforce_status_via_medical_reviews.sql
-- =====================================================================

-- 1. Update process_medical_review() so status_updated_at matches reviewed_at
create or replace function public.process_medical_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vitals_caregiver_id uuid;
  v_review_time timestamptz;
begin
  v_review_time := coalesce(new.reviewed_at, now());

  -- 1) Update patient_profiles.current_status with matching reviewed_at timestamp
  update public.patient_profiles
  set current_status = new.new_status,
      status_updated_at = v_review_time,
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

-- 2. Guard patient_profiles: prevent direct updates to current_status without a medical review
create or replace function public.guard_patient_profile_status_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- If current_status is being changed directly outside of a trigger execution chain
  if (old.current_status is distinct from new.current_status) and pg_trigger_depth() <= 1 then
    raise exception 'Direct modification of patient_profiles.current_status is disallowed. Clinical status must be updated via medical_reviews.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_patient_profile_status_update on public.patient_profiles;

create trigger trg_guard_patient_profile_status_update
  before update on public.patient_profiles
  for each row execute function public.guard_patient_profile_status_update();
