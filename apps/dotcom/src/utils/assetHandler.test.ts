import { TLAsset } from 'tldraw'
import { resolveAsset } from './assetHandler'

const PERSISTENCE_KEY = 'tldraw'
const resolver = resolveAsset(PERSISTENCE_KEY)

describe('resolveAsset', () => {
	it('should return null if the asset is null', async () => {
		expect(
			await resolver(null, { rawZoom: -1, steppedZoom: 1, dpr: 1, networkEffectiveType: '4g' })
		).toBe(null)
	})

	it('should return null if the asset is undefined', async () => {
		expect(
			await resolver(undefined, {
				rawZoom: -1,
				steppedZoom: 1,
				dpr: 1,
				networkEffectiveType: '4g',
			})
		).toBe(null)
	})

	it('should return null if the asset has no src', async () => {
		const asset = { type: 'image', props: { w: 100 } }
		expect(
			await resolver(asset as TLAsset, {
				rawZoom: -1,
				steppedZoom: 1,
				dpr: 1,
				networkEffectiveType: '4g',
			})
		).toBe(null)
	})

	it('should return the original src for video types', async () => {
		const asset = { type: 'video', props: { src: 'http://example.com/video.mp4' } }
		expect(
			await resolver(asset as TLAsset, {
				rawZoom: -1,
				steppedZoom: 1,
				dpr: 1,
				networkEffectiveType: '4g',
			})
		).toBe('http://example.com/video.mp4')
	})

	it('should return the original src for if original is asked for', async () => {
		const asset = { type: 'image', props: { src: 'http://example.com/image.jpg', w: 100 } }
		expect(
			await resolver(asset as TLAsset, {
				rawZoom: -1,
				steppedZoom: 1,
				dpr: 1,
				networkEffectiveType: '4g',
			})
		).toBe('http://example.com/video.mp4')
	})

	it('should return the original src if it does not start with http or https', async () => {
		const asset = { type: 'image', props: { src: 'data:somedata', w: 100 } }
		expect(
			await resolver(asset as TLAsset, {
				rawZoom: -1,
				steppedZoom: 1,
				dpr: 1,
				networkEffectiveType: '4g',
			})
		).toBe('data:somedata')
	})

	it("should return null if the asset type is not 'image'", async () => {
		const asset = { type: 'document', props: { src: 'http://example.com/doc.pdf', w: 100 } }
		expect(
			await resolver(asset as TLAsset, {
				rawZoom: -1,
				steppedZoom: 1,
				dpr: 1,
				networkEffectiveType: '4g',
			})
		).toBe(null)
	})

	it('should handle if network compensation is not available and zoom correctly', async () => {
		const asset = { type: 'image', props: { src: 'http://example.com/image.jpg', w: 100 } }
		expect(
			await resolver(asset as TLAsset, {
				rawZoom: -1,
				steppedZoom: 0.5,
				dpr: 2,
				networkEffectiveType: null,
			})
		).toBe(
			'https://localhost:8788/cdn-cgi/image/width=50,dpr=2,fit=scale-down,quality=92/http://example.com/image.jpg'
		)
	})

	it('should handle network compensation and zoom correctly', async () => {
		const asset = { type: 'image', props: { src: 'http://example.com/image.jpg', w: 100 } }
		expect(
			await resolver(asset as TLAsset, {
				rawZoom: -1,
				steppedZoom: 0.5,
				dpr: 2,
				networkEffectiveType: '3g',
			})
		).toBe(
			'https://localhost:8788/cdn-cgi/image/width=25,dpr=2,fit=scale-down,quality=92/http://example.com/image.jpg'
		)
	})

	it('should round zoom to powers of 2', async () => {
		const asset = { type: 'image', props: { src: 'https://example.com/image.jpg', w: 100 } }
		expect(
			await resolver(asset as TLAsset, {
				rawZoom: -1,
				steppedZoom: 4,
				dpr: 1,
				networkEffectiveType: '4g',
			})
		).toBe(
			'https://localhost:8788/cdn-cgi/image/width=400,dpr=1,fit=scale-down,quality=92/https://example.com/image.jpg'
		)
	})

	it('should round zoom to the nearest 0.25 and apply network compensation', async () => {
		const asset = { type: 'image', props: { src: 'https://example.com/image.jpg', w: 100 } }
		expect(
			await resolver(asset as TLAsset, {
				rawZoom: -1,
				steppedZoom: 0.5,
				dpr: 1,
				networkEffectiveType: '2g',
			})
		).toBe(
			'https://localhost:8788/cdn-cgi/image/width=25,dpr=1,fit=scale-down,quality=92/https://example.com/image.jpg'
		)
	})

	it('should set zoom to a minimum of 0.25 if zoom is below 0.25', async () => {
		const asset = { type: 'image', props: { src: 'https://example.com/image.jpg', w: 100 } }
		expect(
			await resolver(asset as TLAsset, {
				rawZoom: -1,
				steppedZoom: 0.25,
				dpr: 1,
				networkEffectiveType: '4g',
			})
		).toBe(
			'https://localhost:8788/cdn-cgi/image/width=25,dpr=1,fit=scale-down,quality=92/https://example.com/image.jpg'
		)
	})
})
