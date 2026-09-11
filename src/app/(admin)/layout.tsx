import Link from 'next/link'
import { requireRole } from '@/lib/auth/roleGuard'
import { SignOutButton } from '@/components/shared/SignOutButton'
import { Activity, ShieldCheck, Users, LayoutDashboard, UserPlus } from 'lucide-react'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = await requireRole(['admin'])

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col">
      {/* Top Admin Header Navigation */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          {/* Logo & Admin Identity */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-gray-900">CareConnect</span>
              <span className="hidden sm:inline-flex ml-2 items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-600/10">
                System Admin
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links & Sign Out */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Desktop-only nav */}
            <nav className="hidden sm:flex items-center gap-1 sm:gap-2">
              <Link
                href="/admin"
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 transition-colors duration-150"
              >
                <LayoutDashboard className="h-4 w-4 text-slate-600" />
                <span>Dashboard</span>
              </Link>
              <Link
                href="/admin/invite"
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 transition-colors duration-150"
              >
                <UserPlus className="h-4 w-4 text-slate-500" />
                <span>Invite User</span>
              </Link>
              <Link
                href="/care-teams"
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 transition-colors duration-150"
              >
                <Users className="h-4 w-4 text-slate-500" />
                <span>Care Teams</span>
              </Link>
            </nav>

            <div className="hidden sm:block h-6 w-px bg-gray-200" />

            {/* Admin Identity indicator */}
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-semibold text-gray-800">{user.email}</span>
              <span className="text-[10px] text-gray-400">Authenticated Admin</span>
            </div>

            <div className="hidden md:block h-6 w-px bg-gray-200" />

            {/* Sign Out Button */}
            <SignOutButton variant="outline" />
          </div>
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="flex-1 pb-24 sm:pb-16">
        {children}
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav aria-label="Mobile Navigation" className="block sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg">
        <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
          <Link
            href="/admin"
            className="flex flex-col items-center justify-center min-h-[44px] min-w-[64px] py-1 rounded-xl text-gray-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 transition-colors duration-150"
          >
            <LayoutDashboard className="h-5 w-5 text-slate-600 mb-1" />
            <span className="text-[11px] font-semibold">Dashboard</span>
          </Link>
          <Link
            href="/admin/invite"
            className="flex flex-col items-center justify-center min-h-[44px] min-w-[64px] py-1 rounded-xl text-gray-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 transition-colors duration-150"
          >
            <UserPlus className="h-5 w-5 text-slate-500 mb-1" />
            <span className="text-[11px] font-semibold">Invite</span>
          </Link>
          <Link
            href="/care-teams"
            className="flex flex-col items-center justify-center min-h-[44px] min-w-[64px] py-1 rounded-xl text-gray-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 transition-colors duration-150"
          >
            <Users className="h-5 w-5 text-slate-500 mb-1" />
            <span className="text-[11px] font-semibold">Care Teams</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}