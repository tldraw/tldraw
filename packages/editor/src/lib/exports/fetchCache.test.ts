import { vi } from 'vitest'
import { fetchCache } from './fetchCache'

describe('fetchCache', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('caches successes but retries after a failure', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {})
		const fetchSpy = vi
			.spyOn(window, 'fetch')
			.mockResolvedValueOnce({ ok: false } as Response)
			.mockResolvedValue({ ok: true, text: async () => 'hello' } as Response)
		const fetchText = fetchCache((response) => response.text())

		expect(await fetchText('https://example.com/a')).toBe(null)
		expect(await fetchText('https://example.com/a')).toBe('hello')
		expect(await fetchText('https://example.com/a')).toBe('hello')
		expect(fetchSpy).toHaveBeenCalledTimes(2)
	})
})
