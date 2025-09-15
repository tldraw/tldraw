import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetch, Image } from './network'

// Mock window.fetch and window.Image
const mockFetch = vi.fn()
const mockImage = vi.fn()

beforeEach(() => {
	vi.clearAllMocks()

	// Mock window.fetch
	Object.defineProperty(window, 'fetch', {
		value: mockFetch,
		writable: true,
		configurable: true,
	})

	// Mock window.Image constructor
	Object.defineProperty(window, 'Image', {
		value: mockImage,
		writable: true,
		configurable: true,
	})
})

describe('fetch', () => {
	it('should call window.fetch with referrerPolicy set to strict-origin-when-cross-origin', async () => {
		const mockResponse = new Response('test')
		mockFetch.mockResolvedValue(mockResponse)

		const result = await fetch('https://example.com')

		expect(mockFetch).toHaveBeenCalledWith('https://example.com', {
			referrerPolicy: 'strict-origin-when-cross-origin',
		})
		expect(result).toBe(mockResponse)
	})

	it('should merge init options with referrerPolicy', async () => {
		const mockResponse = new Response('test')
		mockFetch.mockResolvedValue(mockResponse)

		const initOptions: RequestInit = {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ test: 'data' }),
		}

		await fetch('https://example.com/api', initOptions)

		expect(mockFetch).toHaveBeenCalledWith('https://example.com/api', {
			referrerPolicy: 'strict-origin-when-cross-origin',
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ test: 'data' }),
		})
	})

	it('should override referrerPolicy if provided in init options', async () => {
		const mockResponse = new Response('test')
		mockFetch.mockResolvedValue(mockResponse)

		const initOptions: RequestInit = {
			referrerPolicy: 'no-referrer',
		}

		await fetch('https://example.com', initOptions)

		expect(mockFetch).toHaveBeenCalledWith('https://example.com', {
			referrerPolicy: 'no-referrer',
		})
	})

	it('should work with Request objects', async () => {
		const mockResponse = new Response('test')
		mockFetch.mockResolvedValue(mockResponse)

		const request = new Request('https://example.com')
		await fetch(request)

		expect(mockFetch).toHaveBeenCalledWith(request, {
			referrerPolicy: 'strict-origin-when-cross-origin',
		})
	})

	it('should work with URL objects', async () => {
		const mockResponse = new Response('test')
		mockFetch.mockResolvedValue(mockResponse)

		const url = new URL('https://example.com')
		await fetch(url)

		expect(mockFetch).toHaveBeenCalledWith(url, {
			referrerPolicy: 'strict-origin-when-cross-origin',
		})
	})

	it('should forward fetch errors', async () => {
		const error = new Error('Network error')
		mockFetch.mockRejectedValue(error)

		await expect(fetch('https://example.com')).rejects.toThrow('Network error')
	})
})

describe('Image', () => {
	beforeEach(() => {
		// Mock the Image constructor to return a mock HTMLImageElement
		mockImage.mockImplementation((width?: number, height?: number) => {
			const img = {
				referrerPolicy: '',
				width: width || 0,
				height: height || 0,
			}
			return img
		})
	})

	it('should create an image with referrerPolicy set to strict-origin-when-cross-origin', () => {
		const img = Image()

		expect(mockImage).toHaveBeenCalledWith(undefined, undefined)
		expect(img.referrerPolicy).toBe('strict-origin-when-cross-origin')
	})

	it('should create an image with specified width', () => {
		const img = Image(100)

		expect(mockImage).toHaveBeenCalledWith(100, undefined)
		expect(img.referrerPolicy).toBe('strict-origin-when-cross-origin')
	})

	it('should create an image with specified width and height', () => {
		const img = Image(100, 200)

		expect(mockImage).toHaveBeenCalledWith(100, 200)
		expect(img.referrerPolicy).toBe('strict-origin-when-cross-origin')
	})

	it('should handle zero dimensions', () => {
		const img = Image(0, 0)

		expect(mockImage).toHaveBeenCalledWith(0, 0)
		expect(img.referrerPolicy).toBe('strict-origin-when-cross-origin')
	})

	it('should handle undefined width but specified height', () => {
		const img = Image(undefined, 200)

		expect(mockImage).toHaveBeenCalledWith(undefined, 200)
		expect(img.referrerPolicy).toBe('strict-origin-when-cross-origin')
	})
})
