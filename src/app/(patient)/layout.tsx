import Link from 'next/link'
import { requireRole } from '@/lib/auth/roleGuard'
import { NotificationBell } from '@/components/shared/NotificationBell'
import { SignOutButton } from '@/components/shared/SignOutButton'
import { Activity, User } from 'lucide-react'

export default async function PatientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = await requireRole(['patient'])

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          {/* Logo & Role Identity */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm shadow-teal-500/20">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-gray-900">CareConnect</span>
              <span className="hidden sm:inline-flex ml-2 items-center rounded-md bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700 ring-1 ring-inset ring-teal-700/10">
                Patient Portal
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links, Notification Bell, & Sign Out */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Desktop-only nav */}
            <nav className="hidden sm:flex items-center gap-1 sm:gap-2">
              <Link
                href="/patient"
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 transition-colors duration-150"
              >
                <User className="h-4 w-4 text-teal-600" />
                <span>My Health</span>
              </Link>
            </nav>

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

      {/* Mobile Bottom Tab Bar */}
      <nav aria-label="Mobile Navigation" className="block sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg">
        <div className="flex items-center justify-around h-16 max-w-md mx-auto px-4">
          <Link
            href="/patient"
            className="flex flex-col items-center justify-center min-h-[44px] min-w-[64px] py-1 rounded-xl text-gray-600 hover:text-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 transition-colors duration-150"
          >
            <User className="h-5 w-5 text-teal-600 mb-1" />
            <span className="text-[11px] font-semibold">My Health</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}