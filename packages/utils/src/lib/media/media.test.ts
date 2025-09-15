import { beforeEach, describe, expect, it, vi } from 'vitest'
import { promiseWithResolve } from '../control'
import { Image } from '../network'
import { isApngAnimated } from './apng'
import { isAvifAnimated } from './avif'
import { isGifAnimated } from './gif'
import {
	DEFAULT_SUPPORTED_ANIMATED_IMAGE_TYPES,
	DEFAULT_SUPPORTED_IMAGE_TYPES,
	DEFAULT_SUPPORTED_MEDIA_TYPES,
	DEFAULT_SUPPORTED_MEDIA_TYPE_LIST,
	DEFAULT_SUPPORTED_STATIC_IMAGE_TYPES,
	DEFAULT_SUPPORTED_VECTOR_IMAGE_TYPES,
	DEFAULT_SUPPORT_VIDEO_TYPES,
	MediaHelpers,
} from './media'
import { PngHelpers } from './png'
import { isWebpAnimated } from './webp'

// Mock the imported functions
vi.mock('../control')
vi.mock('../network')
vi.mock('./apng')
vi.mock('./avif')
vi.mock('./gif')
vi.mock('./png')
vi.mock('./webp')

// Mock global DOM APIs
Object.defineProperty(global, 'document', {
	value: {
		createElement: vi.fn(),
		body: {
			appendChild: vi.fn(),
			removeChild: vi.fn(),
		},
	},
	writable: true,
})

Object.defineProperty(global, 'URL', {
	value: {
		createObjectURL: vi.fn(),
		revokeObjectURL: vi.fn(),
	},
	writable: true,
})

describe('Media Constants', () => {
	describe('DEFAULT_SUPPORTED_VECTOR_IMAGE_TYPES', () => {
		it('should contain only svg+xml type', () => {
			expect(DEFAULT_SUPPORTED_VECTOR_IMAGE_TYPES).toEqual(['image/svg+xml'])
		})

		it('should be frozen', () => {
			expect(Object.isFrozen(DEFAULT_SUPPORTED_VECTOR_IMAGE_TYPES)).toBe(true)
		})
	})

	describe('DEFAULT_SUPPORTED_STATIC_IMAGE_TYPES', () => {
		it('should contain jpeg, png, and webp types', () => {
			expect(DEFAULT_SUPPORTED_STATIC_IMAGE_TYPES).toEqual([
				'image/jpeg',
				'image/png',
				'image/webp',
			])
		})

		it('should be frozen', () => {
			expect(Object.isFrozen(DEFAULT_SUPPORTED_STATIC_IMAGE_TYPES)).toBe(true)
		})
	})

	describe('DEFAULT_SUPPORTED_ANIMATED_IMAGE_TYPES', () => {
		it('should contain gif, apng, and avif types', () => {
			expect(DEFAULT_SUPPORTED_ANIMATED_IMAGE_TYPES).toEqual([
				'image/gif',
				'image/apng',
				'image/avif',
			])
		})

		it('should be frozen', () => {
			expect(Object.isFrozen(DEFAULT_SUPPORTED_ANIMATED_IMAGE_TYPES)).toBe(true)
		})
	})

	describe('DEFAULT_SUPPORTED_IMAGE_TYPES', () => {
		it('should combine static, vector, and animated types', () => {
			const expected = [
				...DEFAULT_SUPPORTED_STATIC_IMAGE_TYPES,
				...DEFAULT_SUPPORTED_VECTOR_IMAGE_TYPES,
				...DEFAULT_SUPPORTED_ANIMATED_IMAGE_TYPES,
			]
			expect(DEFAULT_SUPPORTED_IMAGE_TYPES).toEqual(expected)
		})

		it('should be frozen', () => {
			expect(Object.isFrozen(DEFAULT_SUPPORTED_IMAGE_TYPES)).toBe(true)
		})
	})

	describe('DEFAULT_SUPPORT_VIDEO_TYPES', () => {
		it('should contain mp4, webm, and quicktime types', () => {
			expect(DEFAULT_SUPPORT_VIDEO_TYPES).toEqual(['video/mp4', 'video/webm', 'video/quicktime'])
		})

		it('should be frozen', () => {
			expect(Object.isFrozen(DEFAULT_SUPPORT_VIDEO_TYPES)).toBe(true)
		})
	})

	describe('DEFAULT_SUPPORTED_MEDIA_TYPES', () => {
		it('should combine image and video types', () => {
			const expected = [...DEFAULT_SUPPORTED_IMAGE_TYPES, ...DEFAULT_SUPPORT_VIDEO_TYPES]
			expect(DEFAULT_SUPPORTED_MEDIA_TYPES).toEqual(expected)
		})

		it('should be frozen', () => {
			expect(Object.isFrozen(DEFAULT_SUPPORTED_MEDIA_TYPES)).toBe(true)
		})
	})

	describe('DEFAULT_SUPPORTED_MEDIA_TYPE_LIST', () => {
		it('should be comma-separated string of all media types', () => {
			const expected = DEFAULT_SUPPORTED_MEDIA_TYPES.join(',')
			expect(DEFAULT_SUPPORTED_MEDIA_TYPE_LIST).toBe(expected)
		})
	})
})

