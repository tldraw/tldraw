import { StatusError } from 'itty-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { handleExtractBookmarkMetadataRequest } from './bookmarks'

// Mock dependencies
vi.mock('cloudflare-workers-unfurl', () => ({
	unfurl: vi.fn(),
}))

vi.mock('./handleRequest', () => ({
	parseRequestQuery: vi.fn(),
}))

vi.mock('@tldraw/utils', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@tldraw/utils')>()
	return {
		...actual,
		assert: vi.fn(),
		exhaustiveSwitchError: vi.fn((value: never) => {
			throw new Error(`Unhandled case: ${value}`)
		}),
	}
})

// Mock global fetch and crypto
const mockFetch = vi.fn()
const mockCrypto = {
	randomUUID: vi.fn(() => 'test-uuid-123'),
}

// Setup global mocks
Object.defineProperty(global, 'fetch', {
	value: mockFetch,
	writable: true,
})

Object.defineProperty(global, 'crypto', {
	value: mockCrypto,
	writable: true,
})

// Import mocked modules
const { unfurl } = await import('cloudflare-workers-unfurl')
const { parseRequestQuery } = await import('./handleRequest')
const { assert, exhaustiveSwitchError } = await import('@tldraw/utils')

describe('bookmarks', () => {
	const mockRequest = {
		method: 'GET',
		query: { url: 'https://example.com' },
	} as any

	beforeEach(() => {
		vi.clearAllMocks()
		// Reset console.error mock
		vi.spyOn(console, 'error').mockImplementation(() => {})
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	describe('handleExtractBookmarkMetadataRequest', () => {
		describe('method validation', () => {
			it('validates GET method when no uploadImage provided', async () => {
				vi.mocked(parseRequestQuery).mockReturnValue({ url: 'https://example.com' })
				vi.mocked(unfurl).mockResolvedValue({
					ok: true,
					value: { title: 'Test Title' },
				})

				const request = { ...mockRequest, method: 'GET' }

				await handleExtractBookmarkMetadataRequest({ request })

				expect(assert).toHaveBeenCalledWith(true) // GET === GET when no uploadImage
			})

			it('validates POST method when uploadImage is provided', async () => {
				vi.mocked(parseRequestQuery).mockReturnValue({ url: 'https://example.com' })
				vi.mocked(unfurl).mockResolvedValue({
					ok: true,
					value: { title: 'Test Title' },
				})

				const request = { ...mockRequest, method: 'POST' }
				const uploadImage = vi.fn()

				await handleExtractBookmarkMetadataRequest({ request, uploadImage })

				expect(assert).toHaveBeenCalledWith(true) // POST === POST when uploadImage provided
			})

			it('should fail assertion when method mismatch', async () => {
				const request = { ...mockRequest, method: 'GET' }
				const uploadImage = vi.fn()

				// This should trigger assert(false) internally
				vi.mocked(assert).mockImplementation((condition) => {
					if (!condition) throw new Error('Assertion failed')
				})

				await expect(
					handleExtractBookmarkMetadataRequest({ request, uploadImage })
				).rejects.toThrow('Assertion failed')
			})
		})

		describe('URL parsing and validation', () => {
			it('parses URL from request query', async () => {
				const testUrl = 'https://example.com/page'
				vi.mocked(parseRequestQuery).mockReturnValue({ url: testUrl })
				vi.mocked(unfurl).mockResolvedValue({
					ok: true,
					value: { title: 'Test' },
				})

				await handleExtractBookmarkMetadataRequest({ request: mockRequest })

				expect(parseRequestQuery).toHaveBeenCalledWith(mockRequest, expect.any(Object))
				expect(unfurl).toHaveBeenCalledWith(testUrl)
			})

			it('uses correct query validator schema', async () => {
				vi.mocked(parseRequestQuery).mockReturnValue({ url: 'https://example.com' })
				vi.mocked(unfurl).mockResolvedValue({
					ok: true,
					value: { title: 'Test' },
				})

				await handleExtractBookmarkMetadataRequest({ request: mockRequest })

				const [, validator] = vi.mocked(parseRequestQuery).mock.calls[0]
				expect(validator).toBeDefined()

				// Validate the schema structure by checking if it validates correct URLs
				try {
					validator.validate({ url: 'https://example.com' })
				} catch (error) {
					expect.fail('Valid HTTP URL should pass validation')
				}
			})

			it('throws validation error for invalid URL through parseRequestQuery', async () => {
				const validationError = new StatusError(400, 'Query parameters: Invalid URL')
				vi.mocked(parseRequestQuery).mockImplementation(() => {
					throw validationError
				})

				await expect(
					handleExtractBookmarkMetadataRequest({ request: mockRequest })
				).rejects.toThrow(validationError)
			})
		})

		describe('metadata extraction', () => {
			it('successfully extracts metadata', async () => {
				const mockMetadata = {
					title: 'Test Page',
					description: 'A test page',
					image: 'https://example.com/image.jpg',
					favicon: 'https://example.com/favicon.ico',
				}

				vi.mocked(parseRequestQuery).mockReturnValue({ url: 'https://example.com' })
				vi.mocked(unfurl).mockResolvedValue({
					ok: true,
					value: mockMetadata,
				})

				const response = await handleExtractBookmarkMetadataRequest({ request: mockRequest })
				const result = await response.json()

				expect(result).toEqual(mockMetadata)
				expect(response.status).toBe(200)
			})

			it('handles unfurl bad-param error', async () => {
				vi.mocked(parseRequestQuery).mockReturnValue({ url: 'https://example.com' })
				vi.mocked(unfurl).mockResolvedValue({
					ok: false,
					error: 'bad-param',
				})

				await expect(
					handleExtractBookmarkMetadataRequest({ request: mockRequest })
				).rejects.toThrow(new StatusError(400, 'Bad URL'))
			})

			it('handles unfurl failed-fetch error', async () => {
				vi.mocked(parseRequestQuery).mockReturnValue({ url: 'https://example.com' })
				vi.mocked(unfurl).mockResolvedValue({
					ok: false,
					error: 'failed-fetch',
				})

				await expect(
					handleExtractBookmarkMetadataRequest({ request: mockRequest })
				).rejects.toThrow(new StatusError(422, 'Failed to fetch URL'))
			})

			it('handles unknown unfurl error with exhaustiveSwitchError', async () => {
				vi.mocked(parseRequestQuery).mockReturnValue({ url: 'https://example.com' })
				vi.mocked(unfurl).mockResolvedValue({
					ok: false,
					error: 'unknown-error' as any,
				})

				vi.mocked(exhaustiveSwitchError).mockImplementation((value: never) => {
					throw new Error(`Unhandled unfurl error: ${value}`)
				})

				await expect(
					handleExtractBookmarkMetadataRequest({ request: mockRequest })
				).rejects.toThrow('Unhandled unfurl error: unknown-error')

				expect(exhaustiveSwitchError).toHaveBeenCalledWith('unknown-error')
			})
		})

		describe('image processing', () => {
			const mockUploadImage = vi.fn()
			const mockMetadata = {
				title: 'Test Page',
				image: 'https://example.com/image.jpg',
				favicon: 'https://example.com/favicon.ico',
			}

			beforeEach(() => {
				mockUploadImage.mockClear()
				vi.mocked(parseRequestQuery).mockReturnValue({ url: 'https://example.com' })
				vi.mocked(unfurl).mockResolvedValue({
					ok: true,
					value: mockMetadata,
				})
			})

			it('processes images when uploadImage is provided', async () => {
				const mockImageResponse = {
					ok: true,
					headers: new Headers({ 'content-type': 'image/jpeg' }),
					body: new ReadableStream(),
				}

				mockFetch.mockResolvedValue(mockImageResponse)
				mockUploadImage.mockResolvedValue('https://cdn.example.com/processed-image')

				const request = { ...mockRequest, method: 'POST' }

				await handleExtractBookmarkMetadataRequest({
					request,
					uploadImage: mockUploadImage,
				})

				// Should call fetch twice - once for image, once for favicon
				expect(mockFetch).toHaveBeenCalledTimes(2)

				// Check image processing call
				expect(mockFetch).toHaveBeenCalledWith('https://example.com/image.jpg', {
					cf: {
						image: {
							width: 600,
							fit: 'scale-down',
							quality: 80,
						},
					},
				})

				// Check favicon processing call
				expect(mockFetch).toHaveBeenCalledWith('https://example.com/favicon.ico', {
					cf: {
						image: {
							width: 64,
							fit: 'scale-down',
							quality: 80,
						},
					},
				})

				// Should call uploadImage twice
				expect(mockUploadImage).toHaveBeenCalledTimes(2)
				expect(mockUploadImage).toHaveBeenCalledWith(
					mockImageResponse.headers,
					mockImageResponse.body,
					'bookmark-image-test-uuid-123'
				)
				expect(mockUploadImage).toHaveBeenCalledWith(
					mockImageResponse.headers,
					mockImageResponse.body,
					'bookmark-favicon-test-uuid-123'
				)
			})

			it('skips image processing when URLs are not present', async () => {
				const metadataWithoutImages = { title: 'Test Page' }
				vi.mocked(unfurl).mockResolvedValue({
					ok: true,
					value: metadataWithoutImages,
				})

				const request = { ...mockRequest, method: 'POST' }

				await handleExtractBookmarkMetadataRequest({
					request,
					uploadImage: mockUploadImage,
				})

				expect(mockFetch).not.toHaveBeenCalled()
				expect(mockUploadImage).not.toHaveBeenCalled()
			})

			it('handles image fetch failure gracefully', async () => {
				mockFetch.mockResolvedValue({ ok: false, status: 404 })

				const request = { ...mockRequest, method: 'POST' }

				const response = await handleExtractBookmarkMetadataRequest({
					request,
					uploadImage: mockUploadImage,
				})

				// Should not throw, should log error and continue
				expect(console.error).toHaveBeenCalledWith(
					expect.stringContaining('Error saving image:'),
					expect.any(Error)
				)
				expect(console.error).toHaveBeenCalledWith(
					expect.stringContaining('Error saving favicon:'),
					expect.any(Error)
				)

				// Response should still be successful
				expect(response.status).toBe(200)
				expect(mockUploadImage).not.toHaveBeenCalled()
			})

			it('handles missing content-type header', async () => {
				const mockImageResponse = {
					ok: true,
					headers: new Headers(), // No content-type
					body: new ReadableStream(),
				}

				mockFetch.mockResolvedValue(mockImageResponse)

				const request = { ...mockRequest, method: 'POST' }

				await handleExtractBookmarkMetadataRequest({
					request,
					uploadImage: mockUploadImage,
				})

				expect(console.error).toHaveBeenCalledWith(
					expect.stringContaining('Error saving image:'),
					expect.objectContaining({ message: 'No content type' })
				)
			})

			it('handles non-image content-type', async () => {
				const mockImageResponse = {
					ok: true,
					headers: new Headers({ 'content-type': 'text/html' }),
					body: new ReadableStream(),
				}

				mockFetch.mockResolvedValue(mockImageResponse)

				const request = { ...mockRequest, method: 'POST' }

				await handleExtractBookmarkMetadataRequest({
					request,
					uploadImage: mockUploadImage,
				})

				expect(console.error).toHaveBeenCalledWith(
					expect.stringContaining('Error saving image:'),
					expect.objectContaining({ message: 'Not an image' })
				)
			})

			it('handles uploadImage failure gracefully', async () => {
				const mockImageResponse = {
					ok: true,
					headers: new Headers({ 'content-type': 'image/jpeg' }),
					body: new ReadableStream(),
				}

				mockFetch.mockResolvedValue(mockImageResponse)
				mockUploadImage.mockRejectedValue(new Error('Upload failed'))

				const request = { ...mockRequest, method: 'POST' }

				const response = await handleExtractBookmarkMetadataRequest({
					request,
					uploadImage: mockUploadImage,
				})

				expect(console.error).toHaveBeenCalledWith(
					expect.stringContaining('Error saving image:'),
					expect.objectContaining({ message: 'Upload failed' })
				)

				// Response should still be successful
				expect(response.status).toBe(200)
			})

			it('generates unique object names using crypto.randomUUID', async () => {
				const mockImageResponse = {
					ok: true,
					headers: new Headers({ 'content-type': 'image/jpeg' }),
					body: new ReadableStream(),
				}

				mockFetch.mockResolvedValue(mockImageResponse)
				mockUploadImage.mockResolvedValue('https://cdn.example.com/processed')

				const request = { ...mockRequest, method: 'POST' }

				await handleExtractBookmarkMetadataRequest({
					request,
					uploadImage: mockUploadImage,
				})

				expect(mockCrypto.randomUUID).toHaveBeenCalledOnce()
				expect(mockUploadImage).toHaveBeenCalledWith(
					expect.anything(),
					expect.anything(),
					'bookmark-image-test-uuid-123'
				)
				expect(mockUploadImage).toHaveBeenCalledWith(
					expect.anything(),
					expect.anything(),
					'bookmark-favicon-test-uuid-123'
				)
			})

			it('updates metadata with uploaded image URLs', async () => {
				const mockImageResponse = {
					ok: true,
					headers: new Headers({ 'content-type': 'image/jpeg' }),
					body: new ReadableStream(),
				}

				mockFetch.mockResolvedValue(mockImageResponse)
				mockUploadImage
					.mockResolvedValueOnce('https://cdn.example.com/processed-image')
					.mockResolvedValueOnce('https://cdn.example.com/processed-favicon')

				const request = { ...mockRequest, method: 'POST' }

				const response = await handleExtractBookmarkMetadataRequest({
					request,
					uploadImage: mockUploadImage,
				})

				const result = (await response.json()) as any

				expect(result.image).toBe('https://cdn.example.com/processed-image')
				expect(result.favicon).toBe('https://cdn.example.com/processed-favicon')
			})
		})

		describe('response format', () => {
			it('returns JSON response with metadata', async () => {
				const mockMetadata = {
					title: 'Test Page',
					description: 'Test Description',
				}

				vi.mocked(parseRequestQuery).mockReturnValue({ url: 'https://example.com' })
				vi.mocked(unfurl).mockResolvedValue({
					ok: true,
					value: mockMetadata,
				})

				const response = await handleExtractBookmarkMetadataRequest({ request: mockRequest })

				expect(response).toBeInstanceOf(Response)
				expect(response.headers.get('content-type')).toContain('application/json')

				const result = await response.json()
				expect(result).toEqual(mockMetadata)
			})

			it('preserves all metadata fields', async () => {
				const mockMetadata = {
					title: 'Test Page',
					description: 'Test Description',
					image: 'https://example.com/image.jpg',
					favicon: 'https://example.com/favicon.ico',
					author: 'Test Author',
					publisher: 'Test Publisher',
					url: 'https://example.com',
				}

				vi.mocked(parseRequestQuery).mockReturnValue({ url: 'https://example.com' })
				vi.mocked(unfurl).mockResolvedValue({
					ok: true,
					value: mockMetadata,
				})

				const response = await handleExtractBookmarkMetadataRequest({ request: mockRequest })
				const result = await response.json()

				expect(result).toEqual(mockMetadata)
			})
		})
	})

	describe('integration scenarios', () => {
		it('handles complete bookmark extraction workflow', async () => {
			const testUrl = 'https://blog.example.com/article'
			const mockMetadata = {
				title: 'Amazing Blog Post',
				description: 'This is an amazing blog post about technology',
				image: 'https://blog.example.com/hero.jpg',
				favicon: 'https://blog.example.com/favicon.png',
				author: 'John Doe',
			}

			vi.mocked(parseRequestQuery).mockReturnValue({ url: testUrl })
			vi.mocked(unfurl).mockResolvedValue({
				ok: true,
				value: mockMetadata,
			})

			const mockImageResponse = {
				ok: true,
				headers: new Headers({ 'content-type': 'image/jpeg' }),
				body: new ReadableStream(),
			}

			mockFetch.mockResolvedValue(mockImageResponse)

			const mockUploadImage = vi
				.fn()
				.mockResolvedValueOnce('https://cdn.example.com/optimized-hero.jpg')
				.mockResolvedValueOnce('https://cdn.example.com/optimized-favicon.png')

			const request = { method: 'POST', query: { url: testUrl } } as any

			const response = await handleExtractBookmarkMetadataRequest({
				request,
				uploadImage: mockUploadImage,
			})

			const result = await response.json()

			// Verify the complete workflow
			expect(parseRequestQuery).toHaveBeenCalledWith(request, expect.any(Object))
			expect(unfurl).toHaveBeenCalledWith(testUrl)
			expect(mockFetch).toHaveBeenCalledTimes(2)
			expect(mockUploadImage).toHaveBeenCalledTimes(2)

			expect(result).toEqual({
				title: 'Amazing Blog Post',
				description: 'This is an amazing blog post about technology',
				image: 'https://cdn.example.com/optimized-hero.jpg',
				favicon: 'https://cdn.example.com/optimized-favicon.png',
				author: 'John Doe',
			})
		})

		it('handles partial failure in image processing', async () => {
			const mockMetadata = {
				title: 'Test Page',
				image: 'https://example.com/image.jpg',
				favicon: 'https://example.com/favicon.ico',
			}

			vi.mocked(parseRequestQuery).mockReturnValue({ url: 'https://example.com' })
			vi.mocked(unfurl).mockResolvedValue({
				ok: true,
				value: mockMetadata,
			})

			// Image succeeds, favicon fails
			mockFetch
				.mockResolvedValueOnce({
					ok: true,
					headers: new Headers({ 'content-type': 'image/jpeg' }),
					body: new ReadableStream(),
				})
				.mockResolvedValueOnce({ ok: false, status: 404 })

			const mockUploadImage = vi.fn().mockResolvedValue('https://cdn.example.com/processed-image')

			const request = { method: 'POST', query: { url: 'https://example.com' } } as any

			const response = await handleExtractBookmarkMetadataRequest({
				request,
				uploadImage: mockUploadImage,
			})

			const result = (await response.json()) as any

			// Image should be processed, favicon should remain original
			expect(result.image).toBe('https://cdn.example.com/processed-image')
			expect(result.favicon).toBe('https://example.com/favicon.ico')
			expect(mockUploadImage).toHaveBeenCalledTimes(1)
		})
	})

	describe('edge cases and error handling', () => {
		it('handles empty metadata gracefully', async () => {
			vi.mocked(parseRequestQuery).mockReturnValue({ url: 'https://example.com' })
			vi.mocked(unfurl).mockResolvedValue({
				ok: true,
				value: {},
			})

			const response = await handleExtractBookmarkMetadataRequest({ request: mockRequest })
			const result = await response.json()

			expect(result).toEqual({})
			expect(response.status).toBe(200)
		})

		it('handles metadata with null/undefined values', async () => {
			const mockMetadata = {
				title: 'Test Page',
				description: undefined,
				image: undefined,
				favicon: '',
			}

			vi.mocked(parseRequestQuery).mockReturnValue({ url: 'https://example.com' })
			vi.mocked(unfurl).mockResolvedValue({
				ok: true,
				value: mockMetadata,
			})

			const response = await handleExtractBookmarkMetadataRequest({ request: mockRequest })
			const result = await response.json()

			expect(result).toEqual(mockMetadata)
		})

		it('handles concurrent image processing failures', async () => {
			const mockMetadata = {
				title: 'Test Page',
				image: 'https://example.com/image.jpg',
				favicon: 'https://example.com/favicon.ico',
			}

			vi.mocked(parseRequestQuery).mockReturnValue({ url: 'https://example.com' })
			vi.mocked(unfurl).mockResolvedValue({
				ok: true,
				value: mockMetadata,
			})

			// Both image requests fail
			mockFetch.mockRejectedValue(new Error('Network error'))

			const mockUploadImage = vi.fn()
			const request = { method: 'POST', query: { url: 'https://example.com' } } as any

			const response = await handleExtractBookmarkMetadataRequest({
				request,
				uploadImage: mockUploadImage,
			})

			// Should still return successful response with original URLs
			expect(response.status).toBe(200)
			const result = (await response.json()) as any
			expect(result.image).toBe('https://example.com/image.jpg')
			expect(result.favicon).toBe('https://example.com/favicon.ico')

			// Should log errors
			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining('Error saving image:'),
				expect.objectContaining({ message: 'Network error' })
			)
			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining('Error saving favicon:'),
				expect.objectContaining({ message: 'Network error' })
			)
		})

		it('maintains original metadata structure when image processing fails', async () => {
			const mockMetadata = {
				title: 'Test Page',
				description: 'Test description',
				image: 'https://example.com/image.jpg',
				favicon: 'https://example.com/favicon.ico',
				author: 'Test Author',
				customField: 'Custom Value',
			}

			vi.mocked(parseRequestQuery).mockReturnValue({ url: 'https://example.com' })
			vi.mocked(unfurl).mockResolvedValue({
				ok: true,
				value: { ...mockMetadata }, // Spread to ensure we're not modifying the original
			})

			mockFetch.mockRejectedValue(new Error('Image processing failed'))

			const mockUploadImage = vi.fn()
			const request = { method: 'POST', query: { url: 'https://example.com' } } as any

			const response = await handleExtractBookmarkMetadataRequest({
				request,
				uploadImage: mockUploadImage,
			})

			const result = await response.json()

			// All metadata should be preserved, including custom fields
			expect(result).toEqual(mockMetadata)
		})
	})
})
