// Supabase Browser Client
// Client-side Supabase client for use in browser components

import { createBrowserClient } from '@supabase/ssr'
import { Database } from './types'

/**
 * Create a Supabase client for use in Client Components
 * This client automatically handles cookie-based authentication
 */
export function createClient() {
	return createBrowserClient<Database>(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
	)
}

/**
 * Singleton instance for browser client
 * Use this for consistent auth state across components
 */
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

export function getBrowserClient() {
	if (!browserClient) {
		browserClient = createClient()
	}
	return browserClient
}