describe('MediaHelpers', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('loadVideo', () => {
		it('should load video successfully', async () => {
			const mockVideo = {
				onloadeddata: null as any,
				onerror: null as any,
				crossOrigin: '',
				src: '',
			}
			vi.mocked(document.createElement).mockReturnValue(mockVideo as any)

			const promise = MediaHelpers.loadVideo('https://example.com/video.mp4')

			// Simulate successful load
			mockVideo.onloadeddata()

			const result = await promise
			expect(result).toBe(mockVideo)
			expect(mockVideo.crossOrigin).toBe('anonymous')
			expect(mockVideo.src).toBe('https://example.com/video.mp4')
		})

		it('should reject on video load error', async () => {
			const mockVideo = {
				onloadeddata: null as any,
				onerror: null as any,
				crossOrigin: '',
				src: '',
			}
			vi.mocked(document.createElement).mockReturnValue(mockVideo as any)

			const promise = MediaHelpers.loadVideo('https://example.com/video.mp4')

			// Simulate error
			const mockError = new Event('error')
			mockVideo.onerror(mockError)

			await expect(promise).rejects.toThrow('Could not load video')
		})
	})

	describe('getVideoFrameAsDataUrl', () => {
		let mockVideo: any
		let mockCanvas: any
		let mockContext: any
		let mockPromise: any

		beforeEach(() => {
			mockVideo = {
				readyState: 0,
				HAVE_METADATA: 1,
				HAVE_CURRENT_DATA: 2,
				currentTime: 0,
				videoWidth: 640,
				videoHeight: 480,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
			}

			mockContext = {
				drawImage: vi.fn(),
			}

			mockCanvas = {
				width: 0,
				height: 0,
				getContext: vi.fn().mockReturnValue(mockContext),
				toDataURL: vi.fn().mockReturnValue('data:image/png;base64,mock'),
			}

			mockPromise = {
				resolve: vi.fn(),
				reject: vi.fn(),
			}

			vi.mocked(document.createElement).mockReturnValue(mockCanvas as any)
			vi.mocked(promiseWithResolve).mockReturnValue(mockPromise as any)
		})

		it('should extract frame from video at specified time', async () => {
			const promise = MediaHelpers.getVideoFrameAsDataUrl(mockVideo, 5.0)

			// Simulate ready state progression
			mockVideo.readyState = mockVideo.HAVE_METADATA
			const metadataHandler = mockVideo.addEventListener.mock.calls.find(
				(call: any) => call[0] === 'loadedmetadata'
			)[1]
			metadataHandler()

			expect(mockVideo.currentTime).toBe(5.0)

			// Simulate having current data
			mockVideo.readyState = mockVideo.HAVE_CURRENT_DATA
			const dataHandler = mockVideo.addEventListener.mock.calls.find(
				(call: any) => call[0] === 'loadeddata'
			)[1]
			dataHandler()

			expect(mockCanvas.width).toBe(640)
			expect(mockCanvas.height).toBe(480)
			expect(mockContext.drawImage).toHaveBeenCalledWith(mockVideo, 0, 0)
			expect(mockPromise.resolve).toHaveBeenCalledWith('data:image/png;base64,mock')
		})

		it('should use default time of 0 when not specified', async () => {
			const promise = MediaHelpers.getVideoFrameAsDataUrl(mockVideo)

			mockVideo.readyState = mockVideo.HAVE_METADATA
			const metadataHandler = mockVideo.addEventListener.mock.calls.find(
				(call: any) => call[0] === 'loadedmetadata'
			)[1]
			metadataHandler()

			expect(mockVideo.currentTime).toBe(0)
		})

		it('should reject when canvas context is not available', async () => {
			mockCanvas.getContext.mockReturnValue(null)

			const promise = MediaHelpers.getVideoFrameAsDataUrl(mockVideo)

			mockVideo.readyState = mockVideo.HAVE_CURRENT_DATA
			const dataHandler = mockVideo.addEventListener.mock.calls.find(
				(call: any) => call[0] === 'loadeddata'
			)[1]

			expect(() => dataHandler()).toThrow('Could not get 2d context')
		})

		it('should handle video errors', async () => {
			const promise = MediaHelpers.getVideoFrameAsDataUrl(mockVideo)

			const errorHandler = mockVideo.addEventListener.mock.calls.find(
				(call: any) => call[0] === 'error'
			)[1]
			errorHandler(new Event('error'))

			expect(mockPromise.reject).toHaveBeenCalledWith(new Error('Could not get video frame'))
		})

		it('should clean up event listeners', async () => {
			// Mock the promise to resolve immediately
			const mockPromiseInstance = {
				resolve: vi.fn(),
				reject: vi.fn(),
			}
			vi.mocked(promiseWithResolve).mockReturnValue(mockPromiseInstance as any)

			// Start the async operation but don't await it immediately
			const promise = MediaHelpers.getVideoFrameAsDataUrl(mockVideo)

			// Trigger the promise resolution
			mockVideo.readyState = mockVideo.HAVE_CURRENT_DATA
			const dataHandler = mockVideo.addEventListener.mock.calls.find(
				(call: any) => call[0] === 'loadeddata'
			)[1]
			dataHandler()

			// Manually resolve the promise to simulate completion
			mockPromiseInstance.resolve('data:image/png;base64,mock')

			try {
				await promise
			} catch {
				// Ignore promise resolution issues, we're testing cleanup
			}

			// Verify all event listeners are removed
			expect(mockVideo.removeEventListener).toHaveBeenCalledWith(
				'loadedmetadata',
				expect.any(Function)
			)
			expect(mockVideo.removeEventListener).toHaveBeenCalledWith('loadeddata', expect.any(Function))
			expect(mockVideo.removeEventListener).toHaveBeenCalledWith('canplay', expect.any(Function))
			expect(mockVideo.removeEventListener).toHaveBeenCalledWith('seeked', expect.any(Function))
			expect(mockVideo.removeEventListener).toHaveBeenCalledWith('error', expect.any(Function))
			expect(mockVideo.removeEventListener).toHaveBeenCalledWith('stalled', expect.any(Function))
		}, 10000)
	})

	describe('getImageAndDimensions', () => {
		it('should load image with natural dimensions', async () => {
			const mockImg = {
				onload: null as any,
				onerror: null as any,
				naturalWidth: 800,
				naturalHeight: 600,
				crossOrigin: '',
				referrerPolicy: '',
				style: {},
				src: '',
			}
			vi.mocked(Image).mockReturnValue(mockImg as any)

			const promise = MediaHelpers.getImageAndDimensions('https://example.com/image.png')

			// Simulate successful load
			mockImg.onload()

			const result = await promise
			expect(result).toEqual({
				w: 800,
				h: 600,
				image: mockImg,
			})
			expect(mockImg.crossOrigin).toBe('anonymous')
			expect(mockImg.referrerPolicy).toBe('strict-origin-when-cross-origin')
			expect(mockImg.src).toBe('https://example.com/image.png')
		})

		it('should use client dimensions when natural dimensions unavailable (SVG)', async () => {
			const mockImg = {
				onload: null as any,
				onerror: null as any,
				naturalWidth: 0,
				naturalHeight: 0,
				clientWidth: 400,
				clientHeight: 300,
				crossOrigin: '',
				referrerPolicy: '',
				style: {},
				src: '',
			}
			vi.mocked(Image).mockReturnValue(mockImg as any)

			const promise = MediaHelpers.getImageAndDimensions('https://example.com/image.svg')

			// Simulate successful load
			mockImg.onload()

			const result = await promise
			expect(result).toEqual({
				w: 400,
				h: 300,
				image: mockImg,
			})
			expect(document.body.appendChild).toHaveBeenCalledWith(mockImg)
			expect(document.body.removeChild).toHaveBeenCalledWith(mockImg)
		})

		it('should reject on image load error', async () => {
			const mockImg = {
				onload: null as any,
				onerror: null as any,
				crossOrigin: '',
				referrerPolicy: '',
				style: {},
				src: '',
			}
			vi.mocked(Image).mockReturnValue(mockImg as any)

			const promise = MediaHelpers.getImageAndDimensions('https://example.com/image.png')

			// Simulate error
			const mockError = new Event('error')
			mockImg.onerror(mockError)

			await expect(promise).rejects.toThrow('Could not load image')
		})
	})

	describe('getVideoSize', () => {
		it('should get video dimensions from blob', async () => {
			const mockBlob = new Blob(['video data'], { type: 'video/mp4' })
			const mockVideo = {
				videoWidth: 1920,
				videoHeight: 1080,
			}

			vi.spyOn(MediaHelpers, 'loadVideo').mockResolvedValue(mockVideo as any)
			vi.mocked(URL.createObjectURL).mockReturnValue('blob:mock-url')
			vi.mocked(URL.revokeObjectURL).mockImplementation(() => {})

			const result = await MediaHelpers.getVideoSize(mockBlob)

			expect(result).toEqual({ w: 1920, h: 1080 })
			expect(MediaHelpers.loadVideo).toHaveBeenCalledWith('blob:mock-url')
		})
	})

	describe('getImageSize', () => {
		it('should get image dimensions from non-PNG blob', async () => {
			const mockBlob = new Blob(['image data'], { type: 'image/jpeg' })
			const mockImg = {
				naturalWidth: 800,
				naturalHeight: 600,
			}

			vi.spyOn(MediaHelpers, 'getImageAndDimensions').mockResolvedValue({
				w: 800,
				h: 600,
				image: mockImg as any,
			})
			vi.mocked(URL.createObjectURL).mockReturnValue('blob:mock-url')
			vi.mocked(URL.revokeObjectURL).mockImplementation(() => {})

			const result = await MediaHelpers.getImageSize(mockBlob)

			expect(result).toEqual({ w: 800, h: 600 })
			expect(MediaHelpers.getImageAndDimensions).toHaveBeenCalledWith('blob:mock-url')
		})

		it('should handle PNG with pHYs chunk and adjust dimensions', async () => {
			const mockBlob = {
				type: 'image/png',
				arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
			} as any

			const mockImg = {
				naturalWidth: 7200,
				naturalHeight: 5400,
			}

			vi.spyOn(MediaHelpers, 'getImageAndDimensions').mockResolvedValue({
				w: 7200,
				h: 5400,
				image: mockImg as any,
			})
			vi.mocked(URL.createObjectURL).mockReturnValue('blob:mock-url')
			vi.mocked(URL.revokeObjectURL).mockImplementation(() => {})

			vi.mocked(PngHelpers.isPng).mockReturnValue(true)
			vi.mocked(PngHelpers.findChunk).mockReturnValue({
				dataOffset: 8,
				size: 9,
				start: 0,
			})
			vi.mocked(PngHelpers.parsePhys).mockReturnValue({
				ppux: 28346, // 72 DPI in pixels per meter
				ppuy: 28346,
				unit: 0,
			})

			const result = await MediaHelpers.getImageSize(mockBlob)

			// Should scale down by the pixel ratio (72 DPI / 72 DPI * devicePixelRatio)
			expect(result.w).toBeLessThan(7200)
			expect(result.h).toBeLessThan(5400)
		})

		it('should return original dimensions when PNG parsing fails', async () => {
			const mockBlob = {
				type: 'image/png',
				arrayBuffer: vi.fn().mockRejectedValue(new Error('Parse error')),
			} as any

			const mockImg = {
				naturalWidth: 800,
				naturalHeight: 600,
			}

			vi.spyOn(MediaHelpers, 'getImageAndDimensions').mockResolvedValue({
				w: 800,
				h: 600,
				image: mockImg as any,
			})
			vi.mocked(URL.createObjectURL).mockReturnValue('blob:mock-url')
			vi.mocked(URL.revokeObjectURL).mockImplementation(() => {})

			const result = await MediaHelpers.getImageSize(mockBlob)

			expect(result).toEqual({ w: 800, h: 600 })
		})
	})

	describe('isAnimated', () => {
		it('should detect animated GIF', async () => {
			const mockBlob = {
				type: 'image/gif',
				arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
			} as any
			vi.mocked(isGifAnimated).mockReturnValue(true)

			const result = await MediaHelpers.isAnimated(mockBlob)

			expect(result).toBe(true)
			expect(isGifAnimated).toHaveBeenCalled()
		})

		it('should detect animated AVIF', async () => {
			const mockBlob = {
				type: 'image/avif',
				arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
			} as any
			vi.mocked(isAvifAnimated).mockReturnValue(true)

			const result = await MediaHelpers.isAnimated(mockBlob)

			expect(result).toBe(true)
			expect(isAvifAnimated).toHaveBeenCalled()
		})

		it('should detect animated WebP', async () => {
			const mockBlob = {
				type: 'image/webp',
				arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
			} as any
			vi.mocked(isWebpAnimated).mockReturnValue(true)

			const result = await MediaHelpers.isAnimated(mockBlob)

			expect(result).toBe(true)
			expect(isWebpAnimated).toHaveBeenCalled()
		})

		it('should detect animated APNG', async () => {
			const mockBlob = {
				type: 'image/apng',
				arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
			} as any
			vi.mocked(isApngAnimated).mockReturnValue(true)

			const result = await MediaHelpers.isAnimated(mockBlob)

			expect(result).toBe(true)
			expect(isApngAnimated).toHaveBeenCalled()
		})

		it('should return false for unsupported types', async () => {
			const mockBlob = {
				type: 'image/jpeg',
			} as any

			const result = await MediaHelpers.isAnimated(mockBlob)

			expect(result).toBe(false)
		})

		it('should return false for static animated formats', async () => {
			const mockBlob = {
				type: 'image/gif',
				arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
			} as any
			vi.mocked(isGifAnimated).mockReturnValue(false)

			const result = await MediaHelpers.isAnimated(mockBlob)

			expect(result).toBe(false)
		})
	})

	describe('isAnimatedImageType', () => {
		it('should return true for animated image types', () => {
			expect(MediaHelpers.isAnimatedImageType('image/gif')).toBe(true)
			expect(MediaHelpers.isAnimatedImageType('image/apng')).toBe(true)
			expect(MediaHelpers.isAnimatedImageType('image/avif')).toBe(true)
		})

		it('should return false for non-animated image types', () => {
			expect(MediaHelpers.isAnimatedImageType('image/jpeg')).toBe(false)
			expect(MediaHelpers.isAnimatedImageType('image/png')).toBe(false)
			expect(MediaHelpers.isAnimatedImageType('image/svg+xml')).toBe(false)
		})

		it('should return false for null or invalid types', () => {
			expect(MediaHelpers.isAnimatedImageType(null)).toBe(false)
			expect(MediaHelpers.isAnimatedImageType('')).toBe(false)
			expect(MediaHelpers.isAnimatedImageType('video/mp4')).toBe(false)
		})
	})

	describe('isStaticImageType', () => {
		it('should return true for static image types', () => {
			expect(MediaHelpers.isStaticImageType('image/jpeg')).toBe(true)
			expect(MediaHelpers.isStaticImageType('image/png')).toBe(true)
			expect(MediaHelpers.isStaticImageType('image/webp')).toBe(true)
		})

		it('should return false for animated or vector types', () => {
			expect(MediaHelpers.isStaticImageType('image/gif')).toBe(false)
			expect(MediaHelpers.isStaticImageType('image/svg+xml')).toBe(false)
		})

		it('should return false for null or invalid types', () => {
			expect(MediaHelpers.isStaticImageType(null)).toBe(false)
			expect(MediaHelpers.isStaticImageType('')).toBe(false)
		})
	})

	describe('isVectorImageType', () => {
		it('should return true for vector image types', () => {
			expect(MediaHelpers.isVectorImageType('image/svg+xml')).toBe(true)
		})

		it('should return false for non-vector types', () => {
			expect(MediaHelpers.isVectorImageType('image/jpeg')).toBe(false)
			expect(MediaHelpers.isVectorImageType('image/gif')).toBe(false)
		})

		it('should return false for null or invalid types', () => {
			expect(MediaHelpers.isVectorImageType(null)).toBe(false)
			expect(MediaHelpers.isVectorImageType('')).toBe(false)
		})
	})

	describe('isImageType', () => {
		it('should return true for all supported image types', () => {
			DEFAULT_SUPPORTED_IMAGE_TYPES.forEach((type) => {
				expect(MediaHelpers.isImageType(type)).toBe(true)
			})
		})

		it('should return false for video types', () => {
			expect(MediaHelpers.isImageType('video/mp4')).toBe(false)
			expect(MediaHelpers.isImageType('video/webm')).toBe(false)
		})

		it('should return false for unsupported types', () => {
			expect(MediaHelpers.isImageType('application/json')).toBe(false)
			expect(MediaHelpers.isImageType('')).toBe(false)
		})
	})

	describe('usingObjectURL', () => {
		beforeEach(() => {
			// Reset URL mocks for each test
			vi.clearAllMocks()
		})

		it('should create and revoke object URL', async () => {
			const mockBlob = new Blob(['test data'])
			const mockUrl = 'blob:http://localhost:3000/mock-uuid'
			const mockResult = 'function result'

			vi.mocked(URL.createObjectURL).mockReturnValue(mockUrl)

			const fn = vi.fn().mockResolvedValue(mockResult)
			const result = await MediaHelpers.usingObjectURL(mockBlob, fn)

			expect(URL.createObjectURL).toHaveBeenCalledWith(mockBlob)
			expect(fn).toHaveBeenCalledWith(mockUrl)
			expect(URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl)
			expect(result).toBe(mockResult)
		})

		it('should revoke URL even if function throws', async () => {
			const mockBlob = new Blob(['test data'])
			const mockUrl = 'blob:http://localhost:3000/mock-uuid'
			const mockError = new Error('Function failed')

			vi.mocked(URL.createObjectURL).mockReturnValue(mockUrl)

			const fn = vi.fn().mockRejectedValue(mockError)

			await expect(MediaHelpers.usingObjectURL(mockBlob, fn)).rejects.toThrow('Function failed')

			expect(URL.createObjectURL).toHaveBeenCalledWith(mockBlob)
			expect(URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl)
		})
	})
})
