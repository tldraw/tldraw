import { createClient } from '@supabase/supabase-js'
import { Environment } from '../types'

export function createSupabaseClient(env: Environment) {
	return env.SUPABASE_URL && env.SUPABASE_KEY
		? createClient(env.SUPABASE_URL, env.SUPABASE_KEY)
		: undefined
}

export function noSupabaseSorry() {
	return new Response(JSON.stringify({ error: true, message: 'Could not create supabase client' }))
}
