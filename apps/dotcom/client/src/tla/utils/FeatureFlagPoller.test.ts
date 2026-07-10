import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FeatureFlags } from './FeatureFlagPoller'

const mockFetch = vi.fn()
vi.mock('tldraw', () => {
	return {
		fetch: (...args: any[]) => mockFetch(...args),
	}
})

function makeFlags(overrides: Partial<FeatureFlags> = {}): FeatureFlags {
	return {
		rum_enabled: { enabled: false },
		...overrides,
	}
}

function mockFetchResponse(flags: FeatureFlags, authenticated = true) {
	mockFetch.mockResolvedValueOnce({
		ok: true,
		headers: { get: (h: string) => (h === 'x-authenticated' ? (authenticated ? '1' : '0') : null) },
		json: async () => flags,
	})
}

describe('fetchFeatureFlags', () => {
	let fetchFeatureFlags: typeof import('./FeatureFlagPoller').fetchFeatureFlags
	let wasAuthenticated: typeof import('./FeatureFlagPoller').wasAuthenticated

	beforeEach(async () => {
		vi.resetModules()
		mockFetch.mockReset()
		// Module-level fetchFeatureFlags() fires on import. Use an unauthenticated
		// response so the promise cache is cleared and each test starts fresh.
		// Two responses needed: one for the module-level call, one for the explicit await
		// (the unauthenticated response clears the cache, so the second call refetches).
		mockFetchResponse(makeFlags(), false)
		mockFetchResponse(makeFlags(), false)
		const mod = await import('./FeatureFlagPoller')
		fetchFeatureFlags = mod.fetchFeatureFlags
		wasAuthenticated = mod.wasAuthenticated
		await mod.fetchFeatureFlags()
		mockFetch.mockClear()
	})

	it('deduplicates concurrent calls when authenticated', async () => {
		mockFetchResponse(makeFlags(), true)
		const p1 = fetchFeatureFlags()
		const p2 = fetchFeatureFlags()
		const [r1, r2] = await Promise.all([p1, p2])

		expect(r1).toBe(r2)
		expect(mockFetch).toHaveBeenCalledTimes(1)
	})

	it('clears cache when response is unauthenticated', async () => {
		mockFetchResponse(makeFlags(), false)
		await fetchFeatureFlags()
		expect(wasAuthenticated()).toBe(false)

		// Cache should be cleared, so next call triggers a new fetch
		mockFetchResponse(makeFlags(), true)
		await fetchFeatureFlags()
		expect(wasAuthenticated()).toBe(true)
		expect(mockFetch).toHaveBeenCalledTimes(2)
	})

	it('sets wasAuthenticated based on x-authenticated header', async () => {
		mockFetchResponse(makeFlags(), true)
		await fetchFeatureFlags()
		expect(wasAuthenticated()).toBe(true)
	})

	it('returns default flags on fetch error', async () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
		mockFetch.mockRejectedValueOnce(new Error('network down'))
		const flags = await fetchFeatureFlags()
		expect(flags.rum_enabled.enabled).toBe(false)
		expect(wasAuthenticated()).toBe(false)
		spy.mockRestore()
	})

	it('returns default flags on non-ok response', async () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
		mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
		const flags = await fetchFeatureFlags()
		expect(flags.rum_enabled.enabled).toBe(false)
		spy.mockRestore()
	})
})
