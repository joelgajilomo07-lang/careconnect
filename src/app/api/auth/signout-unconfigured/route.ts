import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const supabase = await createClient()

  // Sign out properly inside a Route Handler where cookies().set() is fully mutable
  await supabase.auth.signOut()

  return redirect('/login?error=account_not_configured')
}
