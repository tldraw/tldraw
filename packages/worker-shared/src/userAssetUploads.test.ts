import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { handleUserAssetGet, handleUserAssetUpload } from './userAssetUploads'

// Helper function to convert string to Uint8Array
function stringToBytes(str: string): Uint8Array {
	const bytes = new Uint8Array(str.length)
	for (let i = 0; i < str.length; i++) {
		bytes[i] = str.charCodeAt(i)
	}
	return bytes
}

// Mock R2Bucket interface
interface MockR2Object {
	key: string
	size: number
	httpEtag: string
	range?: { offset?: number; length?: number } | { suffix: number }
	body?: ReadableStream<Uint8Array>
	writeHttpMetadata: (headers: Headers) => void
}

interface MockR2Bucket {
	head: (key: string) => Promise<MockR2Object | null>
	get: (
		key: string,
		options?: { range?: Headers; onlyIf?: Headers }
	) => Promise<MockR2Object | null>
	put: (
		key: string,
		body: ReadableStream | null,
		options?: { httpMetadata?: Headers }
	) => Promise<MockR2Object>
}

// Mock ExecutionContext
interface MockExecutionContext {
	waitUntil: (promise: Promise<any>) => void
}

// Mock IRequest from itty-router
interface MockIRequest {
	url: string
	headers: Headers
}

