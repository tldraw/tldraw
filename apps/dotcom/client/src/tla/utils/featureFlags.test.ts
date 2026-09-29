import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FeatureFlags } from './featureFlags'

const mockFetch = vi.fn()
vi.mock('tldraw', () => {
	return {
		fetch: (...args: any[]) => mockFetch(...args),
	}
})

function makeFlags(overrides: Partial<FeatureFlags> = {}): FeatureFlags {
	return {
		rum_enabled: { enabled: false },
		load_rum: { enabled: false },
		mcp_server_access: { enabled: false },
		version_chain: { enabled: false },
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

/** Imports a fresh module, whose page-load fetch gets `pageLoad` as its response. */
async function load(pageLoad: () => void) {
	vi.resetModules()
	mockFetch.mockReset()
	pageLoad()
	const mod = await import('./featureFlags')
	await mod.getFeatureFlags()
	return mod
}

describe('feature flags', () => {
	let errorSpy: ReturnType<typeof vi.spyOn>

	beforeEach(() => {
		errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
	})

	afterEach(() => {
		errorSpy.mockRestore()
		vi.useRealTimers()
	})

	it('fetches once on page load and never polls', async () => {
		vi.useFakeTimers()
		const mod = await load(() => mockFetchResponse(makeFlags({ rum_enabled: { enabled: true } })))

		await vi.advanceTimersByTimeAsync(10 * 60_000)

		expect(mockFetch).toHaveBeenCalledTimes(1)
		expect(mod.getCurrentFlags().rum_enabled.enabled).toBe(true)
		expect(mod.hasResolvedFlagsOnce()).toBe(true)
	})

	it('getFeatureFlags does not refetch for a signed-out page', async () => {
		const mod = await load(() => mockFetchResponse(makeFlags(), false))

		await mod.getFeatureFlags()
		await mod.getFeatureFlags()

		expect(mockFetch).toHaveBeenCalledTimes(1)
	})

	it('fetchFeatureFlags reuses an authenticated page-load response', async () => {
		const mod = await load(() => mockFetchResponse(makeFlags(), true))

		await mod.fetchFeatureFlags()

		expect(mockFetch).toHaveBeenCalledTimes(1)
		expect(mod.wasAuthenticated()).toBe(true)
	})

	it('fetchFeatureFlags refetches once after an unauthenticated response, shared by concurrent callers', async () => {
		const mod = await load(() => mockFetchResponse(makeFlags(), false))
		expect(mod.wasAuthenticated()).toBe(false)

		mockFetchResponse(makeFlags({ load_rum: { enabled: true } }), true)
		const [a, b] = await Promise.all([mod.fetchFeatureFlags(), mod.fetchFeatureFlags()])

		expect(a).toBe(b)
		expect(a.load_rum.enabled).toBe(true)
		expect(mockFetch).toHaveBeenCalledTimes(2)
		expect(mod.wasAuthenticated()).toBe(true)
		expect(await mod.getFeatureFlags()).toBe(a)
	})

	it('falls back to defaults on a network error, and fetchFeatureFlags retries', async () => {
		const mod = await load(() => mockFetch.mockRejectedValueOnce(new Error('network down')))

		expect(mod.getCurrentFlags()).toEqual(mod.DEFAULT_FLAGS)
		expect(mod.wasAuthenticated()).toBe(false)
		expect(mod.hasResolvedFlagsOnce()).toBe(true)

		mockFetchResponse(makeFlags({ rum_enabled: { enabled: true } }), true)
		const flags = await mod.fetchFeatureFlags()

		expect(flags.rum_enabled.enabled).toBe(true)
		expect(mockFetch).toHaveBeenCalledTimes(2)
	})

	it('falls back to defaults on a non-ok response', async () => {
		const mod = await load(() => mockFetch.mockResolvedValueOnce({ ok: false, status: 500 }))

		expect(mod.getCurrentFlags()).toEqual(mod.DEFAULT_FLAGS)
		expect(mod.wasAuthenticated()).toBe(false)
	})
})
