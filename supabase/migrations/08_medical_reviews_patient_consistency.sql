-- =====================================================================
-- CARECONNECT — CLINICAL INTEGRITY CONSTRAINT
-- Migration: 08_medical_reviews_patient_consistency.sql
-- =====================================================================

-- Defense-in-depth trigger:
-- Enforces that medical_reviews.patient_id strictly matches the patient_id
-- of the referenced vitals_logs row. Prevents any mismatched clinical reviews.
create or replace function public.enforce_medical_review_patient_match()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actual_patient_id uuid;
begin
  if new.vitals_log_id is not null then
    select patient_id into v_actual_patient_id
    from public.vitals_logs
    where id = new.vitals_log_id;

    if v_actual_patient_id is distinct from new.patient_id then
      raise exception 'Clinical integrity violation: medical_reviews.patient_id (%) does not match vitals_logs.patient_id (%)', 
        new.patient_id, v_actual_patient_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_medical_review_patient_match on public.medical_reviews;

create trigger trg_enforce_medical_review_patient_match
  before insert or update on public.medical_reviews
  for each row execute function public.enforce_medical_review_patient_match();
