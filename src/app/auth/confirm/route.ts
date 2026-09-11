import { createClient } from '@/lib/supabase/server'
import { type EmailOtpType } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error) {
      // Exchange successful; session cookies are set.
      // Send user to set their password.
      return redirect('/set-password')
    }
    console.error('verifyOtp error in /auth/confirm:', error.message)
  }

  // If token_hash or type is missing, or verifyOtp fails:
  return redirect('/login?error=invalid_or_expired_link')
}
