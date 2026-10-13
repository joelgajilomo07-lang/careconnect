import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from './getUserRole'
import type { Database } from '@/types/database.types'

export type UserRole = Database['public']['Enums']['user_role']

const ROLE_HOME_ROUTES: Record<UserRole, string> = {
  admin: '/admin',
  doctor: '/doctor',
  caregiver: '/caregiver', 
  patient: '/patient', 
  family_member: '/family',
}

export async function requireRole(allowedRoles: UserRole[]) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  const role = await getUserRole(user.id)

  if (!role) {
    // If the user has no public.users profile, route them to the signout endpoint
    // (a Route Handler where cookies().set() is permitted and clears the session cookies cleanly)
    redirect('/api/auth/signout-unconfigured')
  }

  if (!allowedRoles.includes(role)) {
    // Route to designated dashboard
    const fallbackRoute = ROLE_HOME_ROUTES[role] || '/login'
    redirect(fallbackRoute)
  }

  return { user, role }
}
