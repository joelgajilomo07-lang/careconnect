import { requireRole } from '@/lib/auth/roleGuard'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  ShieldCheck,
  Users,
  Stethoscope,
  HeartPulse,
  Activity,
  FileCheck2,
  ArrowRight,
  UserCheck,
  Clock,
  Radio,
  UserPlus,
} from 'lucide-react'

export default async function AdminDashboardPage() {
  const { user } = await requireRole(['admin'])
  const supabase = await createClient()

  // Concurrently fetch counts and recent users
  const [
    { count: totalPatients },
    { count: totalDoctors },
    { count: totalCaregivers },
    { count: totalFamily },
    { count: totalCareTeams },
    { count: totalVitalsLogs },
    { count: totalReviews },
    { data: recentUsers },
  ] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'patient'),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'doctor'),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'caregiver'),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'family_member'),
    supabase.from('care_teams').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('vitals_logs').select('id', { count: 'exact', head: true }),
    supabase.from('medical_reviews').select('id', { count: 'exact', head: true }),
    supabase
      .from('users')
      .select('id, full_name, email, role, is_active, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const roleStyles = {
    admin: 'bg-slate-100 text-slate-800 border-slate-200',
    doctor: 'bg-purple-50 text-purple-700 border-purple-200',
    caregiver: 'bg-blue-50 text-blue-700 border-blue-200',
    patient: 'bg-teal-50 text-teal-700 border-teal-200',
    family_member: 'bg-amber-50 text-amber-700 border-amber-200',
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8 pb-24 sm:pb-12 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            System Administration
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Clinical oversight, care team provisioning, and security audit directory
          </p>
        </div>

        {/* Security & System Status Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/invite"
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 sm:py-1.5 min-h-[44px] sm:min-h-0 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Invite New User</span>
          </Link>
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>RLS Active</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
            <Radio className="h-3.5 w-3.5 text-blue-600" />
            <span>Realtime Armed</span>
          </div>
        </div>
      </div>


      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-teal-600 text-xs font-medium mb-1">
            <UserCheck className="h-4 w-4" />
            <span>Patients</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalPatients ?? 0}</p>
          <span className="text-[11px] text-gray-400">Enrolled Patients</span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-purple-600 text-xs font-medium mb-1">
            <Stethoscope className="h-4 w-4" />
            <span>Doctors</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalDoctors ?? 0}</p>
          <span className="text-[11px] text-gray-400">Attending Physicians</span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-blue-600 text-xs font-medium mb-1">
            <HeartPulse className="h-4 w-4" />
            <span>Caregivers</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalCaregivers ?? 0}</p>
          <span className="text-[11px] text-gray-400">Bedside Staff</span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-amber-600 text-xs font-medium mb-1">
            <Users className="h-4 w-4" />
            <span>Care Teams</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalCareTeams ?? 0}</p>
          <span className="text-[11px] text-gray-400">Active Pairings</span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-medium mb-1">
            <Activity className="h-4 w-4" />
            <span>Vitals Logs</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalVitalsLogs ?? 0}</p>
          <span className="text-[11px] text-gray-400">Total Recorded</span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-medium mb-1">
            <FileCheck2 className="h-4 w-4" />
            <span>Reviews</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalReviews ?? 0}</p>
          <span className="text-[11px] text-gray-400">Doctor Reviews</span>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/care-teams"
          className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:border-slate-800 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 transition-all duration-150 flex flex-col justify-between space-y-4"
        >
          <div className="space-y-2">
            <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
              Care Team Assignments
            </h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              Configure patient-to-staff pairings. Assign attending physicians, dedicated caregivers, and family contacts to ensure RLS-compliant clinical access.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600">
            <span>Manage Care Teams</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="h-10 w-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">
              Role-Based Access Enforcement
            </h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              All data access is bounded at the database layer via PostgreSQL Row Level Security policies. Users only see clinical records for patients on their verified active care team.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Admin session: {user.email}</span>
          </div>
        </div>
      </div>

      {/* System Users Directory */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Registered System Users</h2>
            <p className="text-xs text-gray-500">
              All provisioned accounts with database roles and active status
            </p>
          </div>
          <span className="text-xs text-gray-400">Showing recent 10 users</span>
        </div>

        {/* Mobile Card View (< sm) */}
        <div className="block sm:hidden space-y-3">
          {recentUsers && recentUsers.length > 0 ? (
            recentUsers.map((u) => (
              <div
                key={u.id}
                className="rounded-xl border border-gray-200 bg-gray-50/40 p-3.5 space-y-2.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900">{u.full_name}</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${
                      roleStyles[u.role as keyof typeof roleStyles] || 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {u.role.replace('_', ' ')}
                  </span>
                </div>
                <div className="font-mono text-gray-600 truncate">{u.email}</div>
                <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-gray-500 text-[11px]">
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span>{format(new Date(u.created_at), 'MMM dd, yyyy')}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="py-6 text-center text-gray-400">No registered users found.</p>
          )}
        </div>

        {/* Desktop / Tablet Table View (sm+) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-200 bg-gray-50/75 text-gray-500 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Name</th>
                <th className="py-2.5 px-3">Email</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentUsers && recentUsers.length > 0 ? (
                recentUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition">
                    <td className="py-3 px-3 font-medium text-gray-900">{u.full_name}</td>
                    <td className="py-3 px-3 font-mono text-gray-600">{u.email}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${
                          roleStyles[u.role as keyof typeof roleStyles] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-gray-400 whitespace-nowrap">
                      {format(new Date(u.created_at), 'MMM dd, yyyy')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    No registered users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}