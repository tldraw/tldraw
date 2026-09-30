import { TLAsset } from 'tldraw'
import { multiplayerAssetStore } from './multiplayerAssetStore'

const resolver = multiplayerAssetStore().resolve
const FILE_SIZE = 1024 * 1024 * 2

describe('multiplayerAssetStore.resolve', () => {
	it('should return null if the asset has no src', async () => {
		const asset = { type: 'image', props: { w: 100, fileSize: FILE_SIZE } }
		expect(
			await resolver(asset as TLAsset, {
				screenScale: -1,
				steppedScreenScale: 1,
				dpr: 1,
				networkEffectiveType: '4g',
				shouldResolveToOriginal: false,
			})
		).toBe(null)
	})

	it('should return the original src for video types', async () => {
		const asset = {
			type: 'video',
			props: { src: 'http://assets.tldraw.dev/video.mp4', fileSize: FILE_SIZE },
		}
		expect(
			await resolver(asset as TLAsset, {
				screenScale: -1,
				steppedScreenScale: 1,
				dpr: 1,
				networkEffectiveType: '4g',
				shouldResolveToOriginal: false,
			})
		).toBe('http://assets.tldraw.dev/video.mp4')
	})

	it('should return the original src for non-tldraw assets', async () => {
		const asset = {
			type: 'video',
			props: { src: 'http://assets.not-tldraw.dev/video.mp4', fileSize: FILE_SIZE },
		}
		expect(
			await resolver(asset as TLAsset, {
				screenScale: -1,
				steppedScreenScale: 1,
				dpr: 1,
				networkEffectiveType: '4g',
				shouldResolveToOriginal: false,
			})
		).toBe('http://assets.not-tldraw.dev/video.mp4')
	})

	it('should return a transformed URL for images at natural size', async () => {
		const asset = {
			type: 'image',
			props: { src: 'http://assets.tldraw.dev/image.jpg', w: 100, fileSize: 1000 },
		}
		expect(
			await resolver(asset as TLAsset, {
				screenScale: -1,
				steppedScreenScale: 1,
				dpr: 1,
				networkEffectiveType: '4g',
				shouldResolveToOriginal: false,
			})
		).toBe('https://tldrawusercontent.com/cdn-cgi/image/format=auto/image.jpg')
	})

	it.each([300 * 1024, FILE_SIZE, undefined])(
		'should resize a large image at a small display size with fileSize %s',
		async (fileSize) => {
			const asset = {
				type: 'image',
				props: {
					src: 'https://assets.tldraw.dev/image.png',
					w: 2500,
					h: 1800,
					mimeType: 'image/png',
					fileSize,
				},
			}
			expect(
				await resolver(asset as TLAsset, {
					screenScale: 0.125,
					steppedScreenScale: 0.125,
					dpr: 2,
					networkEffectiveType: '4g',
					shouldResolveToOriginal: false,
				})
			).toBe('https://tldrawusercontent.com/cdn-cgi/image/w=625,format=auto/image.png')
		}
	)

	it.each([
		{ scale: 0.5, dpr: 1, pixelRatio: 1, expected: 'w=1000,format=auto' },
		{ scale: 0.5, dpr: 2, pixelRatio: 1, expected: 'format=auto' },
		{ scale: 0.5, dpr: 1, pixelRatio: 2, expected: 'w=2000,format=auto' },
		{ scale: 0.749, dpr: 1, pixelRatio: 1, expected: 'w=1498,format=auto' },
		{ scale: 0.75, dpr: 1, pixelRatio: 1, expected: 'format=auto' },
		{ scale: 0.9, dpr: 1, pixelRatio: 1, expected: 'format=auto' },
	])(
		'should choose image dimensions for $scale scale, $dpr DPR and $pixelRatio pixel ratio',
		async ({ scale, dpr, pixelRatio, expected }) => {
			const asset = {
				type: 'image',
				props: {
					src: 'https://assets.tldraw.dev/image.png',
					w: 2000,
					h: 1500,
					mimeType: 'image/png',
					pixelRatio,
					fileSize: 1000,
				},
			}
			expect(
				await resolver(asset as TLAsset, {
					screenScale: scale,
					steppedScreenScale: scale,
					dpr,
					networkEffectiveType: '4g',
					shouldResolveToOriginal: false,
				})
			).toBe(`https://tldrawusercontent.com/cdn-cgi/image/${expected}/image.png`)
		}
	)

	it.each([
		{ mimeType: 'image/png', w: 399, h: 400, pixelRatio: 1, expected: 'format=auto' },
		{ mimeType: 'image/png', w: 400, h: 399, pixelRatio: 1, expected: 'format=auto' },
		{ mimeType: 'image/png', w: 400, h: 400, pixelRatio: 1, expected: 'w=200,format=auto' },
		{ mimeType: 'image/png', w: 200, h: 200, pixelRatio: 2, expected: 'w=200,format=auto' },
		{ mimeType: 'image/jpeg', w: 2000, h: 1500, pixelRatio: 1, expected: 'format=auto' },
		{ mimeType: 'image/webp', w: 2000, h: 1500, pixelRatio: 1, expected: 'format=auto' },
		{ mimeType: undefined, w: 2000, h: 1500, pixelRatio: 1, expected: 'format=auto' },
	])(
		'should apply the PNG size limit to $mimeType at $w × $h and pixel ratio $pixelRatio',
		async ({ mimeType, w, h, pixelRatio, expected }) => {
			const asset = {
				type: 'image',
				props: {
					src: 'https://assets.tldraw.dev/image',
					mimeType,
					w,
					h,
					pixelRatio,
					fileSize: FILE_SIZE,
				},
			}
			expect(
				await resolver(asset as TLAsset, {
					screenScale: 0.5,
					steppedScreenScale: 0.5,
					dpr: 1,
					networkEffectiveType: '4g',
					shouldResolveToOriginal: false,
				})
			).toBe(`https://tldrawusercontent.com/cdn-cgi/image/${expected}/image`)
		}
	)

	it('should return the original src for if original is asked for', async () => {
		const asset = { type: 'image', props: { src: 'http://assets.tldraw.dev/image.jpg', w: 100 } }
		expect(
			await resolver(asset as TLAsset, {
				screenScale: -1,
				steppedScreenScale: 1,
				dpr: 1,
				networkEffectiveType: '4g',
				shouldResolveToOriginal: true,
			})
		).toBe('http://assets.tldraw.dev/image.jpg')
	})

	it('should return the original src if it does not start with http or https', async () => {
		const asset = { type: 'image', props: { src: 'data:somedata', w: 100, fileSize: FILE_SIZE } }
		expect(
			await resolver(asset as TLAsset, {
				screenScale: -1,
				steppedScreenScale: 1,
				dpr: 1,
				networkEffectiveType: '4g',
				shouldResolveToOriginal: false,
			})
		).toBe('data:somedata')
	})

	it.each(['image/gif', 'image/avif', 'image/png'])(
		'should return the original src for animated %s images',
		async (mimeType) => {
			const asset = {
				type: 'image',
				props: {
					src: 'http://assets.tldraw.dev/animated.gif',
					mimeType,
					isAnimated: true,
					w: 2000,
					h: 1500,
					fileSize: FILE_SIZE,
				},
			}
			expect(
				await resolver(asset as TLAsset, {
					screenScale: -1,
					steppedScreenScale: 1,
					dpr: 1,
					networkEffectiveType: '4g',
					shouldResolveToOriginal: false,
				})
			).toBe('http://assets.tldraw.dev/animated.gif')
		}
	)

	it('should serve vector images directly without cdn-cgi transformation', async () => {
		const asset = {
			type: 'image',
			props: {
				src: 'http://assets.tldraw.dev/vector.svg',
				mimeType: 'image/svg+xml',
				w: 2000,
				h: 1500,
				fileSize: FILE_SIZE,
			},
		}
		expect(
			await resolver(asset as TLAsset, {
				screenScale: -1,
				steppedScreenScale: 1,
				dpr: 1,
				networkEffectiveType: '4g',
				shouldResolveToOriginal: false,
			})
		).toBe('https://tldrawusercontent.com/vector.svg')
	})

	it("should return null if the asset type is not 'image'", async () => {
		const asset = {
			type: 'document',
			props: { src: 'http://assets.tldraw.dev/doc.pdf', w: 100, fileSize: FILE_SIZE },
		}
		expect(
			await resolver(asset as TLAsset, {
				screenScale: -1,
				steppedScreenScale: 1,
				dpr: 1,
				networkEffectiveType: '4g',
				shouldResolveToOriginal: false,
			})
		).toBe(null)
	})

	it('should handle if network compensation is not available and zoom correctly', async () => {
		const asset = {
			type: 'image',
			props: {
				src: 'http://assets.tldraw.dev/image.png',
				w: 1000,
				h: 800,
				mimeType: 'image/png',
				fileSize: FILE_SIZE,
			},
		}
		expect(
			await resolver(asset as TLAsset, {
				screenScale: -1,
				steppedScreenScale: 0.5,
				dpr: 2,
				networkEffectiveType: null,
				shouldResolveToOriginal: false,
			})
		).toBe('https://tldrawusercontent.com/cdn-cgi/image/format=auto/image.png')
	})

	it('should handle network compensation and zoom correctly', async () => {
		const asset = {
			type: 'image',
			props: {
				src: 'http://assets.tldraw.dev/image.png',
				w: 1000,
				h: 800,
				mimeType: 'image/png',
				fileSize: FILE_SIZE,
			},
		}
		expect(
			await resolver(asset as TLAsset, {
				screenScale: -1,
				steppedScreenScale: 0.5,
				dpr: 2,
				networkEffectiveType: '3g',
				shouldResolveToOriginal: false,
			})
		).toBe('https://tldrawusercontent.com/cdn-cgi/image/w=500,format=auto/image.png')
	})

	it('should not scale image above natural size', async () => {
		const asset = {
			type: 'image',
			props: {
				src: 'https://assets.tldraw.dev/image.png',
				w: 1000,
				h: 800,
				mimeType: 'image/png',
				fileSize: FILE_SIZE,
			},
		}
		expect(
			await resolver(asset as TLAsset, {
				screenScale: -1,
				steppedScreenScale: 5,
				dpr: 1,
				networkEffectiveType: '4g',
				shouldResolveToOriginal: false,
			})
		).toBe('https://tldrawusercontent.com/cdn-cgi/image/format=auto/image.png')
	})
})
