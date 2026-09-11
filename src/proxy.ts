import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  // Update the session, ensuring token refresh logic runs on every request
  const { supabaseResponse, user } = await updateSession(request)

  const path = request.nextUrl.pathname
  const isPublicRoute = path === '/login' || path === '/auth/confirm' || path.startsWith('/api') || path.includes('.')

  // 1. Unauthenticated users are redirected to login (unless already on a public route)
  if (!user && !isPublicRoute) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirect_to', path)
    return NextResponse.redirect(loginUrl)
  }

  // 2. Authenticated users trying to access login are redirected away
  if (user && path === '/login') {
    const homeUrl = request.nextUrl.clone()
    homeUrl.pathname = '/' // The app router can redirect this further based on role in roleGuard or home page logic
    return NextResponse.redirect(homeUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
