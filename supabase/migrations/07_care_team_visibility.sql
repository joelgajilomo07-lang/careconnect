-- =====================================================================
-- CARECONNECT — CARE TEAM USER VISIBILITY
-- Migration: 07_care_team_visibility.sql
-- =====================================================================

-- Allow active care team members sharing a patient to see each other's user profile
-- (e.g. doctor sees caregiver name, caregiver sees doctor name, family sees staff),
-- and allow patients to see active members assigned to their care team.
create policy "users_select_same_care_team"
  on public.users for select
  using (
    -- 1. Actor is an active care team member sharing a patient with target user
    exists (
      select 1
      from public.care_teams ct_self
      join public.care_teams ct_target
        on ct_self.patient_id = ct_target.patient_id
      where ct_self.member_id = auth.uid()
        and ct_self.is_active = true
        and ct_target.member_id = users.id
        and ct_target.is_active = true
    )
    -- 2. OR actor is the patient viewing an active member of their care team
    or exists (
      select 1
      from public.care_teams ct_member
      where ct_member.patient_id = auth.uid()
        and ct_member.member_id = users.id
        and ct_member.is_active = true
    )
  );
