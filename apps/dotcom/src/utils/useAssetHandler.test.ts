import { TLAsset } from 'tldraw'
import { useAssetHandler } from './useAssetHandler'

describe('useAssetHandler', () => {
	const { handleAsset } = useAssetHandler()

	it('should return an empty string if the asset is null', () => {
		expect(handleAsset(null, { zoom: 1, dpr: 1, networkEffectiveType: '4g' })).toBe('')
	})

	it('should return an empty string if the asset is undefined', () => {
		expect(handleAsset(undefined, { zoom: 1, dpr: 1, networkEffectiveType: '4g' })).toBe('')
	})

	it('should return an empty string if the asset has no src', () => {
		const asset = { type: 'image', props: { w: 100 } }
		expect(handleAsset(asset as TLAsset, { zoom: 1, dpr: 1, networkEffectiveType: '4g' })).toBe('')
	})

	it('should return the original src for video types', () => {
		const asset = { type: 'video', props: { src: 'http://example.com/video.mp4' } }
		expect(handleAsset(asset as TLAsset, { zoom: 1, dpr: 1, networkEffectiveType: '4g' })).toBe(
			'http://example.com/video.mp4'
		)
	})

	it('should return the original src if it does not start with http or https', () => {
		const asset = { type: 'image', props: { src: 'data:somedata', w: 100 } }
		expect(handleAsset(asset as TLAsset, { zoom: 1, dpr: 1, networkEffectiveType: '4g' })).toBe(
			'data:somedata'
		)
	})

	it("should return an empty string if the asset type is not 'image'", () => {
		const asset = { type: 'document', props: { src: 'http://example.com/doc.pdf', w: 100 } }
		expect(handleAsset(asset as TLAsset, { zoom: 1, dpr: 1, networkEffectiveType: '4g' })).toBe('')
	})

	it('should handle if network compensation is not available and zoom correctly', () => {
		const asset = { type: 'image', props: { src: 'http://example.com/image.jpg', w: 100 } }
		expect(handleAsset(asset as TLAsset, { zoom: 0.5, dpr: 2, networkEffectiveType: null })).toBe(
			'https://localhost:8788/cdn-cgi/image/width=50,dpr=2,fit=scale-down,quality=92/http://example.com/image.jpg'
		)
	})

	it('should handle network compensation and zoom correctly', () => {
		const asset = { type: 'image', props: { src: 'http://example.com/image.jpg', w: 100 } }
		expect(handleAsset(asset as TLAsset, { zoom: 0.5, dpr: 2, networkEffectiveType: '3g' })).toBe(
			'https://localhost:8788/cdn-cgi/image/width=25,dpr=2,fit=scale-down,quality=92/http://example.com/image.jpg'
		)
	})

	it('should round zoom to the nearest 0.25 and apply network compensation', () => {
		const asset = { type: 'image', props: { src: 'https://example.com/image.jpg', w: 100 } }
		expect(handleAsset(asset as TLAsset, { zoom: 0.33, dpr: 1, networkEffectiveType: '2g' })).toBe(
			'https://localhost:8788/cdn-cgi/image/width=13,dpr=1,fit=scale-down,quality=92/https://example.com/image.jpg'
		)
	})

	it('should set zoom to a minimum of 0.25 if zoom is below 0.25', () => {
		const asset = { type: 'image', props: { src: 'https://example.com/image.jpg', w: 100 } }
		expect(handleAsset(asset as TLAsset, { zoom: 0.1, dpr: 1, networkEffectiveType: '4g' })).toBe(
			'https://localhost:8788/cdn-cgi/image/width=25,dpr=1,fit=scale-down,quality=92/https://example.com/image.jpg'
		)
	})
})
