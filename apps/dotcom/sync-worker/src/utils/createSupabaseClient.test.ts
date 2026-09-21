import { createClient } from '@supabase/supabase-js'
import { vi } from 'vitest'
import { Environment } from '../types'
import { createSupabaseClient } from './createSupabaseClient'

const SUPABASE_URL = 'https://stub.supabase.co'
const SUPABASE_KEY = 'stub-anon-key'
const env = { SUPABASE_URL, SUPABASE_KEY } as Environment

describe('createSupabaseClient', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('schedules no timers, so the durable object that builds it can hibernate', async () => {
		const client = createSupabaseClient(env)
		expect(client).toBeDefined()

		// GoTrueClient arms its auto-refresh interval asynchronously, from initialize()'s finally
		// block — flush the microtask queue so any timer it would arm has been armed.
		await vi.advanceTimersByTimeAsync(0)

		expect(vi.getTimerCount()).toBe(0)
	})

	// Negative control: prove this harness catches the timer when it is armed. If a supabase-js
	// bump moves the auto-refresh interval somewhere these fake timers can't see, this fails
	// rather than letting the test above pass vacuously.
	it('a client with default auth options does arm the auto-refresh interval', async () => {
		createClient(SUPABASE_URL, SUPABASE_KEY)

		await vi.advanceTimersByTimeAsync(0)

		expect(vi.getTimerCount()).toBeGreaterThan(0)
	})
})
