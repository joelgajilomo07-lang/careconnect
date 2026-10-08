'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HeartPulse, History } from 'lucide-react'

interface NavItem {
  name: string
  href: string
  icon: typeof HeartPulse
  isActive: (pathname: string) => boolean
}

const NAV_ITEMS: NavItem[] = [
  {
    name: 'Log Vitals',
    href: '/log-vitals',
    icon: HeartPulse,
    isActive: (pathname: string) => pathname.startsWith('/log-vitals'),
  },
  {
    name: 'History',
    href: '/history',
    icon: History,
    isActive: (pathname: string) => pathname.startsWith('/history'),
  },
]

export function CaregiverNav({
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
        <div className="flex items-center justify-around h-16 max-w-md mx-auto px-4">
          {NAV_ITEMS.map((item) => {
            const active = item.isActive(pathname)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center justify-center min-h-[44px] min-w-[72px] py-1.5 px-3 rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  active
                    ? 'text-blue-600 font-bold bg-blue-50/90 shadow-2xs'
                    : 'text-gray-500 hover:text-blue-600 hover:bg-gray-50'
                }`}
              >
                <Icon
                  className={`h-5 w-5 mb-1 transition-colors ${
                    active ? 'text-blue-600' : 'text-gray-400'
                  }`}
                />
                <span className="text-[11px] tracking-tight">{item.name}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    )
  }

  // Desktop Navigation
  return (
    <nav className="hidden sm:flex items-center gap-1 sm:gap-2">
      {NAV_ITEMS.map((item) => {
        const active = item.isActive(pathname)
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
              active
                ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-500/20'
                : 'text-gray-600 font-medium hover:bg-gray-100 hover:text-blue-600'
            }`}
          >
            <Icon
              className={`h-4 w-4 transition-colors ${
                active ? 'text-white' : 'text-gray-500'
              }`}
            />
            <span>{item.name}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export function CaregiverMobileNav() {
  return <CaregiverNav variant="mobile" />
}
