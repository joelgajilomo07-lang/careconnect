import { signOutAction } from '@/app/actions/auth'
import { LogOut } from 'lucide-react'

interface SignOutButtonProps {
  className?: string
  variant?: 'outline' | 'ghost' | 'pill'
  showIcon?: boolean
}

export function SignOutButton({
  className = '',
  variant = 'outline',
  showIcon = true,
}: SignOutButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center gap-1.5 text-xs font-semibold min-h-[44px] sm:min-h-[36px] transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 select-none'

  const variantStyles = {
    outline:
      'rounded-xl border border-gray-200 bg-white px-3 py-2 sm:py-1.5 text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300 shadow-sm',
    ghost:
      'rounded-lg px-2.5 py-2 sm:py-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900',
    pill:
      'rounded-full bg-gray-100 hover:bg-gray-200 px-3.5 py-2 sm:py-1.5 text-gray-700 hover:text-gray-900',
  }

  return (
    <form action={signOutAction} className="inline-flex m-0 p-0">
      <button
        type="submit"
        aria-label="Sign out of CareConnect"
        className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      >
        {showIcon && <LogOut className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />}
        <span>Sign Out</span>
      </button>
    </form>
  )
}
