import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/types/supabase'

// Define route patterns
const protectedRoutes = ['/dashboard', '/tasks', '/timeline', '/analytics', '/settings', '/profile']
const authRoutes = ['/login', '/auth/signup', '/auth/forgot-password']
const publicRoutes = ['/', '/about', '/pricing', '/contact', '/terms', '/privacy']

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient<Database>({ req, res })

  // Refresh session if expired
  const {
    data: { session },
    error
  } = await supabase.auth.getSession()

  const { pathname } = req.nextUrl

  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))
  const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith('/api')

  // If user is not authenticated and trying to access protected route
  if (isProtectedRoute && !session) {
    const redirectUrl = new URL('/login', req.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // If user is authenticated and trying to access auth routes
  if (isAuthRoute && session) {
    const redirectUrl = req.nextUrl.searchParams.get('redirect') || '/dashboard'
    return NextResponse.redirect(new URL(redirectUrl, req.url))
  }

  // Handle root redirect
  if (pathname === '/') {
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    // For non-authenticated users, let them see the landing page
    return res
  }

  // For all other routes, continue normally
  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|public|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}