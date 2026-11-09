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

// Mock global fetch
const mockFetch = vi.fn()
Object.defineProperty(global, 'fetch', {
	value: mockFetch,
	writable: true,
})

// Mock crypto for image upload tests
Object.defineProperty(global, 'crypto', {
	value: { randomUUID: vi.fn(() => 'test-uuid-123') },
	writable: true,
})

// Import mocked modules
const { unfurl } = await import('cloudflare-workers-unfurl')
const { parseRequestQuery } = await import('./handleRequest')

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
		it('throws validation error for invalid URL', async () => {
			const validationError = new StatusError(400, 'Query parameters: Invalid URL')
			vi.mocked(parseRequestQuery).mockImplementation(() => {
				throw validationError
			})

			await expect(handleExtractBookmarkMetadataRequest({ request: mockRequest })).rejects.toThrow(
				validationError
			)
		})

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

			await expect(handleExtractBookmarkMetadataRequest({ request: mockRequest })).rejects.toThrow(
				new StatusError(400, 'Bad URL')
			)
		})

		it('handles unfurl failed-fetch error', async () => {
			vi.mocked(parseRequestQuery).mockReturnValue({ url: 'https://example.com' })
			vi.mocked(unfurl).mockResolvedValue({
				ok: false,
				error: 'failed-fetch',
			})

			await expect(handleExtractBookmarkMetadataRequest({ request: mockRequest })).rejects.toThrow(
				new StatusError(422, 'Failed to fetch URL')
			)
		})

		it('processes images when uploadImage is provided', async () => {
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

			const mockImageResponse = {
				ok: true,
				headers: new Headers({ 'content-type': 'image/jpeg' }),
				body: new ReadableStream(),
			}

			mockFetch.mockResolvedValue(mockImageResponse)
			const mockUploadImage = vi
				.fn()
				.mockResolvedValueOnce('https://cdn.example.com/processed-image')
				.mockResolvedValueOnce('https://cdn.example.com/processed-favicon')

			const request = { ...mockRequest, method: 'POST' }

			const response = await handleExtractBookmarkMetadataRequest({
				request,
				uploadImage: mockUploadImage,
			})

			const result = (await response.json()) as any

			// Should update metadata with processed image URLs
			expect(result.image).toBe('https://cdn.example.com/processed-image')
			// Hosts like Wikimedia refuse an image request with no user agent.
			for (const [, init] of mockFetch.mock.calls) {
				expect(init.headers['user-agent']).toMatch(/^tldraw-bot\//)
			}
			expect(result.favicon).toBe('https://cdn.example.com/processed-favicon')
		})

		it('skips image processing when URLs are not present', async () => {
			const metadataWithoutImages = { title: 'Test Page' }
			vi.mocked(parseRequestQuery).mockReturnValue({ url: 'https://example.com' })
			vi.mocked(unfurl).mockResolvedValue({
				ok: true,
				value: metadataWithoutImages,
			})

			const mockUploadImage = vi.fn()
			const request = { ...mockRequest, method: 'POST' }

			await handleExtractBookmarkMetadataRequest({
				request,
				uploadImage: mockUploadImage,
			})

			expect(mockFetch).not.toHaveBeenCalled()
			expect(mockUploadImage).not.toHaveBeenCalled()
		})

		it('handles image processing failures gracefully', async () => {
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

			mockFetch.mockResolvedValue({ ok: false, status: 404 })

			const mockUploadImage = vi.fn()
			const request = { ...mockRequest, method: 'POST' }

			const response = await handleExtractBookmarkMetadataRequest({
				request,
				uploadImage: mockUploadImage,
			})

			// Should not throw, should continue with original metadata
			expect(response.status).toBe(200)
			const result = await response.json()
			expect(result).toEqual(mockMetadata)
		})
	})

	it('handles complete bookmark extraction workflow with image processing', async () => {
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

		expect(result).toEqual({
			title: 'Amazing Blog Post',
			description: 'This is an amazing blog post about technology',
			image: 'https://cdn.example.com/optimized-hero.jpg',
			favicon: 'https://cdn.example.com/optimized-favicon.png',
			author: 'John Doe',
		})
	})

	describe('YouTube pages without a title or image', () => {
		const video = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
		const oembed = (body: object, ok = true) => ({ ok, json: async () => body })
		const unfurlTo = (url: string, value: object) => {
			vi.mocked(parseRequestQuery).mockReturnValue({ url })
			vi.mocked(unfurl).mockResolvedValue({ ok: true, value } as any)
		}
		const extract = async () =>
			(await handleExtractBookmarkMetadataRequest({ request: mockRequest })).json()

		it('takes them from YouTube’s oEmbed endpoint', async () => {
			unfurlTo(video, { title: '', description: 'A video' })
			mockFetch.mockResolvedValueOnce(
				oembed({ title: 'Never Gonna Give You Up', thumbnail_url: 'https://i.ytimg.com/vi/1.jpg' })
			)
			expect(await extract()).toEqual({
				title: 'Never Gonna Give You Up',
				description: 'A video',
				image: 'https://i.ytimg.com/vi/1.jpg',
			})
			expect(mockFetch).toHaveBeenCalledWith(
				`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(video)}`,
				expect.objectContaining({
					headers: { 'user-agent': expect.stringMatching(/^tldraw-bot\//) },
				})
			)
		})

		it('keeps what the page gave, without asking', async () => {
			unfurlTo(video, { title: 'From the page', image: 'https://i.ytimg.com/page.jpg' })
			expect(await extract()).toEqual({
				title: 'From the page',
				image: 'https://i.ytimg.com/page.jpg',
			})
			expect(mockFetch).not.toHaveBeenCalled()
		})

		it('asks only YouTube, short links included', async () => {
			unfurlTo('https://example.com/video', { title: '' })
			await extract()
			expect(mockFetch).not.toHaveBeenCalled()

			unfurlTo('https://youtu.be/dQw4w9WgXcQ', { title: '' })
			mockFetch.mockResolvedValueOnce(oembed({ title: 'Short link' }))
			expect(await extract()).toEqual({ title: 'Short link' })
		})

		it('leaves them empty when oEmbed fails or its image is not a web URL', async () => {
			unfurlTo(video, { title: '' })
			mockFetch.mockResolvedValueOnce(oembed({}, false))
			expect(await extract()).toEqual({ title: '' })
			mockFetch.mockResolvedValueOnce(oembed({ thumbnail_url: 'javascript:alert(1)' }))
			expect(await extract()).toEqual({ title: '' })
			mockFetch.mockRejectedValueOnce(new Error('timed out'))
			expect(await extract()).toEqual({ title: '' })
		})

		it('copies the oEmbed image like a page’s own when uploading', async () => {
			unfurlTo(video, {})
			mockFetch.mockResolvedValueOnce(oembed({ thumbnail_url: 'https://i.ytimg.com/vi/1.jpg' }))
			mockFetch.mockResolvedValueOnce({
				ok: true,
				headers: new Headers({ 'content-type': 'image/jpeg' }),
				body: new ReadableStream(),
			})
			const uploadImage = vi.fn().mockResolvedValue('https://cdn.example.com/copy')
			const response = await handleExtractBookmarkMetadataRequest({
				request: { ...mockRequest, method: 'POST' },
				uploadImage,
			})
			expect(((await response.json()) as any).image).toBe('https://cdn.example.com/copy')
			expect(mockFetch).toHaveBeenLastCalledWith('https://i.ytimg.com/vi/1.jpg', expect.anything())
		})
	})
})
