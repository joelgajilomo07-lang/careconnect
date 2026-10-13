'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { inviteUserAction } from '@/app/(admin)/actions'
import type { Database } from '@/types/database.types'
import {
  UserPlus,
  Mail,
  User,
  Phone,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  HeartPulse,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  Info,
} from 'lucide-react'

type UserRole = Database['public']['Enums']['user_role']

export function InviteUserForm() {
  const [isPending, startTransition] = useTransition()

  // Form states
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('caregiver')
  const [phone, setPhone] = useState('')

  // Patient-specific fields
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [sex, setSex] = useState('Male')
  const [primaryCondition, setPrimaryCondition] = useState('')

  // Admin confirmation
  const [adminConfirmed, setAdminConfirmed] = useState(false)

  // Status & Feedback
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  function resetForm() {
    setFullName('')
    setEmail('')
    setRole('caregiver')
    setPhone('')
    setDateOfBirth('')
    setSex('Male')
    setPrimaryCondition('')
    setAdminConfirmed(false)
    setErrorMsg(null)
    setSuccessMsg(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!fullName.trim() || !email.trim()) {
      setErrorMsg('Full Name and Email address are required.')
      return
    }

    if (role === 'admin' && !adminConfirmed) {
      setErrorMsg('You must explicitly confirm authorization before provisioning an Administrator account.')
      return
    }

    startTransition(async () => {
      const res = await inviteUserAction({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        role,
        phone: phone.trim() || undefined,
        dateOfBirth: role === 'patient' && dateOfBirth ? dateOfBirth : undefined,
        sex: role === 'patient' && sex ? sex : undefined,
        primaryCondition: role === 'patient' && primaryCondition.trim() ? primaryCondition.trim() : undefined,
      })

      if (res.error) {
        setErrorMsg(res.error)
      } else {
        setSuccessMsg(`User "${fullName.trim()}" provisioned successfully as ${role.replace('_', ' ')}. An invitation email has been dispatched.`)
      }
    })
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-8 shadow-sm max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-gray-100 pb-5">
        <h2 className="text-xl sm:text-2xl font-black text-[#1E2243] flex items-center gap-2.5">
          <UserPlus className="h-6 w-6 text-slate-800" />
          Provision &amp; Invite New User
        </h2>
        <p className="text-sm sm:text-base font-medium text-slate-500 mt-1">
          Create an identity in authentication and instantiate their role-specific clinical profile.
        </p>
      </div>

      {/* Safety Notice about Real Emails */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-xs sm:text-sm text-amber-900 flex items-start gap-3">
        <Info className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold uppercase tracking-wider text-amber-950 text-xs sm:text-sm block">Email Dispatch Notice:</span>
          <p className="text-amber-800 leading-relaxed font-medium">
            This action triggers Supabase Auth to send a genuine invitation email with an onboarding link. For test accounts, please use <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono">@test.com</code> dummy addresses to prevent accidental email delivery to external individuals.
          </p>
        </div>
      </div>

      {/* Success Feedback */}
      {successMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-3 flex-1">
            <p className="font-bold text-base">{successMsg}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg bg-emerald-600 px-3.5 py-2 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 transition-colors duration-150 cursor-pointer min-h-[40px]"
              >
                Invite Another User
              </button>
              <Link
                href="/admin"
                className="rounded-lg bg-white px-3.5 py-2 text-xs sm:text-sm font-bold text-emerald-800 border border-emerald-300 hover:bg-emerald-50 hover:border-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 transition-colors duration-150 inline-flex items-center min-h-[40px]"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Error Feedback */}
      {errorMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-base">Action Failed</p>
            <p className="text-xs sm:text-sm font-medium text-red-700 mt-1 leading-relaxed">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Form */}
      {!successMsg && (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="fullName" className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-gray-400" />
                Full Name *
              </label>
              <input
                id="fullName"
                type="text"
                required
                placeholder="e.g. Dr. Arthur Conan"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 sm:py-3 text-sm sm:text-base font-medium text-[#1E2243] focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-gray-400" />
                Email Address *
              </label>
              <input
                id="email"
                type="email"
                required
                placeholder="name@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 sm:py-3 text-sm sm:text-base font-medium text-[#1E2243] focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Role & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="role" className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-gray-400" />
                System Role *
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 sm:py-3 text-sm sm:text-base font-medium text-[#1E2243] focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
              >
                <option value="caregiver">Caregiver (Bedside logging &amp; monitoring)</option>
                <option value="doctor">Doctor (Triage &amp; clinical reviews)</option>
                <option value="patient">Patient (Health tracking &amp; vitals trends)</option>
                <option value="family_member">Family Member (Loved one oversight)</option>
                <option value="admin">Administrator (Full system management)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="phone" className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-gray-400" />
                Phone Number (Optional)
              </label>
              <input
                id="phone"
                type="tel"
                placeholder="(555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 sm:py-3 text-sm sm:text-base font-medium text-[#1E2243] focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Conditional Fields: Patient Profile */}
          {role === 'patient' && (
            <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-teal-900 border-b border-teal-200/60 pb-2">
                <HeartPulse className="h-4.5 w-4.5 text-teal-600" />
                <span>Patient Clinical Profile Details</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="dob" className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-teal-600" />
                    Date of Birth
                  </label>
                  <input
                    id="dob"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 sm:py-3 text-sm sm:text-base font-medium text-[#1E2243] bg-white focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="sex" className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 block">
                    Sex
                  </label>
                  <select
                    id="sex"
                    value={sex}
                    onChange={(e) => setSex(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 sm:py-3 text-sm sm:text-base font-medium text-[#1E2243] bg-white focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="condition" className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 block">
                  Primary Condition / Diagnosis
                </label>
                <input
                  id="condition"
                  type="text"
                  placeholder="e.g. Hypertension &amp; Type 2 Diabetes, Post-Op Care"
                  value={primaryCondition}
                  onChange={(e) => setPrimaryCondition(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 sm:py-3 text-sm sm:text-base font-medium text-[#1E2243] bg-white focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>
            </div>
          )}

          {/* Conditional Guard: Admin Escalation Warning */}
          {role === 'admin' && (
            <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 sm:p-5 space-y-3">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs sm:text-sm font-bold text-red-950 uppercase tracking-wider">
                    Elevated Administrative Privilege Guard
                  </h4>
                  <p className="text-xs sm:text-sm text-red-900/90 leading-relaxed font-medium">
                    Granting the <strong>Administrator</strong> role confers full system authority: provisioning and deactivating staff, configuring patient care teams, accessing database audits, and creating other administrators.
                  </p>
                </div>
              </div>

              <label className="flex items-start gap-2.5 pt-2 border-t border-red-200/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={adminConfirmed}
                  onChange={(e) => setAdminConfirmed(e.target.checked)}
                  className="h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-500 mt-0.5"
                />
                <span className="text-xs sm:text-sm font-bold text-red-950 select-none">
                  I confirm that this individual is authorized for unrestricted system-wide administrative access across CareConnect.
                </span>
              </label>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-gray-100">
            <Link
              href="/admin"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white px-5 py-2.5 min-h-[44px] text-sm sm:text-base font-bold text-gray-700 hover:bg-gray-100 hover:border-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 transition-colors duration-150"
            >
              <ArrowLeft className="h-4 w-4" />
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isPending || (role === 'admin' && !adminConfirmed)}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 min-h-[44px] text-sm sm:text-base font-bold text-white shadow-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                role === 'admin'
                  ? 'bg-red-700 hover:bg-red-800 active:bg-red-900 focus-visible:ring-red-700'
                  : 'bg-slate-900 hover:bg-slate-800 active:bg-slate-950'
              }`}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Provisioning User...</span>
                </>
              ) : role === 'admin' ? (
                <>
                  <ShieldAlert className="h-4 w-4" />
                  <span>Provision System Administrator</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span>Send Invitation &amp; Create Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
