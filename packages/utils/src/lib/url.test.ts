import { describe, expect, it } from 'vitest'
import { safeParseUrl } from './url'

describe('safeParseUrl', () => {
	it('returns URL object for valid absolute URLs', () => {
		const result = safeParseUrl('https://example.com/path')

		expect(result).toBeInstanceOf(URL)
		expect(result?.href).toBe('https://example.com/path')
	})

	it('resolves relative URLs with base URL', () => {
		const result = safeParseUrl('/path', 'https://example.com')

		expect(result).toBeInstanceOf(URL)
		expect(result?.href).toBe('https://example.com/path')
	})

	it('accepts URL object as base URL', () => {
		const baseUrl = new URL('https://example.com')
		const result = safeParseUrl('/path', baseUrl)

		expect(result).toBeInstanceOf(URL)
		expect(result?.href).toBe('https://example.com/path')
	})

	it('returns undefined for invalid URLs', () => {
		expect(safeParseUrl('')).toBeUndefined()
		expect(safeParseUrl('not-a-url')).toBeUndefined()
		expect(safeParseUrl('https://exam ple.com')).toBeUndefined()
	})

	it('returns undefined when relative URL has no base', () => {
		const result = safeParseUrl('/relative/path')

		expect(result).toBeUndefined()
	})

	it('returns undefined when base URL is invalid', () => {
		const result = safeParseUrl('/path', 'not-a-base-url')

		expect(result).toBeUndefined()
	})
})
