import { getThumbnailContext } from './thumbnail-context'

const base = { colorMode: 'dark' as const, dpr: 1, networkEffectiveType: '4g' }

describe('getThumbnailContext', () => {
	it('rounds the tile width up to a power of two', () => {
		expect(
			[63, 64, 102, 128, 129].map((tileWidth) => getThumbnailContext({ ...base, tileWidth }).width)
		).toEqual([64, 64, 128, 128, 256])
	})

	it('caps the pixel ratio at 2', () => {
		expect(
			[1, 1.5, 2, 3].map((dpr) => getThumbnailContext({ ...base, tileWidth: 100, dpr }).dpr)
		).toEqual([1, 1.5, 2, 2])
	})

	it('passes the colour mode and network through', () => {
		expect(getThumbnailContext({ ...base, tileWidth: 102, networkEffectiveType: null })).toEqual({
			colorMode: 'dark',
			width: 128,
			dpr: 1,
			networkEffectiveType: null,
		})
	})
})
