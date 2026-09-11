import { requireRole } from '@/lib/auth/roleGuard'
import { careTeamsService } from '@/services/careTeamsService'
import { usersService } from '@/services/usersService'
import { CareTeamAssignmentForm, CareTeamsTable } from '@/components/admin'
import Link from 'next/link'
import {
  Users,
  ArrowLeft,
  ShieldCheck,
  HeartPulse,
  UserCheck,
  AlertCircle,
  UserPlus,
} from 'lucide-react'

export const metadata = {
  title: 'Care Team Assignments | CareConnect Admin',
  description: 'Manage clinical pairings between enrolled patients, physicians, bedside caregivers, and family members.',
}

export default async function CareTeamsPage() {
  await requireRole(['admin'])

  // Concurrently fetch all care teams and active users
  const [careTeamsRes, usersRes] = await Promise.all([
    careTeamsService.getAllCareTeams(),
    usersService.getAllUsers({ activeOnly: true }),
  ])

  const teamList = careTeamsRes.data || []
  const allActiveUsers = usersRes.data || []

  // Scoped lists:
  // Patients: strictly active users with role = 'patient'
  const patients = allActiveUsers
    .filter((u) => u.role === 'patient')
    .map((u) => ({ id: u.id, full_name: u.full_name }))

  // Candidate Members: strictly active non-admin/non-patient staff or family (doctor, caregiver, family_member)
  const candidateMembers = allActiveUsers
    .filter((u) => u.role === 'doctor' || u.role === 'caregiver' || u.role === 'family_member')
    .map((u) => ({
      id: u.id,
      full_name: u.full_name,
      role: u.role,
      email: u.email,
    }))

  // Metrics
  const activeAssignments = teamList.filter((a) => a.is_active === true)
  const uniquePatients = new Set(activeAssignments.map((a) => a.patient_id)).size
  const uniqueMembers = new Set(activeAssignments.map((a) => a.member_id)).size

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8 pb-24 sm:pb-12 space-y-6">
      {/* Top Breadcrumbs & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 min-h-[44px] sm:min-h-0 text-xs sm:text-sm font-medium text-gray-600 hover:text-slate-900 hover:underline rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 transition-colors duration-150"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/invite"
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 active:bg-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 transition-colors duration-150"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Invite New User</span>
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Care Team RLS Enforced</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Care Team Assignments
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Manage clinical pairings between enrolled patients, attending physicians, bedside caregivers, and family members.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-1">
            <Users className="h-4 w-4 text-purple-600" />
            <span>Active Pairings</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{activeAssignments.length}</p>
          <span className="text-[11px] text-gray-400">Total active team relationships</span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-1">
            <UserCheck className="h-4 w-4 text-teal-600" />
            <span>Assigned Patients</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{uniquePatients}</p>
          <span className="text-[11px] text-gray-400">Patients with active care teams</span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-1">
            <HeartPulse className="h-4 w-4 text-blue-600" />
            <span>Active Team Members</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{uniqueMembers}</p>
          <span className="text-[11px] text-gray-400">Physicians, caregivers, &amp; family</span>
        </div>
      </div>

      {/* Error state if query failed */}
      {careTeamsRes.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Failed to load care teams</p>
            <p className="text-xs mt-0.5">{careTeamsRes.error}</p>
          </div>
        </div>
      )}

      {/* Assignment Form Panel */}
      <section>
        <CareTeamAssignmentForm
          patients={patients}
          candidateMembers={candidateMembers}
        />
      </section>

      {/* Interactive Assignments Table */}
      <section>
        <CareTeamsTable assignments={teamList} />
      </section>
    </div>
  )
}