'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Activity,
  Menu,
  X,
  HeartPulse,
  History,
  Stethoscope,
  User,
  Users,
  LayoutDashboard,
  UserPlus,
} from 'lucide-react'
import { NotificationBell } from './NotificationBell'
import { SignOutButton } from './SignOutButton'

export type NavIconKey =
  | 'heart-pulse'
  | 'history'
  | 'stethoscope'
  | 'user'
  | 'users'
  | 'dashboard'
  | 'user-plus'

const ICON_MAP: Record<NavIconKey, React.ComponentType<{ className?: string }>> = {
  'heart-pulse': HeartPulse,
  'history': History,
  stethoscope: Stethoscope,
  user: User,
  users: Users,
  dashboard: LayoutDashboard,
  'user-plus': UserPlus,
}

export interface NavItem {
  name: string
  href: string
  icon: NavIconKey
}

export interface AppShellProps {
  user: {
    id: string
    email?: string | null
    user_metadata?: {
      full_name?: string
      name?: string
    } | null
  }
  role: string
  navItems: NavItem[]
  showNotifications?: boolean
  children: React.ReactNode
}

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  caregiver: 'Caregiver',
  doctor: 'Doctor',
  patient: 'Patient',
  family_member: 'Family',
  admin: 'System Admin',
}

export function AppShell({
  user,
  role,
  navItems,
  showNotifications = true,
  children,
}: AppShellProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Auto-close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  const roleLabel = ROLE_DISPLAY_NAMES[role] || role.replace('_', ' ')
  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'User'
  const initial = (displayName[0] || user.email?.[0] || 'U').toUpperCase()

  const isItemActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin'
    }
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const currentNav = navItems.find((item) => isItemActive(item.href))

  const navigationList = (
    <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto" aria-label="Sidebar navigation">
      {navItems.map((item) => {
        const active = isItemActive(item.href)
        const Icon = ICON_MAP[item.icon] || Activity
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
              active
                ? 'bg-[#EEF0FF] text-[#5B5FE8] shadow-xs'
                : 'text-slate-600 hover:text-[#1E2243] hover:bg-slate-50'
            }`}
          >
            <Icon
              className={`h-5 w-5 shrink-0 transition-colors ${
                active ? 'text-[#5B5FE8]' : 'text-slate-400 group-hover:text-slate-600'
              }`}
            />
            <span className="truncate">{item.name}</span>
            {active && (
              <span className="ml-auto w-1.5 h-4 rounded-full bg-[#5B5FE8]" aria-hidden="true" />
            )}
          </Link>
        )
      })}
    </nav>
  )

  const userCard = (
    <div className="p-3 border-t border-slate-100 bg-white">
      <div className="p-2.5 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-9 w-9 rounded-full bg-[#EEF0FF] text-[#5B5FE8] font-bold text-xs flex items-center justify-center shrink-0 ring-1 ring-[#5B5FE8]/20">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-[#1E2243] truncate leading-tight">
              {displayName}
            </p>
            {user.email && (
              <p className="text-[11px] text-slate-500 truncate leading-tight">
                {user.email}
              </p>
            )}
            <span className="inline-block mt-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-white border border-slate-200/80 text-[#5B5FE8]">
              {roleLabel}
            </span>
          </div>
        </div>
        <SignOutButton variant="icon" iconOnly />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F4F6FA] flex">
      {/* Desktop Fixed Left Sidebar */}
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200/80 z-30">
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-100 shrink-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#5B5FE8] text-white shadow-sm shadow-[#5B5FE8]/25">
            <Activity className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold tracking-tight text-[#1E2243]">CareConnect</span>
          </div>
        </div>

        {/* Navigation list */}
        {navigationList}

        {/* User Card */}
        {userCard}
      </aside>

      {/* Mobile Slide-out Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white flex flex-col shadow-2xl transition-transform duration-200 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Mobile Drawer"
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#5B5FE8] text-white shadow-sm shadow-[#5B5FE8]/25">
              <Activity className="h-5 w-5" />
            </div>
            <span className="text-base font-bold tracking-tight text-[#1E2243]">CareConnect</span>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {navigationList}
        {userCard}
      </aside>

      {/* Main Area: Top Bar + Content */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        {/* Sticky Top Header */}
        <header className="sticky top-0 z-20 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200/80 bg-white text-slate-600 hover:text-[#5B5FE8] hover:bg-[#EEF0FF] transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Current Section Title */}
            <div>
              <h1 className="text-sm sm:text-base font-bold text-[#1E2243]">
                {currentNav ? currentNav.name : roleLabel}
              </h1>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {showNotifications && <NotificationBell userId={user.id} />}
            <div className="hidden sm:block">
              <SignOutButton variant="outline" />
            </div>
            <div className="sm:hidden">
              <SignOutButton variant="icon" iconOnly />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
