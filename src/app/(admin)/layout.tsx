import { requireRole } from '@/lib/auth/roleGuard'
import { SignOutButton } from '@/components/shared/SignOutButton'
import { ShieldCheck } from 'lucide-react'
import { AdminNav, AdminMobileNav } from '@/components/admin'

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
            {/* Desktop-only nav with Active Highlights */}
            <AdminNav />

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

      {/* Mobile Bottom Tab Bar with Active Highlights */}
      <AdminMobileNav />
    </div>
  )
}