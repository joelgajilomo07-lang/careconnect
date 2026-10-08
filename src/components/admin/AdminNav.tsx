'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, UserPlus, Users } from 'lucide-react'

interface NavItem {
  name: string
  mobileName: string
  href: string
  icon: typeof LayoutDashboard
  isActive: (pathname: string) => boolean
}

const NAV_ITEMS: NavItem[] = [
  {
    name: 'Dashboard',
    mobileName: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    isActive: (pathname: string) => pathname === '/admin',
  },
  {
    name: 'Invite User',
    mobileName: 'Invite',
    href: '/admin/invite',
    icon: UserPlus,
    isActive: (pathname: string) => pathname === '/admin/invite',
  },
  {
    name: 'Care Teams',
    mobileName: 'Care Teams',
    href: '/care-teams',
    icon: Users,
    isActive: (pathname: string) => pathname.startsWith('/care-teams'),
  },
]

export function AdminNav({
  variant = 'desktop',
}: {
  variant?: 'desktop' | 'mobile'
}) {
  const pathname = usePathname()

  if (variant === 'mobile') {
    return (
      <nav
        aria-label="Mobile Navigation"
        className="block sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg"
      >
        <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
          {NAV_ITEMS.map((item) => {
            const active = item.isActive(pathname)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center justify-center min-h-[44px] min-w-[72px] py-1.5 px-2 rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                  active
                    ? 'text-slate-900 font-bold bg-slate-100/90 shadow-2xs'
                    : 'text-gray-500 hover:text-slate-900 hover:bg-gray-50'
                }`}
              >
                <Icon
                  className={`h-5 w-5 mb-1 transition-colors ${
                    active ? 'text-slate-900' : 'text-gray-400'
                  }`}
                />
                <span className="text-[11px] tracking-tight">{item.mobileName}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    )
  }

  // Desktop Navigation
  return (
    <nav className="hidden sm:flex items-center gap-1 sm:gap-1.5">
      {NAV_ITEMS.map((item) => {
        const active = item.isActive(pathname)
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ${
              active
                ? 'bg-slate-900 text-white font-semibold shadow-sm'
                : 'text-gray-600 font-medium hover:bg-gray-100 hover:text-slate-900'
            }`}
          >
            <Icon
              className={`h-4 w-4 transition-colors ${
                active ? 'text-white' : 'text-slate-500'
              }`}
            />
            <span>{item.name}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export function AdminMobileNav() {
  return <AdminNav variant="mobile" />
}
