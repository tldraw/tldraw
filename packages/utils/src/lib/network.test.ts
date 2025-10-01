import { describe, expect, it, vi } from 'vitest'
import { fetch, Image } from './network'

describe('fetch', () => {
	it('should call window.fetch with referrerPolicy set to strict-origin-when-cross-origin', async () => {
		const mockFetch = vi.spyOn(window, 'fetch').mockResolvedValue(new Response('test'))

		await fetch('https://example.com')

		expect(mockFetch).toHaveBeenCalledWith('https://example.com', {
			referrerPolicy: 'strict-origin-when-cross-origin',
		})
		mockFetch.mockRestore()
	})

	it('should override referrerPolicy if provided in init options', async () => {
		const mockFetch = vi.spyOn(window, 'fetch').mockResolvedValue(new Response('test'))

		const initOptions: RequestInit = {
			referrerPolicy: 'no-referrer',
		}

		await fetch('https://example.com', initOptions)

		expect(mockFetch).toHaveBeenCalledWith('https://example.com', {
			referrerPolicy: 'no-referrer',
		})
		mockFetch.mockRestore()
	})
})

describe('Image', () => {
	it('should create an image with referrerPolicy set to strict-origin-when-cross-origin', () => {
		const img = Image()

		expect(img.referrerPolicy).toBe('strict-origin-when-cross-origin')
	})
})
