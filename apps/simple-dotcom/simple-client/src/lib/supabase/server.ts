// Supabase Server Client
// Server-side Supabase client configuration

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from './types'

/**
 * Create a Supabase client for use in Server Components and API Routes
 * This client automatically handles cookie-based authentication
 */
export async function createClient() {
	const cookieStore = await cookies()

	return createServerClient<Database>(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: {
				getAll() {
					return cookieStore.getAll()
				},
				setAll(cookiesToSet) {
					try {
						cookiesToSet.forEach(({ name, value, options }) => {
							cookieStore.set(name, value, options)
						})
					} catch {
						// The `setAll` method was called from a Server Component.
						// This can be ignored if you have middleware refreshing
						// user sessions.
					}
				},
			},
		}
	)
}

/**
 * Get the current authenticated user from the session
 * Returns null if not authenticated
 */
export async function getCurrentUser() {
	const supabase = await createClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()
	return user
}

/**
 * Get the current user's ID
 * Throws an error if not authenticated
 */
export async function requireAuth() {
	const user = await getCurrentUser()
	if (!user) {
		throw new Error('Unauthorized')
	}
	return user
}