describe('userAssetUploads', () => {
	let mockBucket: MockR2Bucket
	let mockExecutionContext: MockExecutionContext
	let mockRequest: MockIRequest
	let mockHeaders: Headers
	let mockBody: ReadableStream<Uint8Array>

	beforeEach(() => {
		// Reset mocks before each test
		mockBucket = {
			head: vi.fn(),
			get: vi.fn(),
			put: vi.fn(),
		}

		mockExecutionContext = {
			waitUntil: vi.fn(),
		}

		mockHeaders = new Headers({
			'content-type': 'image/jpeg',
			'content-length': '1024',
		})

		mockRequest = {
			url: 'https://example.com/assets/test-image.jpg',
			headers: new Headers(),
		}

		// Create a simple ReadableStream with test data
		const testData = stringToBytes('test image data')
		mockBody = new ReadableStream({
			start(controller) {
				controller.enqueue(testData)
				controller.close()
			},
		})

		// Mock global caches object
		;(globalThis as any).caches = {
			default: {
				match: vi.fn(),
				put: vi.fn(),
			},
		}
	})

	afterEach(() => {
		vi.resetAllMocks()
		delete (globalThis as any).caches
	})

	describe('handleUserAssetUpload', () => {
		it('uploads asset when it does not exist', async () => {
			const mockObject = {
				key: 'test-image.jpg',
				size: 1024,
				httpEtag: '"abc123"',
				writeHttpMetadata: vi.fn(),
			}

			vi.mocked(mockBucket.head).mockResolvedValue(null)
			vi.mocked(mockBucket.put).mockResolvedValue(mockObject)

			const response = await handleUserAssetUpload({
				objectName: 'test-image.jpg',
				bucket: mockBucket as any,
				body: mockBody,
				headers: mockHeaders,
			})

			expect(mockBucket.head).toHaveBeenCalledWith('test-image.jpg')
			expect(mockBucket.put).toHaveBeenCalledWith('test-image.jpg', mockBody, {
				httpMetadata: mockHeaders,
			})
			expect(response.status).toBe(200)

			const responseBody = (await response.json()) as { object: string }
			expect(responseBody).toEqual({ object: 'test-image.jpg' })
			expect(response.headers.get('etag')).toBe('"abc123"')
		})

		it('returns 409 when asset already exists', async () => {
			const existingObject = {
				key: 'existing-image.jpg',
				size: 1024,
				httpEtag: '"existing123"',
				writeHttpMetadata: vi.fn(),
			}

			vi.mocked(mockBucket.head).mockResolvedValue(existingObject)

			const response = await handleUserAssetUpload({
				objectName: 'existing-image.jpg',
				bucket: mockBucket as any,
				body: mockBody,
				headers: mockHeaders,
			})

			expect(mockBucket.head).toHaveBeenCalledWith('existing-image.jpg')
			expect(mockBucket.put).not.toHaveBeenCalled()
			expect(response.status).toBe(409)

			const responseBody = (await response.json()) as { error: string }
			expect(responseBody).toEqual({ error: 'Asset already exists' })
		})

		it('propagates bucket errors', async () => {
			const headError = new Error('Bucket access denied')
			vi.mocked(mockBucket.head).mockRejectedValue(headError)

			await expect(
				handleUserAssetUpload({
					objectName: 'test.jpg',
					bucket: mockBucket as any,
					body: mockBody,
					headers: mockHeaders,
				})
			).rejects.toThrow('Bucket access denied')
		})
	})

	describe('handleUserAssetGet', () => {
		let mockCacheMatch: ReturnType<typeof vi.fn>
		let mockCachePut: ReturnType<typeof vi.fn>

		beforeEach(() => {
			mockCacheMatch = vi.fn()
			mockCachePut = vi.fn().mockResolvedValue(undefined)
			;(globalThis as any).caches = {
				default: {
					match: mockCacheMatch,
					put: mockCachePut,
				},
			}
		})

		it('returns cached response when available', async () => {
			const cachedResponse = new Response('cached content', {
				status: 200,
				headers: { 'content-type': 'image/jpeg' },
			})

			mockCacheMatch.mockResolvedValue(cachedResponse)

			const response = await handleUserAssetGet({
				request: mockRequest as any,
				bucket: mockBucket as any,
				objectName: 'cached-image.jpg',
				context: mockExecutionContext as any,
			})

			expect(response).toBe(cachedResponse)
			expect(mockBucket.get).not.toHaveBeenCalled()
		})

		it('returns 404 when object not found', async () => {
			mockCacheMatch.mockResolvedValue(null)
			vi.mocked(mockBucket.get).mockResolvedValue(null)

			const response = await handleUserAssetGet({
				request: mockRequest as any,
				bucket: mockBucket as any,
				objectName: 'nonexistent.jpg',
				context: mockExecutionContext as any,
			})

			expect(response.status).toBe(404)
		})

		it('handles successful asset retrieval with caching', async () => {
			mockCacheMatch.mockResolvedValue(null)

			const mockObject = {
				key: 'test.jpg',
				size: 1024,
				httpEtag: '"test123"',
				body: new ReadableStream({
					start(controller) {
						controller.enqueue(stringToBytes('image data'))
						controller.close()
					},
				}),
				writeHttpMetadata: vi.fn((headers: Headers) => {
					headers.set('content-type', 'image/jpeg')
				}),
			}

			vi.mocked(mockBucket.get).mockResolvedValue(mockObject)

			const response = await handleUserAssetGet({
				request: mockRequest as any,
				bucket: mockBucket as any,
				objectName: 'test.jpg',
				context: mockExecutionContext as any,
			})

			expect(response.status).toBe(200)
			expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
			expect(response.headers.get('access-control-allow-origin')).toBe('*')
			expect(mockExecutionContext.waitUntil).toHaveBeenCalled()
		})

		it('handles range requests correctly', async () => {
			mockCacheMatch.mockResolvedValue(null)

			const mockObject = {
				key: 'test.jpg',
				size: 1024,
				httpEtag: '"test123"',
				range: { offset: 100, length: 200 },
				body: new ReadableStream({
					start(controller) {
						controller.enqueue(stringToBytes('range data'))
						controller.close()
					},
				}),
				writeHttpMetadata: vi.fn(),
			}

			vi.mocked(mockBucket.get).mockResolvedValue(mockObject)

			const response = await handleUserAssetGet({
				request: mockRequest as any,
				bucket: mockBucket as any,
				objectName: 'test.jpg',
				context: mockExecutionContext as any,
			})

			expect(response.status).toBe(206)
			expect(response.headers.get('content-range')).toBe('bytes 100-299/1024')
			expect(mockExecutionContext.waitUntil).not.toHaveBeenCalled() // partial content not cached
		})

		it('handles objects without body (304 scenario)', async () => {
			mockCacheMatch.mockResolvedValue(null)

			const mockObject = {
				key: 'test.jpg',
				size: 1024,
				httpEtag: '"test123"',
				writeHttpMetadata: vi.fn(),
			}

			vi.mocked(mockBucket.get).mockResolvedValue(mockObject)

			const response = await handleUserAssetGet({
				request: mockRequest as any,
				bucket: mockBucket as any,
				objectName: 'test.jpg',
				context: mockExecutionContext as any,
			})

			expect(response.status).toBe(304)
			expect(response.body).toBeNull()
		})

		it('propagates bucket errors', async () => {
			mockCacheMatch.mockResolvedValue(null)
			const bucketError = new Error('Bucket access failed')
			vi.mocked(mockBucket.get).mockRejectedValue(bucketError)

			await expect(
				handleUserAssetGet({
					request: mockRequest as any,
					bucket: mockBucket as any,
					objectName: 'test.jpg',
					context: mockExecutionContext as any,
				})
			).rejects.toThrow('Bucket access failed')
		})
	})
})
