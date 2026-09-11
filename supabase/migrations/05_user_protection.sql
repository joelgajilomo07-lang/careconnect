-- =====================================================================
-- CARECONNECT — USER PROTECTION TRIGGER
-- Migration: 05_user_protection.sql
-- =====================================================================

create or replace function public.prevent_self_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role != old.role and not public.is_admin() then
    raise exception 'Only admins may change a user''s role.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_self_role_change on public.users;
create trigger trg_prevent_self_role_change
  before update on public.users
  for each row execute function public.prevent_self_role_change();
