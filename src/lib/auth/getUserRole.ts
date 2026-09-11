import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'

type UserRole = Database['public']['Enums']['user_role']

export async function getUserRole(userId: string): Promise<UserRole | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (error || !data) {
    console.error('Failed to fetch user role:', error)
    return null
  }

  return data.role
}
