// Supabase Middleware Client
// Middleware-specific Supabase client for session validation

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from './types'

/**
 * Create a Supabase client for use in Next.js middleware
 * This client handles session validation and cookie refresh
 */
export async function createMiddlewareClient(request: NextRequest) {
	// Create a response object that we can modify
	const response = NextResponse.next({
		request: {
			headers: request.headers,
		},
	})

	const supabase = createServerClient<Database>(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll()
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach(({ name, value, options }) => {
						request.cookies.set({ name, value, ...options })
						response.cookies.set({ name, value, ...options })
					})
				},
			},
		}
	)

	return { supabase, response }
}

/**
 * Validate session in middleware
 * Returns user if authenticated, null otherwise
 */
export async function validateSession(request: NextRequest) {
	const { supabase, response } = await createMiddlewareClient(request)

	// This will refresh the session if needed
	const {
		data: { session },
	} = await supabase.auth.getSession()

	return { session, response }
}
