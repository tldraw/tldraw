// Next.js Middleware for route protection
// Checks Supabase session and redirects as needed

import { validateSession } from '@/lib/supabase/middleware'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl

	// Validate session with Supabase Auth
	const { session, response } = await validateSession(request)
	const isAuthenticated = !!session

	// Auth pages - redirect to dashboard if already logged in
	const authPages = ['/login', '/signup', '/forgot-password', '/reset-password']
	if (authPages.includes(pathname)) {
		if (isAuthenticated) {
			return NextResponse.redirect(new URL('/dashboard', request.url))
		}
		return response
	}

	// Protected routes - redirect to login if not authenticated
	// Note: /d/ (documents) and /invite/ routes have custom auth handling in their page components
	const protectedRoutes = ['/dashboard', '/workspace', '/profile']
	const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))

	if (isProtectedRoute && !isAuthenticated) {
		const loginUrl = new URL('/login', request.url)
		// Preserve the original URL to redirect back after login
		loginUrl.searchParams.set('redirect', pathname)
		return NextResponse.redirect(loginUrl)
	}

	return response
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except:
		 * - api routes (except /api/auth)
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * - public files (public folder)
		 */
		'/((?!api/(?!auth)|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
	],
}
