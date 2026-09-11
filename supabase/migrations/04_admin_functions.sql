-- =====================================================================
-- CARECONNECT — ADMIN FUNCTIONS
-- Migration: 04_admin_functions.sql
-- =====================================================================

create or replace function public.admin_create_user_profile(
  p_user_id uuid,
  p_email text,
  p_full_name text,
  p_role public.user_role,
  p_phone text default null,
  p_dob date default null,
  p_sex text default null,
  p_condition text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 1) insert users
  -- Note on privilege escalation: Any admin can currently mint other admins.
  -- This is intentional for the current scale, but if a super-admin tier is 
  -- needed later, an explicit check on auth.uid() vs allowed roles should be added here.
  insert into public.users (id, email, full_name, role, phone)
  values (p_user_id, p_email, p_full_name, p_role, p_phone);

  -- 2) conditionally insert patient_profiles
  if p_role = 'patient' then
    insert into public.patient_profiles (user_id, date_of_birth, sex, primary_condition, current_status)
    values (p_user_id, p_dob, p_sex, p_condition, 'unassessed');
  end if;
end;
$$;

-- By default, Postgres grants EXECUTE on functions to PUBLIC (which includes anon and authenticated).
-- Since this function is SECURITY DEFINER (bypassing RLS), we MUST explicitly revoke public access 
-- to prevent a user from calling it via supabase.rpc() directly from their browser.
revoke execute on function public.admin_create_user_profile from public, anon, authenticated;

-- Only grant EXECUTE to the service_role (which powers our server-side admin client).
grant execute on function public.admin_create_user_profile to service_role;
