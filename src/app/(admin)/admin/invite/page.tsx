import { requireRole } from '@/lib/auth/roleGuard'
import { InviteUserForm } from '@/components/admin/InviteUserForm'
import Link from 'next/link'
import { ArrowLeft, ShieldCheck } from 'lucide-react'

export const metadata = {
  title: 'Invite & Provision User | CareConnect Admin',
  description: 'Provision new healthcare personnel, patients, or family members into CareConnect.',
}

export default async function AdminInvitePage() {
  await requireRole(['admin'])

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8 pb-24 sm:pb-12 space-y-6">
      {/* Top Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 min-h-[44px] sm:min-h-0 text-sm font-bold text-slate-600 hover:text-slate-900 hover:underline rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 transition-colors duration-150"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin Dashboard
        </Link>
        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
          <ShieldCheck className="h-4 w-4 text-slate-600" />
          <span>Admin Authorization Verified</span>
        </div>
      </div>

      {/* Render Form */}
      <InviteUserForm />
    </div>
  )
}
