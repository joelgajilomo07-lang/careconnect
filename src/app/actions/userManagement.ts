'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/roleGuard'
import { createAdminClient } from '@/lib/supabase/admin'
import { auditService } from '@/services/auditService'
import type { Database } from '@/types/database.types'

export type UserRole = Database['public']['Enums']['user_role']

export interface ManagedUser {
  id: string
  full_name: string
  email: string
  role: UserRole
  is_active: boolean
  created_at: string
  phone?: string | null
  linkedPatient?: {
    id: string
    full_name: string
  } | null
}

export interface UnlinkedPatient {
  id: string
  full_name: string
  diagnosis?: string | null
}

export async function getUsersListAction() {
  const { user: adminUser } = await requireRole(['admin'])
  const adminClient = createAdminClient()

  const { data: users, error } = await adminClient
    .from('users')
    .select(`
      id,
      full_name,
      email,
      role,
      is_active,
      created_at,
      phone
    `)
    .order('created_at', { ascending: false })

  if (error || !users) {
    return { data: null, error: error?.message || 'Failed to fetch users' }
  }

  // Fetch patient account links
  const { data: patients } = await adminClient
    .from('patients')
    .select('id, full_name, user_id')
    .not('user_id', 'is', null)

  const patientMap = new Map<string, { id: string; full_name: string }>()
  if (patients) {
    for (const p of patients) {
      if (p.user_id) {
        patientMap.set(p.user_id, { id: p.id, full_name: p.full_name })
      }
    }
  }

  const result: ManagedUser[] = users.map((u) => ({
    id: u.id,
    full_name: u.full_name,
    email: u.email,
    role: u.role,
    is_active: u.is_active,
    created_at: u.created_at,
    phone: u.phone,
    linkedPatient: patientMap.get(u.id) || null,
  }))

  return { data: result, error: null }
}

export async function getUnlinkedPatientsAction() {
  await requireRole(['admin'])
  const adminClient = createAdminClient()

  const { data, error } = await adminClient
    .from('patients')
    .select('id, full_name, diagnosis')
    .is('user_id', null)
    .order('full_name', { ascending: true })

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: (data as UnlinkedPatient[]) || [], error: null }
}

export async function createUserAction(params: {
  fullName: string
  email: string
  role: UserRole
  password?: string
  linkPatientId?: string
}) {
  const { user: adminUser } = await requireRole(['admin'])
  const adminClient = createAdminClient()

  const fullName = params.fullName?.trim()
  const email = params.email?.trim().toLowerCase()
  const role = params.role
  const password = params.password?.trim()

  if (!fullName || !email) {
    return { error: 'Full name and email are required.' }
  }

  if (password && password.length < 8) {
    return { error: 'Temporary password must be at least 8 characters long.' }
  }

  // Check unique email in public.users
  const { data: existingUser } = await adminClient
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existingUser) {
    return { error: 'An account with this email address already exists.' }
  }

  // 1. Create user via Supabase Auth Admin API
  let authUserId: string
  if (password) {
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role },
    })

    if (authError || !authData.user) {
      return { error: `Failed to create auth user: ${authError?.message || 'Unknown error'}` }
    }
    authUserId = authData.user.id
  } else {
    // Send invitation email
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, role },
    })
    if (inviteError || !inviteData.user) {
      return { error: `Failed to invite user: ${inviteError?.message || 'Unknown error'}` }
    }
    authUserId = inviteData.user.id
  }

  // 2. Insert into public.users
  const { error: insertUserError } = await adminClient
    .from('users')
    .upsert({
      id: authUserId,
      email,
      full_name: fullName,
      role,
      is_active: true,
      failed_login_attempts: 0,
    })

  if (insertUserError) {
    return { error: `Profile creation failed: ${insertUserError.message}` }
  }

  // 3. If role = patient and linkPatientId provided, link to patient record (1:1)
  if (role === 'patient') {
    if (params.linkPatientId) {
      // Ensure the patient does not already have an account
      const { data: targetPatient } = await adminClient
        .from('patients')
        .select('id, user_id')
        .eq('id', params.linkPatientId)
        .single()

      if (targetPatient && !targetPatient.user_id) {
        await adminClient
          .from('patients')
          .update({ user_id: authUserId })
          .eq('id', params.linkPatientId)
      }
    } else {
      // Create new patient record matching this account
      await adminClient.from('patients').insert({
        full_name: fullName,
        user_id: authUserId,
      })
    }
  }

  // 4. Log in audit_logs
  await auditService.record({
    userId: adminUser.id,
    action: 'USER_CREATE',
    recordType: 'user',
    recordId: authUserId,
    details: {
      email,
      full_name: fullName,
      role,
      linked_patient_id: params.linkPatientId || null,
    },
  })

  revalidatePath('/admin/users')
  revalidatePath('/admin')
  return { success: true, userId: authUserId }
}

