import { requireRole } from '@/lib/auth/roleGuard'
import { NotificationBell } from '@/components/shared/NotificationBell'
import { SignOutButton } from '@/components/shared/SignOutButton'
import { Activity } from 'lucide-react'
import { CaregiverNav, CaregiverMobileNav } from '@/components/caregiver'

export default async function CaregiverLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = await requireRole(['caregiver'])

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          {/* Logo & Role Identity */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/20">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-gray-900">CareConnect</span>
              <span className="hidden sm:inline-flex ml-2 items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                Caregiver
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links, Notification Bell & Sign Out */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Desktop-only nav with Active Highlights */}
            <CaregiverNav />

            <div className="hidden sm:block h-6 w-px bg-gray-200" />

            {/* Realtime Notification Bell */}
            <NotificationBell userId={user.id} />

            <div className="h-6 w-px bg-gray-200" />

            {/* Sign Out Action */}
            <SignOutButton variant="outline" />
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="flex-1 pb-24 sm:pb-16">
        {children}
      </main>

      {/* Mobile Bottom Tab Bar with Active Highlights */}
      <CaregiverMobileNav />
    </div>
  )
}