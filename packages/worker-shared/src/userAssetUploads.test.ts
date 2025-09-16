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
		describe('successful upload scenarios', () => {
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

			it('handles null body correctly', async () => {
				const mockObject = {
					key: 'test-image.jpg',
					size: 0,
					httpEtag: '"empty"',
					writeHttpMetadata: vi.fn(),
				}

				vi.mocked(mockBucket.head).mockResolvedValue(null)
				vi.mocked(mockBucket.put).mockResolvedValue(mockObject)

				const response = await handleUserAssetUpload({
					objectName: 'test-image.jpg',
					bucket: mockBucket as any,
					body: null,
					headers: mockHeaders,
				})

				expect(mockBucket.put).toHaveBeenCalledWith('test-image.jpg', null, {
					httpMetadata: mockHeaders,
				})
				expect(response.status).toBe(200)
			})

			it('handles empty headers correctly', async () => {
				const emptyHeaders = new Headers()
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
					headers: emptyHeaders,
				})

				expect(mockBucket.put).toHaveBeenCalledWith('test-image.jpg', mockBody, {
					httpMetadata: emptyHeaders,
				})
				expect(response.status).toBe(200)
			})

			it('preserves all HTTP metadata from headers', async () => {
				const complexHeaders = new Headers({
					'content-type': 'image/png',
					'content-length': '2048',
					'cache-control': 'no-cache',
					'x-custom-header': 'custom-value',
				})

				const mockObject = {
					key: 'complex-image.png',
					size: 2048,
					httpEtag: '"complex123"',
					writeHttpMetadata: vi.fn(),
				}

				vi.mocked(mockBucket.head).mockResolvedValue(null)
				vi.mocked(mockBucket.put).mockResolvedValue(mockObject)

				const response = await handleUserAssetUpload({
					objectName: 'complex-image.png',
					bucket: mockBucket as any,
					body: mockBody,
					headers: complexHeaders,
				})

				expect(mockBucket.put).toHaveBeenCalledWith('complex-image.png', mockBody, {
					httpMetadata: complexHeaders,
				})
				expect(response.status).toBe(200)
			})

			it('handles object names with special characters', async () => {
				const specialName = 'folder/sub-folder/image with spaces & special chars!.jpg'
				const mockObject = {
					key: specialName,
					size: 1024,
					httpEtag: '"special123"',
					writeHttpMetadata: vi.fn(),
				}

				vi.mocked(mockBucket.head).mockResolvedValue(null)
				vi.mocked(mockBucket.put).mockResolvedValue(mockObject)

				const response = await handleUserAssetUpload({
					objectName: specialName,
					bucket: mockBucket as any,
					body: mockBody,
					headers: mockHeaders,
				})

				expect(mockBucket.head).toHaveBeenCalledWith(specialName)
				expect(mockBucket.put).toHaveBeenCalledWith(specialName, mockBody, {
					httpMetadata: mockHeaders,
				})
				expect(response.status).toBe(200)
			})
		})

		describe('conflict detection', () => {
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

			it('checks for existence before attempting upload', async () => {
				const existingObject = {
					key: 'test.jpg',
					size: 500,
					httpEtag: '"exists"',
					writeHttpMetadata: vi.fn(),
				}

				vi.mocked(mockBucket.head).mockResolvedValue(existingObject)

				await handleUserAssetUpload({
					objectName: 'test.jpg',
					bucket: mockBucket as any,
					body: mockBody,
					headers: mockHeaders,
				})

				// Verify head was called and put was not called (since object exists)
				expect(mockBucket.head).toHaveBeenCalledWith('test.jpg')
				expect(mockBucket.put).not.toHaveBeenCalled()
			})

			it('returns proper content type for 409 response', async () => {
				const existingObject = {
					key: 'existing.jpg',
					size: 1024,
					httpEtag: '"exists"',
					writeHttpMetadata: vi.fn(),
				}

				vi.mocked(mockBucket.head).mockResolvedValue(existingObject)

				const response = await handleUserAssetUpload({
					objectName: 'existing.jpg',
					bucket: mockBucket as any,
					body: mockBody,
					headers: mockHeaders,
				})

				expect(response.headers.get('content-type')).toBe('application/json')
			})
		})

		describe('error handling', () => {
			it('propagates bucket head errors', async () => {
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

			it('propagates bucket put errors', async () => {
				const putError = new Error('Upload failed')
				vi.mocked(mockBucket.head).mockResolvedValue(null)
				vi.mocked(mockBucket.put).mockRejectedValue(putError)

				await expect(
					handleUserAssetUpload({
						objectName: 'test.jpg',
						bucket: mockBucket as any,
						body: mockBody,
						headers: mockHeaders,
					})
				).rejects.toThrow('Upload failed')
			})

			it('handles bucket head returning truthy non-object value', async () => {
				// Edge case: if bucket.head returns a truthy primitive
				vi.mocked(mockBucket.head).mockResolvedValue('truthy string' as any)

				const response = await handleUserAssetUpload({
					objectName: 'test.jpg',
					bucket: mockBucket as any,
					body: mockBody,
					headers: mockHeaders,
				})

				expect(response.status).toBe(409)
			})
		})

		describe('response format validation', () => {
			it('returns Response instance', async () => {
				vi.mocked(mockBucket.head).mockResolvedValue(null)
				vi.mocked(mockBucket.put).mockResolvedValue({
					key: 'test.jpg',
					size: 1024,
					httpEtag: '"test"',
					writeHttpMetadata: vi.fn(),
				})

				const response = await handleUserAssetUpload({
					objectName: 'test.jpg',
					bucket: mockBucket as any,
					body: mockBody,
					headers: mockHeaders,
				})

				expect(response).toBeInstanceOf(Response)
			})

			it('returns JSON content type for successful upload', async () => {
				vi.mocked(mockBucket.head).mockResolvedValue(null)
				vi.mocked(mockBucket.put).mockResolvedValue({
					key: 'test.jpg',
					size: 1024,
					httpEtag: '"test"',
					writeHttpMetadata: vi.fn(),
				})

				const response = await handleUserAssetUpload({
					objectName: 'test.jpg',
					bucket: mockBucket as any,
					body: mockBody,
					headers: mockHeaders,
				})

				expect(response.headers.get('content-type')).toBe('application/json')
			})

			it('includes ETag in response headers', async () => {
				const etag = '"unique-etag-value"'
				vi.mocked(mockBucket.head).mockResolvedValue(null)
				vi.mocked(mockBucket.put).mockResolvedValue({
					key: 'test.jpg',
					size: 1024,
					httpEtag: etag,
					writeHttpMetadata: vi.fn(),
				})

				const response = await handleUserAssetUpload({
					objectName: 'test.jpg',
					bucket: mockBucket as any,
					body: mockBody,
					headers: mockHeaders,
				})

				expect(response.headers.get('etag')).toBe(etag)
			})
		})
	})

	describe('handleUserAssetGet', () => {
		let mockCacheMatch: ReturnType<typeof vi.fn>
		let mockCachePut: ReturnType<typeof vi.fn>

		beforeEach(() => {
			mockCacheMatch = vi.fn()
			mockCachePut = vi.fn().mockResolvedValue(undefined) // Return a Promise
			;(globalThis as any).caches = {
				default: {
					match: mockCacheMatch,
					put: mockCachePut,
				},
			}
		})

		describe('cache behavior', () => {
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

			it('creates proper cache key from request', async () => {
				const mockRequestWithRangeHeader = {
					url: 'https://example.com/assets/test.jpg',
					headers: new Headers({ range: 'bytes=0-499' }),
				}

				mockCacheMatch.mockResolvedValue(null)
				vi.mocked(mockBucket.get).mockResolvedValue(null)

				await handleUserAssetGet({
					request: mockRequestWithRangeHeader as any,
					bucket: mockBucket as any,
					objectName: 'test.jpg',
					context: mockExecutionContext as any,
				})

				// Verify cache match was called (cache key is a Request object)
				expect(mockCacheMatch).toHaveBeenCalledWith(expect.any(Request))

				// Get the actual cache key used
				const cacheKeyUsed = mockCacheMatch.mock.calls[0][0]
				expect(cacheKeyUsed.url).toBe('https://example.com/assets/test.jpg')
			})

			it('caches successful 200 responses', async () => {
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
						headers.set('content-length', '1024')
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
				expect(mockExecutionContext.waitUntil).toHaveBeenCalled()
				expect(mockCachePut).toHaveBeenCalled()
			})

			it('does not cache 206 partial content responses', async () => {
				mockCacheMatch.mockResolvedValue(null)

				const mockObject = {
					key: 'test.jpg',
					size: 1024,
					httpEtag: '"test123"',
					range: { offset: 0, length: 512 },
					body: new ReadableStream({
						start(controller) {
							controller.enqueue(stringToBytes('partial data'))
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

				expect(response.status).toBe(206)
				expect(mockExecutionContext.waitUntil).not.toHaveBeenCalled()
				expect(mockCachePut).not.toHaveBeenCalled()
			})

			it('does not cache 304 not modified responses', async () => {
				mockCacheMatch.mockResolvedValue(null)

				const mockObject = {
					key: 'test.jpg',
					size: 1024,
					httpEtag: '"test123"',
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

				expect(response.status).toBe(304)
				expect(mockExecutionContext.waitUntil).not.toHaveBeenCalled()
				expect(mockCachePut).not.toHaveBeenCalled()
			})
		})

		describe('range request handling', () => {
			it('handles offset+length range requests', async () => {
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

				expect(response.status).toBe(206)
				expect(response.headers.get('content-range')).toBe('bytes 100-299/1024')
			})

			it('handles offset-only range requests', async () => {
				mockCacheMatch.mockResolvedValue(null)

				const mockObject = {
					key: 'test.jpg',
					size: 1024,
					httpEtag: '"test123"',
					range: { offset: 500 },
					body: new ReadableStream({
						start(controller) {
							controller.enqueue(stringToBytes('range data'))
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

				expect(response.status).toBe(206)
				expect(response.headers.get('content-range')).toBe('bytes 500-1023/1024')
			})

			it('handles suffix range requests', async () => {
				mockCacheMatch.mockResolvedValue(null)

				const mockObject = {
					key: 'test.jpg',
					size: 1024,
					httpEtag: '"test123"',
					range: { suffix: 100 },
					body: new ReadableStream({
						start(controller) {
							controller.enqueue(stringToBytes('suffix data'))
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

				expect(response.status).toBe(206)
				expect(response.headers.get('content-range')).toBe('bytes 924-1023/1024')
			})

			it('does not set content-range for full object requests', async () => {
				mockCacheMatch.mockResolvedValue(null)

				const mockObject = {
					key: 'test.jpg',
					size: 1024,
					httpEtag: '"test123"',
					range: { offset: 0, length: 1024 },
					body: new ReadableStream({
						start(controller) {
							controller.enqueue(stringToBytes('full data'))
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
				expect(response.headers.get('content-range')).toBeNull()
			})

			it('handles edge case where range start equals end', async () => {
				mockCacheMatch.mockResolvedValue(null)

				const mockObject = {
					key: 'test.jpg',
					size: 1024,
					httpEtag: '"test123"',
					range: { offset: 100, length: 1 },
					body: new ReadableStream({
						start(controller) {
							controller.enqueue(stringToBytes('x'))
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

				expect(response.headers.get('content-range')).toBe('bytes 100-100/1024')
			})
		})

		describe('header management', () => {
			it('sets immutable cache control headers', async () => {
				mockCacheMatch.mockResolvedValue(null)

				const mockObject = {
					key: 'test.jpg',
					size: 1024,
					httpEtag: '"test123"',
					body: new ReadableStream({
						start(controller) {
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

				expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
			})

			it('sets CORS headers', async () => {
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

				expect(response.headers.get('access-control-allow-origin')).toBe('*')
			})

			it('preserves ETag from R2 object', async () => {
				mockCacheMatch.mockResolvedValue(null)

				const etag = '"unique-asset-etag"'
				const mockObject = {
					key: 'test.jpg',
					size: 1024,
					httpEtag: etag,
					writeHttpMetadata: vi.fn(),
				}

				vi.mocked(mockBucket.get).mockResolvedValue(mockObject)

				const response = await handleUserAssetGet({
					request: mockRequest as any,
					bucket: mockBucket as any,
					objectName: 'test.jpg',
					context: mockExecutionContext as any,
				})

				expect(response.headers.get('etag')).toBe(etag)
			})

			it('calls writeHttpMetadata to copy object metadata', async () => {
				mockCacheMatch.mockResolvedValue(null)

				const mockObject = {
					key: 'test.jpg',
					size: 1024,
					httpEtag: '"test123"',
					writeHttpMetadata: vi.fn((headers: Headers) => {
						headers.set('content-type', 'image/jpeg')
						headers.set('content-length', '1024')
						headers.set('last-modified', 'Wed, 21 Oct 2015 07:28:00 GMT')
					}),
				}

				vi.mocked(mockBucket.get).mockResolvedValue(mockObject)

				const response = await handleUserAssetGet({
					request: mockRequest as any,
					bucket: mockBucket as any,
					objectName: 'test.jpg',
					context: mockExecutionContext as any,
				})

				expect(mockObject.writeHttpMetadata).toHaveBeenCalled()
				expect(response.headers.get('content-type')).toBe('image/jpeg')
				expect(response.headers.get('content-length')).toBe('1024')
				expect(response.headers.get('last-modified')).toBe('Wed, 21 Oct 2015 07:28:00 GMT')
			})
		})

		describe('bucket integration', () => {
			it('passes range headers to bucket.get', async () => {
				const requestWithRange = {
					url: 'https://example.com/assets/test.jpg',
					headers: new Headers({ range: 'bytes=0-499' }),
				}

				mockCacheMatch.mockResolvedValue(null)
				vi.mocked(mockBucket.get).mockResolvedValue(null)

				await handleUserAssetGet({
					request: requestWithRange as any,
					bucket: mockBucket as any,
					objectName: 'test.jpg',
					context: mockExecutionContext as any,
				})

				expect(mockBucket.get).toHaveBeenCalledWith('test.jpg', {
					range: requestWithRange.headers,
					onlyIf: requestWithRange.headers,
				})
			})

			it('passes onlyIf headers to bucket.get', async () => {
				const requestWithConditional = {
					url: 'https://example.com/assets/test.jpg',
					headers: new Headers({ 'if-none-match': '"etag123"' }),
				}

				mockCacheMatch.mockResolvedValue(null)
				vi.mocked(mockBucket.get).mockResolvedValue(null)

				await handleUserAssetGet({
					request: requestWithConditional as any,
					bucket: mockBucket as any,
					objectName: 'test.jpg',
					context: mockExecutionContext as any,
				})

				expect(mockBucket.get).toHaveBeenCalledWith('test.jpg', {
					range: requestWithConditional.headers,
					onlyIf: requestWithConditional.headers,
				})
			})

			it('returns 404 when object not found in bucket', async () => {
				mockCacheMatch.mockResolvedValue(null)
				vi.mocked(mockBucket.get).mockResolvedValue(null)

				const response = await handleUserAssetGet({
					request: mockRequest as any,
					bucket: mockBucket as any,
					objectName: 'nonexistent.jpg',
					context: mockExecutionContext as any,
				})

				expect(response.status).toBe(404)
				const responseBody = (await response.json()) as { error: string }
				expect(responseBody).toEqual({ error: 'Not found' })
			})
		})

		describe('response body handling', () => {
			it('handles objects with body stream', async () => {
				mockCacheMatch.mockResolvedValue(null)

				const testData = 'image binary data'
				const mockObject = {
					key: 'test.jpg',
					size: testData.length,
					httpEtag: '"test123"',
					body: new ReadableStream({
						start(controller) {
							controller.enqueue(stringToBytes(testData))
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

				expect(response.status).toBe(200)
				expect(response.body).toBeTruthy()
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

			it('properly tees body stream for caching', async () => {
				mockCacheMatch.mockResolvedValue(null)

				let teeCallCount = 0
				const mockTee = vi.fn(() => {
					teeCallCount++
					return [
						new ReadableStream({
							start(controller) {
								controller.enqueue(stringToBytes('cache stream'))
								controller.close()
							},
						}),
						new ReadableStream({
							start(controller) {
								controller.enqueue(stringToBytes('response stream'))
								controller.close()
							},
						}),
					]
				})

				const mockObject = {
					key: 'test.jpg',
					size: 1024,
					httpEtag: '"test123"',
					body: {
						tee: mockTee,
					} as any,
					writeHttpMetadata: vi.fn(),
				}

				vi.mocked(mockBucket.get).mockResolvedValue(mockObject)

				const response = await handleUserAssetGet({
					request: mockRequest as any,
					bucket: mockBucket as any,
					objectName: 'test.jpg',
					context: mockExecutionContext as any,
				})

				expect(response.status).toBe(200)
				expect(mockTee).toHaveBeenCalled()
				expect(mockExecutionContext.waitUntil).toHaveBeenCalled()
			})
		})

		describe('error scenarios', () => {
			it('propagates bucket get errors', async () => {
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

			it('propagates cache match errors', async () => {
				const cacheError = new Error('Cache read failed')
				mockCacheMatch.mockRejectedValue(cacheError)

				await expect(
					handleUserAssetGet({
						request: mockRequest as any,
						bucket: mockBucket as any,
						objectName: 'test.jpg',
						context: mockExecutionContext as any,
					})
				).rejects.toThrow('Cache read failed')
			})

			it('handles cache put errors gracefully', async () => {
				mockCacheMatch.mockResolvedValue(null)
				mockCachePut.mockRejectedValue(new Error('Cache write failed'))

				const mockObject = {
					key: 'test.jpg',
					size: 1024,
					httpEtag: '"test123"',
					body: new ReadableStream({
						start(controller) {
							controller.enqueue(stringToBytes('data'))
							controller.close()
						},
					}),
					writeHttpMetadata: vi.fn(),
				}

				vi.mocked(mockBucket.get).mockResolvedValue(mockObject)

				// Should not throw even if cache put fails
				const response = await handleUserAssetGet({
					request: mockRequest as any,
					bucket: mockBucket as any,
					objectName: 'test.jpg',
					context: mockExecutionContext as any,
				})

				expect(response.status).toBe(200)
			})
		})

		describe('edge cases and boundary conditions', () => {
			it('handles zero-length objects', async () => {
				mockCacheMatch.mockResolvedValue(null)

				const mockObject = {
					key: 'empty.txt',
					size: 0,
					httpEtag: '"empty"',
					body: new ReadableStream({
						start(controller) {
							controller.close()
						},
					}),
					writeHttpMetadata: vi.fn(),
				}

				vi.mocked(mockBucket.get).mockResolvedValue(mockObject)

				const response = await handleUserAssetGet({
					request: mockRequest as any,
					bucket: mockBucket as any,
					objectName: 'empty.txt',
					context: mockExecutionContext as any,
				})

				expect(response.status).toBe(200)
			})

			it('handles very large object sizes', async () => {
				mockCacheMatch.mockResolvedValue(null)

				const largeSize = 2 ** 31 - 1 // Max 32-bit signed integer
				const mockObject = {
					key: 'large.bin',
					size: largeSize,
					httpEtag: '"large"',
					range: { suffix: 1000 },
					body: new ReadableStream({
						start(controller) {
							controller.enqueue(stringToBytes('end data'))
							controller.close()
						},
					}),
					writeHttpMetadata: vi.fn(),
				}

				vi.mocked(mockBucket.get).mockResolvedValue(mockObject)

				const response = await handleUserAssetGet({
					request: mockRequest as any,
					bucket: mockBucket as any,
					objectName: 'large.bin',
					context: mockExecutionContext as any,
				})

				const expectedStart = largeSize - 1000
				const expectedEnd = largeSize - 1
				expect(response.headers.get('content-range')).toBe(
					`bytes ${expectedStart}-${expectedEnd}/${largeSize}`
				)
			})

			it('handles object names with special characters in cache key', async () => {
				const specialName = 'folder/file with spaces & symbols!@#$.jpg'
				const specialUrl = `https://example.com/assets/${encodeURIComponent(specialName)}`

				const requestWithSpecialName = {
					url: specialUrl,
					headers: new Headers(),
				}

				mockCacheMatch.mockResolvedValue(null)
				vi.mocked(mockBucket.get).mockResolvedValue(null)

				await handleUserAssetGet({
					request: requestWithSpecialName as any,
					bucket: mockBucket as any,
					objectName: specialName,
					context: mockExecutionContext as any,
				})

				expect(mockCacheMatch).toHaveBeenCalledWith(
					expect.objectContaining({
						url: specialUrl,
					})
				)
			})

			it('handles range calculations at object boundaries', async () => {
				mockCacheMatch.mockResolvedValue(null)

				const mockObject = {
					key: 'boundary.jpg',
					size: 100,
					httpEtag: '"boundary"',
					range: { offset: 99, length: 1 }, // Last byte
					body: new ReadableStream({
						start(controller) {
							controller.enqueue(stringToBytes('z'))
							controller.close()
						},
					}),
					writeHttpMetadata: vi.fn(),
				}

				vi.mocked(mockBucket.get).mockResolvedValue(mockObject)

				const response = await handleUserAssetGet({
					request: mockRequest as any,
					bucket: mockBucket as any,
					objectName: 'boundary.jpg',
					context: mockExecutionContext as any,
				})

				expect(response.headers.get('content-range')).toBe('bytes 99-99/100')
			})
		})

		describe('integration with execution context', () => {
			it('uses waitUntil for background caching operations', async () => {
				mockCacheMatch.mockResolvedValue(null)
				// Make sure the cache put returns a Promise
				mockCachePut.mockResolvedValue(undefined)

				const mockObject = {
					key: 'test.jpg',
					size: 1024,
					httpEtag: '"test123"',
					body: new ReadableStream({
						start(controller) {
							controller.enqueue(stringToBytes('data'))
							controller.close()
						},
					}),
					writeHttpMetadata: vi.fn(),
				}

				vi.mocked(mockBucket.get).mockResolvedValue(mockObject)

				await handleUserAssetGet({
					request: mockRequest as any,
					bucket: mockBucket as any,
					objectName: 'test.jpg',
					context: mockExecutionContext as any,
				})

				expect(mockExecutionContext.waitUntil).toHaveBeenCalledWith(expect.any(Promise))
			})

			it('does not call waitUntil for non-cacheable responses', async () => {
				mockCacheMatch.mockResolvedValue(null)

				const mockObject = {
					key: 'test.jpg',
					size: 1024,
					httpEtag: '"test123"',
					writeHttpMetadata: vi.fn(),
				}

				vi.mocked(mockBucket.get).mockResolvedValue(mockObject)

				await handleUserAssetGet({
					request: mockRequest as any,
					bucket: mockBucket as any,
					objectName: 'test.jpg',
					context: mockExecutionContext as any,
				})

				expect(mockExecutionContext.waitUntil).not.toHaveBeenCalled()
			})
		})
	})

	describe('integration scenarios', () => {
		it('upload and retrieve workflow', async () => {
			// Test upload
			vi.mocked(mockBucket.head).mockResolvedValue(null)
			const uploadedObject = {
				key: 'workflow-test.jpg',
				size: 2048,
				httpEtag: '"workflow123"',
				writeHttpMetadata: vi.fn(),
			}
			vi.mocked(mockBucket.put).mockResolvedValue(uploadedObject)

			const uploadResponse = await handleUserAssetUpload({
				objectName: 'workflow-test.jpg',
				bucket: mockBucket as any,
				body: mockBody,
				headers: mockHeaders,
			})

			expect(uploadResponse.status).toBe(200)

			// Reset mocks for retrieval
			const mockCacheMatch = vi.fn().mockResolvedValue(null)
			;(globalThis as any).caches = {
				default: {
					match: mockCacheMatch,
					put: vi.fn(),
				},
			}

			// Test retrieval
			const retrieveObject = {
				key: 'workflow-test.jpg',
				size: 2048,
				httpEtag: '"workflow123"',
				body: new ReadableStream({
					start(controller) {
						controller.enqueue(stringToBytes('retrieved data'))
						controller.close()
					},
				}),
				writeHttpMetadata: vi.fn((headers: Headers) => {
					headers.set('content-type', 'image/jpeg')
				}),
			}
			vi.mocked(mockBucket.get).mockResolvedValue(retrieveObject)

			const retrieveResponse = await handleUserAssetGet({
				request: mockRequest as any,
				bucket: mockBucket as any,
				objectName: 'workflow-test.jpg',
				context: mockExecutionContext as any,
			})

			expect(retrieveResponse.status).toBe(200)
			expect(retrieveResponse.headers.get('etag')).toBe('"workflow123"')
		})

		it('handles conflicting upload after successful upload', async () => {
			// First upload succeeds
			vi.mocked(mockBucket.head).mockResolvedValueOnce(null)
			const firstObject = {
				key: 'conflict-test.jpg',
				size: 1024,
				httpEtag: '"first123"',
				writeHttpMetadata: vi.fn(),
			}
			vi.mocked(mockBucket.put).mockResolvedValue(firstObject)

			const firstResponse = await handleUserAssetUpload({
				objectName: 'conflict-test.jpg',
				bucket: mockBucket as any,
				body: mockBody,
				headers: mockHeaders,
			})

			expect(firstResponse.status).toBe(200)

			// Second upload should conflict
			const existingObject = {
				key: 'conflict-test.jpg',
				size: 1024,
				httpEtag: '"first123"',
				writeHttpMetadata: vi.fn(),
			}
			vi.mocked(mockBucket.head).mockResolvedValue(existingObject)

			const secondResponse = await handleUserAssetUpload({
				objectName: 'conflict-test.jpg',
				bucket: mockBucket as any,
				body: mockBody,
				headers: mockHeaders,
			})

			expect(secondResponse.status).toBe(409)
		})
	})

	describe('TypeScript type safety', () => {
		it('accepts properly typed parameters for handleUserAssetUpload', async () => {
			vi.mocked(mockBucket.head).mockResolvedValue(null)
			vi.mocked(mockBucket.put).mockResolvedValue({
				key: 'typed-test.jpg',
				size: 1024,
				httpEtag: '"typed123"',
				writeHttpMetadata: vi.fn(),
			})

			// This should compile without type errors
			const response = await handleUserAssetUpload({
				objectName: 'typed-test.jpg',
				bucket: mockBucket as any,
				body: mockBody,
				headers: mockHeaders,
			})

			expect(response).toBeInstanceOf(Response)
		})

		it('accepts properly typed parameters for handleUserAssetGet', async () => {
			const mockCacheMatch = vi.fn().mockResolvedValue(null)
			;(globalThis as any).caches = {
				default: {
					match: mockCacheMatch,
					put: vi.fn(),
				},
			}

			vi.mocked(mockBucket.get).mockResolvedValue(null)

			// This should compile without type errors
			const response = await handleUserAssetGet({
				request: mockRequest as any,
				bucket: mockBucket as any,
				objectName: 'typed-test.jpg',
				context: mockExecutionContext as any,
			})

			expect(response).toBeInstanceOf(Response)
		})
	})
})
