import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FeatureFlags } from './FeatureFlagPoller'

const mockFetch = vi.fn()
vi.mock('tldraw', () => {
	return { fetch: (...args: any[]) => mockFetch(...args) }
})

function makeFlags(overrides: Partial<FeatureFlags> = {}): FeatureFlags {
	return {
		zero_enabled: { enabled: false },
		zero_kill_switch: { enabled: false },
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

describe('shouldReloadForFlagChange', () => {
	let shouldReloadForFlagChange: typeof import('./FeatureFlagPoller').shouldReloadForFlagChange

	beforeAll(async () => {
		mockFetch.mockReset()
		mockFetchResponse(makeFlags())
		const mod = await import('./FeatureFlagPoller')
		shouldReloadForFlagChange = mod.shouldReloadForFlagChange
	})

	describe('zero_kill_switch transitions', () => {
		it('reloads when kill switch goes false → true', () => {
			const prev = makeFlags({ zero_kill_switch: { enabled: false } })
			const next = makeFlags({ zero_kill_switch: { enabled: true } })
			expect(shouldReloadForFlagChange(prev, next)).toBe(true)
		})

		it('reloads when kill switch goes undefined → true', () => {
			const prev = makeFlags()
			delete (prev as any).zero_kill_switch
			const next = makeFlags({ zero_kill_switch: { enabled: true } })
			expect(shouldReloadForFlagChange(prev, next)).toBe(true)
		})

		it('does NOT reload when kill switch stays true → true', () => {
			const prev = makeFlags({ zero_kill_switch: { enabled: true } })
			const next = makeFlags({ zero_kill_switch: { enabled: true } })
			expect(shouldReloadForFlagChange(prev, next)).toBe(false)
		})

		it('does NOT reload when kill switch goes true → false', () => {
			const prev = makeFlags({ zero_kill_switch: { enabled: true } })
			const next = makeFlags({ zero_kill_switch: { enabled: false } })
			expect(shouldReloadForFlagChange(prev, next)).toBe(false)
		})

		it('does NOT reload when kill switch stays false → false', () => {
			const prev = makeFlags({ zero_kill_switch: { enabled: false } })
			const next = makeFlags({ zero_kill_switch: { enabled: false } })
			expect(shouldReloadForFlagChange(prev, next)).toBe(false)
		})
	})

	describe('zero_enabled transitions never reload', () => {
		it('does NOT reload when zero_enabled goes false → true', () => {
			const prev = makeFlags({ zero_enabled: { enabled: false } })
			const next = makeFlags({ zero_enabled: { enabled: true } })
			expect(shouldReloadForFlagChange(prev, next)).toBe(false)
		})

		it('does NOT reload when zero_enabled goes true → false', () => {
			const prev = makeFlags({ zero_enabled: { enabled: true } })
			const next = makeFlags({ zero_enabled: { enabled: false } })
			expect(shouldReloadForFlagChange(prev, next)).toBe(false)
		})
	})

	describe('combined transitions', () => {
		it('reloads when kill switch activates even if zero_enabled also changes', () => {
			const prev = makeFlags({
				zero_kill_switch: { enabled: false },
				zero_enabled: { enabled: true },
			})
			const next = makeFlags({
				zero_kill_switch: { enabled: true },
				zero_enabled: { enabled: false },
			})
			expect(shouldReloadForFlagChange(prev, next)).toBe(true)
		})

		it('does NOT reload when only zero_enabled changes and kill switch stays off', () => {
			const prev = makeFlags({
				zero_kill_switch: { enabled: false },
				zero_enabled: { enabled: false },
			})
			const next = makeFlags({
				zero_kill_switch: { enabled: false },
				zero_enabled: { enabled: true },
			})
			expect(shouldReloadForFlagChange(prev, next)).toBe(false)
		})
	})
})

describe('fetchFeatureFlags', () => {
	let fetchFeatureFlags: typeof import('./FeatureFlagPoller').fetchFeatureFlags
	let wasAuthenticated: typeof import('./FeatureFlagPoller').wasAuthenticated

	beforeEach(async () => {
		vi.resetModules()
		mockFetch.mockReset()
		// Module-level fetchFeatureFlags() fires on import. Use an unauthenticated
		// response so the promise cache is cleared and each test starts fresh.
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
		mockFetch.mockRejectedValueOnce(new Error('network down'))
		const flags = await fetchFeatureFlags()
		expect(flags.zero_kill_switch.enabled).toBe(false)
		expect(flags.zero_enabled.enabled).toBe(false)
		expect(wasAuthenticated()).toBe(false)
	})

	it('returns default flags on non-ok response', async () => {
		mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
		const flags = await fetchFeatureFlags()
		expect(flags.zero_kill_switch.enabled).toBe(false)
		expect(flags.zero_enabled.enabled).toBe(false)
	})
})
