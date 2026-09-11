import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function seed() {
  console.log('Seeding test users...')
  const roles = ['admin', 'doctor', 'caregiver', 'patient', 'family_member'] as const

  for (const role of roles) {
    const email = `${role}@test.com`
    
    // 1. Create user properly via Admin API
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password: 'password123',
      email_confirm: true
    })
    
    if (authErr) {
      console.error(`Error creating auth for ${role}:`, authErr.message)
      continue
    }
    
    const userId = authData.user.id
    
    // 2. Create profile via RPC
    const { error: rpcErr } = await supabase.rpc('admin_create_user_profile', {
      p_user_id: userId,
      p_email: email,
      p_full_name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
      p_role: role,
      p_dob: role === 'patient' ? '1980-01-01' : null,
      p_sex: role === 'patient' ? 'M' : null,
      p_condition: role === 'patient' ? 'Test Condition' : null
    })
    
    if (rpcErr) {
      console.error(`Error creating profile for ${role}:`, rpcErr.message)
      // Cleanup auth user if profile fails
      await supabase.auth.admin.deleteUser(userId)
    } else {
      console.log(`Successfully seeded: ${email} (password: password123)`)
    }
  }
}

seed()
