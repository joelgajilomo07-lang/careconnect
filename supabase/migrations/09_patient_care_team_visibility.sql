-- =====================================================================
-- CARECONNECT — PATIENT CARE TEAM VISIBILITY
-- Migration: 09_patient_care_team_visibility.sql
-- =====================================================================

-- Allow patients to view care team records where they are the patient
-- (so a patient can view the doctors, caregivers, and family members on their care team)
create policy "care_teams_select_patient_self"
  on public.care_teams for select
  using (patient_id = auth.uid());
