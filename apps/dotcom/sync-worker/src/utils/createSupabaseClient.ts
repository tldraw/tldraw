import { createClient } from '@supabase/supabase-js'
import { Environment } from '../types'

// `autoRefreshToken` is what keeps a durable object out of hibernation. GoTrueClient's constructor
// calls initialize(), whose finally block always calls _handleVisibilityChange(); outside a browser
// (`isBrowser()` checks for `window` and `document`, neither of which exist in workerd) that branch
// calls startAutoRefresh() whenever `autoRefreshToken` is enabled (which it is by default), arming
// a 30 second setInterval that nothing ever clears.
// A durable object cannot hibernate while any timer is scheduled, so a single one of these makes
// TLFileDurableObject billable for its entire residency — it constructs one of these in its
// constructor, on every wake.
// https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/
//
// We never sign a user in through this client — it reads legacy rooms with the anon key — so there
// is no token to refresh, no session to persist, and no URL to detect a session in.
export function createSupabaseClient(env: Environment) {
	return env.SUPABASE_URL && env.SUPABASE_KEY
		? createClient(env.SUPABASE_URL, env.SUPABASE_KEY, {
				auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
			})
		: undefined
}

export function noSupabaseSorry() {
	return new Response(JSON.stringify({ error: true, message: 'Could not create supabase client' }))
}