export async function updateUserAction(params: {
  userId: string
  fullName: string
  role: UserRole
  phone?: string
  linkPatientId?: string
}) {
  const { user: adminUser } = await requireRole(['admin'])
  const adminClient = createAdminClient()

  const { userId, fullName, role, phone, linkPatientId } = params

  if (!fullName?.trim()) {
    return { error: 'Full name is required.' }
  }

  // Update public.users
  const { error } = await adminClient
    .from('users')
    .update({
      full_name: fullName.trim(),
      role,
      phone: phone?.trim() || null,
    })
    .eq('id', userId)

  if (error) {
    return { error: error.message }
  }

  // Update auth metadata
  await adminClient.auth.admin.updateUserById(userId, {
    user_metadata: { full_name: fullName.trim(), role },
  })

  // Patient link update
  if (role === 'patient' && linkPatientId) {
    // Clear old patient linked to this user
    await adminClient
      .from('patients')
      .update({ user_id: null })
      .eq('user_id', userId)

    // Set new patient
    await adminClient
      .from('patients')
      .update({ user_id: userId })
      .eq('id', linkPatientId)
  }

  // Audit log
  await auditService.record({
    userId: adminUser.id,
    action: 'USER_UPDATE',
    recordType: 'user',
    recordId: userId,
    details: { full_name: fullName, role, phone, link_patient_id: linkPatientId },
  })

  revalidatePath('/admin/users')
  revalidatePath('/admin')
  return { success: true }
}

export async function toggleUserStatusAction(userId: string, newStatus: boolean) {
  const { user: adminUser } = await requireRole(['admin'])
  const adminClient = createAdminClient()

  // Constraint: An administrator cannot deactivate their own account!
  if (userId === adminUser.id && !newStatus) {
    return { error: 'An administrator cannot deactivate their own account.' }
  }

  const { error } = await adminClient
    .from('users')
    .update({ is_active: newStatus })
    .eq('id', userId)

  if (error) {
    return { error: error.message }
  }

  // If deactivating, ban auth user or clear ban
  if (!newStatus) {
    await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: '876000h', // Banned for 100 years
    })
  } else {
    await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: 'none',
    })
  }

  // Audit log
  await auditService.record({
    userId: adminUser.id,
    action: newStatus ? 'USER_REACTIVATE' : 'USER_DEACTIVATE',
    recordType: 'user',
    recordId: userId,
    details: { new_status: newStatus ? 'active' : 'inactive' },
  })

  revalidatePath('/admin/users')
  revalidatePath('/admin')
  return { success: true }
}

export async function resetUserPasswordAction(userId: string, newPassword: string) {
  const { user: adminUser } = await requireRole(['admin'])
  const adminClient = createAdminClient()

  if (!newPassword || newPassword.length < 8) {
    return { error: 'Password must be at least 8 characters long.' }
  }

  // Update password in Supabase Auth
  const { error: authErr } = await adminClient.auth.admin.updateUserById(userId, {
    password: newPassword,
  })

  if (authErr) {
    return { error: `Failed to reset password: ${authErr.message}` }
  }

  // Reset failed login attempts and lockout
  await adminClient
    .from('users')
    .update({
      failed_login_attempts: 0,
      locked_until: null,
    })
    .eq('id', userId)

  // Audit log
  await auditService.record({
    userId: adminUser.id,
    action: 'PASSWORD_RESET',
    recordType: 'user',
    recordId: userId,
  })

  return { success: true }
}
