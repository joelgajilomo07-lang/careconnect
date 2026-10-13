'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { auditService } from '@/services/auditService'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export type LoginResult = {
  success: boolean
  error?: string
  redirectTo?: string
}

/**
 * Server Action for User Authentication with Lockout Protection & Audit Logging.
 * Enforces:
 * - 5 failed attempts -> 15 minute lockout
 * - Deactivated account check
 * - Clear error message without revealing whether email exists
 * - Automatic reset of counter on success
 * - Audit logs for LOGIN, FAILED_LOGIN, LOCKOUT
 */
export async function loginAction(formData: {
  email: string
  password: string
}): Promise<LoginResult> {
  const email = (formData.email || '').trim().toLowerCase()
  const password = formData.password || ''

  if (!email || !password) {
    return { success: false, error: 'Please enter both email and password.' }
  }

  let ip = '127.0.0.1'
  try {
    const headerList = await headers()
    ip =
      headerList.get('x-forwarded-for')?.split(',')[0].trim() ||
      headerList.get('x-real-ip') ||
      '127.0.0.1'
  } catch {
    // Graceful fallback when executed outside standard Next.js request context
  }

  const adminClient = createAdminClient()
  const { data: userProfile } = await adminClient
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle()

  // 1. Deactivated account check
  if (userProfile && userProfile.is_active === false) {
    await auditService.record({
      userId: userProfile.id,
      userName: userProfile.full_name,
      userRole: userProfile.role,
      action: 'FAILED_LOGIN',
      recordType: 'auth',
      recordId: userProfile.id,
      ipAddress: ip,
      details: { reason: 'account_inactive', email },
    })
    return {
      success: false,
      error: 'Your account is inactive. Please contact the administrator.',
    }
  }

  // 2. Lockout check (5 failed attempts locks for 15 minutes)
  if (userProfile && userProfile.locked_until) {
    const lockedUntil = new Date(userProfile.locked_until)
    const now = new Date()
    if (lockedUntil > now) {
      const remainingMinutes = Math.ceil(
        (lockedUntil.getTime() - now.getTime()) / (60 * 1000)
      )
      await auditService.record({
        userId: userProfile.id,
        userName: userProfile.full_name,
        userRole: userProfile.role,
        action: 'FAILED_LOGIN',
        recordType: 'auth',
        recordId: userProfile.id,
        ipAddress: ip,
        details: { reason: 'account_locked', remainingMinutes, email },
      })
      return {
        success: false,
        error: `Too many failed attempts. Try again in ${remainingMinutes} minute${
          remainingMinutes === 1 ? '' : 's'
        }.`,
      }
    }
  }

  // 3. Attempt Supabase Auth login
  const supabase = await createClient()
  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    })

  // 4. Handle failed credentials
  if (authError || !authData.user) {
    if (userProfile) {
      const newAttempts = (userProfile.failed_login_attempts || 0) + 1
      let isNowLocked = false
      let lockedUntilStr: string | null = null

      if (newAttempts >= 5) {
        isNowLocked = true
        const lockDate = new Date(Date.now() + 15 * 60 * 1000)
        lockedUntilStr = lockDate.toISOString()
      }

      await adminClient
        .from('users')
        .update({
          failed_login_attempts: newAttempts,
          locked_until: lockedUntilStr,
        })
        .eq('id', userProfile.id)

      if (isNowLocked) {
        await auditService.record({
          userId: userProfile.id,
          userName: userProfile.full_name,
          userRole: userProfile.role,
          action: 'LOCKOUT',
          recordType: 'auth',
          recordId: userProfile.id,
          ipAddress: ip,
          details: {
            attempts: newAttempts,
            lockedDurationMinutes: 15,
            email,
          },
        })
        return {
          success: false,
          error: 'Too many failed attempts. Try again in 15 minutes.',
        }
      }

      await auditService.record({
        userId: userProfile.id,
        userName: userProfile.full_name,
        userRole: userProfile.role,
        action: 'FAILED_LOGIN',
        recordType: 'auth',
        recordId: userProfile.id,
        ipAddress: ip,
        details: { attempts: newAttempts, email },
      })
    } else {
      await auditService.record({
        action: 'FAILED_LOGIN',
        recordType: 'auth',
        ipAddress: ip,
        details: { reason: 'user_not_found', email },
      })
    }

    // Generic error that does not reveal email existence
    return { success: false, error: 'Invalid email or password.' }
  }

  // 5. Successful login: reset counters and record audit log
  if (userProfile) {
    await adminClient
      .from('users')
      .update({
        failed_login_attempts: 0,
        locked_until: null,
      })
      .eq('id', userProfile.id)
  }

  await auditService.record({
    userId: authData.user.id,
    userName: userProfile?.full_name || authData.user.email,
    userRole: userProfile?.role,
    action: 'LOGIN',
    recordType: 'auth',
    recordId: authData.user.id,
    ipAddress: ip,
    details: { email },
  })

  // 6. Direct each role to its designated dashboard
  let destination = '/admin'
  switch (userProfile?.role) {
    case 'admin':
      destination = '/admin'
      break
    case 'doctor':
      destination = '/doctor'
      break
    case 'caregiver':
      destination = '/caregiver'
      break
    case 'family_member':
      destination = '/family'
      break
    case 'patient':
      destination = '/patient'
      break
    default:
      destination = '/'
  }

  try {
    revalidatePath('/', 'layout')
  } catch {
    // Graceful fallback outside request context
  }
  return { success: true, redirectTo: destination }
}

/**
 * Server Action to sign out current user with audit logging.
 */
export async function signOutAction() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const adminClient = createAdminClient()
    const { data: userProfile } = await adminClient
      .from('users')
      .select('full_name, role')
      .eq('id', user.id)
      .maybeSingle()

    const headerList = await headers()
    const ip =
      headerList.get('x-forwarded-for')?.split(',')[0].trim() ||
      headerList.get('x-real-ip') ||
      '127.0.0.1'

    await auditService.record({
      userId: user.id,
      userName: userProfile?.full_name || user.email,
      userRole: userProfile?.role,
      action: 'LOGOUT',
      recordType: 'auth',
      recordId: user.id,
      ipAddress: ip,
      details: { email: user.email },
    })
  }

  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
