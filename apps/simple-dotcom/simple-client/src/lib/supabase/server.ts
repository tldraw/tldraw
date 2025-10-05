// Supabase Server Client
// Server-side Supabase client configuration

import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
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
 * Create a Supabase admin client with service role key
 * This client bypasses RLS policies - use with caution
 * Only use in API routes where you've verified authentication
 */
export function createAdminClient() {
	return createSupabaseClient<Database>(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.SUPABASE_SERVICE_ROLE_KEY!,
		{
			auth: {
				autoRefreshToken: false,
				persistSession: false,
			},
		}
	)
}

/**
 * Get the current authenticated user from the session
 * Returns null if not authenticated or if user doesn't exist in public.users
 *
 * This function ensures that the authenticated user exists in both auth.users
 * and public.users to prevent foreign key constraint violations.
 */
export async function getCurrentUser() {
	const supabase = await createClient()
	const {
		data: { user: authUser },
	} = await supabase.auth.getUser()

	if (!authUser) return null

	// Ensure user exists in public.users to prevent FK constraint violations
	const { data: publicUser } = await supabase
		.from('users')
		.select('id, email, display_name, name')
		.eq('id', authUser.id)
		.single()

	if (!publicUser) {
		console.error('Auth/User sync mismatch detected', {
			authUserId: authUser.id,
			authEmail: authUser.email,
		})
		return null
	}

	// Return combined user data with public.users fields available
	return { ...authUser, ...publicUser }
}

/**
 * Get the current user's ID
 * Throws an ApiException if not authenticated
 */
export async function requireAuth() {
	const user = await getCurrentUser()
	if (!user) {
		const { ApiException, ErrorCodes } = await import('@/lib/api/errors')
		throw new ApiException(401, ErrorCodes.UNAUTHORIZED, 'Not authenticated')
	}
	return user
}
