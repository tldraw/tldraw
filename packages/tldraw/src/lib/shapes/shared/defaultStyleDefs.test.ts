import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	clearPatternImageUrlCacheForTests,
	getOrCreatePatternImageUrl,
	PATTERN_IMAGE_CACHE_MAX,
} from './defaultStyleDefs'

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('getOrCreatePatternImageUrl cache', () => {
	beforeEach(() => {
		clearPatternImageUrlCacheForTests()
		// jsdom may not implement createObjectURL; stub it so the cache can resolve.
		;(URL as any).createObjectURL = vi.fn(() => 'blob:mock')
	})

	const makeGenerator = () => vi.fn(() => Promise.resolve(new Blob()))

	it('generates each (dpr, zoom, solid) tile at most once', async () => {
		const generate = makeGenerator()
		await getOrCreatePatternImageUrl(2, 4, '#ffffff', generate)
		await getOrCreatePatternImageUrl(2, 4, '#ffffff', generate)
		expect(generate).toHaveBeenCalledTimes(1)
	})

	it('returns the same promise for a repeated key', () => {
		const generate = makeGenerator()
		const first = getOrCreatePatternImageUrl(2, 4, '#ffffff', generate)
		const second = getOrCreatePatternImageUrl(2, 4, '#ffffff', generate)
		expect(second).toBe(first)
	})

	it('generates separately for different solid colors (theme correctness)', async () => {
		const generate = makeGenerator()
		await getOrCreatePatternImageUrl(2, 4, '#ffffff', generate)
		await getOrCreatePatternImageUrl(2, 4, '#000000', generate)
		expect(generate).toHaveBeenCalledTimes(2)
	})

	it('generates separately for different dpr and zoom', async () => {
		const generate = makeGenerator()
		await getOrCreatePatternImageUrl(1, 4, '#ffffff', generate)
		await getOrCreatePatternImageUrl(2, 4, '#ffffff', generate)
		await getOrCreatePatternImageUrl(2, 8, '#ffffff', generate)
		expect(generate).toHaveBeenCalledTimes(3)
	})

	it('does not cache a failed generation, so a later request retries', async () => {
		const generate = vi
			.fn()
			.mockReturnValueOnce(Promise.reject(new Error('boom')))
			.mockReturnValue(Promise.resolve(new Blob()))

		await expect(getOrCreatePatternImageUrl(2, 4, '#ffffff', generate)).rejects.toThrow('boom')
		// the rejected entry is evicted, so the next request regenerates rather than
		// returning the cached rejection
		await getOrCreatePatternImageUrl(2, 4, '#ffffff', generate)
		expect(generate).toHaveBeenCalledTimes(2)
	})

	it('evicts least-recently-used tiles past the cap and revokes their URLs', async () => {
		const revoke = vi.fn()
		;(URL as any).revokeObjectURL = revoke
		const generate = makeGenerator()

		// Fill one past the cap with distinct solid colors (simulating runtime theme churn).
		for (let i = 0; i <= PATTERN_IMAGE_CACHE_MAX; i++) {
			await getOrCreatePatternImageUrl(2, 4, `#color${i}`, generate)
		}
		await flushMicrotasks()

		// The oldest entry was evicted and its object URL revoked to free the blob.
		expect(revoke).toHaveBeenCalledTimes(1)

		// Requesting the evicted (oldest) color regenerates rather than hitting the cache.
		generate.mockClear()
		await getOrCreatePatternImageUrl(2, 4, '#color0', generate)
		expect(generate).toHaveBeenCalledTimes(1)
	})

	it('keeps recently-used tiles in the cache when evicting under churn', async () => {
		;(URL as any).revokeObjectURL = vi.fn()
		const generate = makeGenerator()

		// Insert color0 first, then keep using it while churning through new colors.
		await getOrCreatePatternImageUrl(2, 4, '#color0', generate)
		for (let i = 1; i <= PATTERN_IMAGE_CACHE_MAX; i++) {
			await getOrCreatePatternImageUrl(2, 4, `#color${i}`, generate)
			await getOrCreatePatternImageUrl(2, 4, '#color0', generate) // touch it to keep it fresh
		}
		await flushMicrotasks()

		// color0 stays cached because it was recently used; the next request reuses it.
		generate.mockClear()
		await getOrCreatePatternImageUrl(2, 4, '#color0', generate)
		expect(generate).not.toHaveBeenCalled()
	})
})
