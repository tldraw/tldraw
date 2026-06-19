import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearPatternImageUrlCacheForTests, getOrCreatePatternImageUrl } from './defaultStyleDefs'

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
})
