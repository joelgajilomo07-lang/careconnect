import { signOutAction } from '@/app/actions/auth'
import { LogOut } from 'lucide-react'

interface SignOutButtonProps {
  className?: string
  variant?: 'outline' | 'ghost' | 'pill' | 'icon'
  showIcon?: boolean
  label?: string
  iconOnly?: boolean
}

export function SignOutButton({
  className = '',
  variant = 'outline',
  showIcon = true,
  label = 'Sign Out',
  iconOnly = false,
}: SignOutButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center gap-1.5 text-xs font-semibold min-h-[36px] transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B5FE8]/40 focus-visible:ring-offset-1 select-none'

  const variantStyles = {
    outline:
      'rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm',
    ghost:
      'rounded-lg px-2.5 py-1.5 text-slate-500 hover:bg-[#EEF0FF] hover:text-[#5B5FE8]',
    pill:
      'rounded-full bg-slate-100 hover:bg-slate-200 px-3.5 py-1.5 text-slate-700 hover:text-slate-900',
    icon:
      'h-9 w-9 p-0 rounded-xl border border-slate-200/80 bg-white text-slate-500 hover:bg-[#EEF0FF] hover:text-[#5B5FE8] shadow-sm',
  }

  return (
    <form action={signOutAction} className="inline-flex m-0 p-0">
      <button
        type="submit"
        aria-label="Sign out of CareConnect"
        title="Sign out"
        className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      >
        {showIcon && <LogOut className="h-4 w-4" />}
        {!iconOnly && <span>{label}</span>}
      </button>
    </form>
  )
}
