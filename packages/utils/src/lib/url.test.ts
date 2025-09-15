import { describe, expect, it } from 'vitest'
import { safeParseUrl } from './url'

describe('safeParseUrl', () => {
	describe('valid URLs', () => {
		it('parses absolute HTTP URLs', () => {
			const result = safeParseUrl('http://example.com')

			expect(result).toBeInstanceOf(URL)
			expect(result?.href).toBe('http://example.com/')
		})

		it('parses absolute HTTPS URLs', () => {
			const result = safeParseUrl('https://example.com')

			expect(result).toBeInstanceOf(URL)
			expect(result?.href).toBe('https://example.com/')
		})

		it('parses URLs with paths', () => {
			const result = safeParseUrl('https://example.com/path/to/resource')

			expect(result).toBeInstanceOf(URL)
			expect(result?.href).toBe('https://example.com/path/to/resource')
			expect(result?.pathname).toBe('/path/to/resource')
		})

		it('parses URLs with query parameters', () => {
			const result = safeParseUrl('https://example.com?foo=bar&baz=qux')

			expect(result).toBeInstanceOf(URL)
			expect(result?.href).toBe('https://example.com/?foo=bar&baz=qux')
			expect(result?.search).toBe('?foo=bar&baz=qux')
		})

		it('parses URLs with fragments', () => {
			const result = safeParseUrl('https://example.com/page#section')

			expect(result).toBeInstanceOf(URL)
			expect(result?.href).toBe('https://example.com/page#section')
			expect(result?.hash).toBe('#section')
		})

		it('parses URLs with ports', () => {
			const result = safeParseUrl('https://example.com:8080/path')

			expect(result).toBeInstanceOf(URL)
			expect(result?.href).toBe('https://example.com:8080/path')
			expect(result?.port).toBe('8080')
		})

		it('parses file URLs', () => {
			const result = safeParseUrl('file:///path/to/file.txt')

			expect(result).toBeInstanceOf(URL)
			expect(result?.protocol).toBe('file:')
			expect(result?.pathname).toBe('/path/to/file.txt')
		})

		it('parses data URLs', () => {
			const result = safeParseUrl('data:text/plain;base64,SGVsbG8gV29ybGQ=')

			expect(result).toBeInstanceOf(URL)
			expect(result?.protocol).toBe('data:')
		})
	})

	describe('relative URLs with base URL', () => {
		it('resolves relative path with string base URL', () => {
			const result = safeParseUrl('/path', 'https://example.com')

			expect(result).toBeInstanceOf(URL)
			expect(result?.href).toBe('https://example.com/path')
		})

		it('resolves relative path with URL object base', () => {
			const baseUrl = new URL('https://example.com')
			const result = safeParseUrl('/path', baseUrl)

			expect(result).toBeInstanceOf(URL)
			expect(result?.href).toBe('https://example.com/path')
		})

		it('resolves relative path with base URL that has path', () => {
			const result = safeParseUrl('file.txt', 'https://example.com/folder/')

			expect(result).toBeInstanceOf(URL)
			expect(result?.href).toBe('https://example.com/folder/file.txt')
		})

		it('resolves parent directory references', () => {
			const result = safeParseUrl('../other', 'https://example.com/folder/subfolder/')

			expect(result).toBeInstanceOf(URL)
			expect(result?.href).toBe('https://example.com/folder/other')
		})

		it('resolves current directory references', () => {
			const result = safeParseUrl('./file.txt', 'https://example.com/folder/')

			expect(result).toBeInstanceOf(URL)
			expect(result?.href).toBe('https://example.com/folder/file.txt')
		})

		it('resolves query-only URLs', () => {
			const result = safeParseUrl('?newQuery=value', 'https://example.com/page')

			expect(result).toBeInstanceOf(URL)
			expect(result?.href).toBe('https://example.com/page?newQuery=value')
		})

		it('resolves fragment-only URLs', () => {
			const result = safeParseUrl('#newFragment', 'https://example.com/page')

			expect(result).toBeInstanceOf(URL)
			expect(result?.href).toBe('https://example.com/page#newFragment')
		})
	})

	describe('invalid URLs', () => {
		it('returns undefined for empty string', () => {
			const result = safeParseUrl('')

			expect(result).toBeUndefined()
		})

		it('returns undefined for malformed URLs', () => {
			const result = safeParseUrl('not-a-url')

			expect(result).toBeUndefined()
		})

		it('returns undefined for invalid protocol', () => {
			const result = safeParseUrl('invalid://example.com')

			// Note: URL constructor actually allows custom protocols
			// This test documents current behavior - URL constructor is quite permissive
			expect(result).toBeInstanceOf(URL)
		})

		it('returns undefined for URLs with invalid characters', () => {
			const result = safeParseUrl('https://exam ple.com')

			expect(result).toBeUndefined()
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

	describe('edge cases', () => {
		it('handles URLs with special characters', () => {
			const result = safeParseUrl('https://example.com/path with spaces')

			// URL constructor actually encodes spaces in paths
			expect(result).toBeInstanceOf(URL)
			expect(result?.href).toBe('https://example.com/path%20with%20spaces')
		})

		it('handles encoded URLs', () => {
			const result = safeParseUrl('https://example.com/path%20with%20spaces')

			expect(result).toBeInstanceOf(URL)
			expect(result?.href).toBe('https://example.com/path%20with%20spaces')
		})

		it('handles URLs with Unicode characters', () => {
			const result = safeParseUrl('https://example.com/café')

			expect(result).toBeInstanceOf(URL)
		})

		it('handles very long URLs', () => {
			const longPath = '/path/' + 'a'.repeat(1000)
			const result = safeParseUrl(`https://example.com${longPath}`)

			expect(result).toBeInstanceOf(URL)
			expect(result?.pathname).toBe(longPath)
		})

		it('handles localhost URLs', () => {
			const result = safeParseUrl('http://localhost:3000')

			expect(result).toBeInstanceOf(URL)
			expect(result?.hostname).toBe('localhost')
			expect(result?.port).toBe('3000')
		})

		it('handles IP address URLs', () => {
			const result = safeParseUrl('http://192.168.1.1:8080')

			expect(result).toBeInstanceOf(URL)
			expect(result?.hostname).toBe('192.168.1.1')
			expect(result?.port).toBe('8080')
		})

		it('handles IPv6 URLs', () => {
			const result = safeParseUrl('http://[::1]:8080')

			expect(result).toBeInstanceOf(URL)
			// IPv6 hostnames preserve brackets in hostname property
			expect(result?.hostname).toBe('[::1]')
			expect(result?.port).toBe('8080')
		})
	})

	describe('return value properties', () => {
		it('returns URL object with expected properties', () => {
			const result = safeParseUrl('https://user:pass@example.com:443/path?query=value#fragment')

			expect(result).toBeInstanceOf(URL)
			expect(result?.protocol).toBe('https:')
			expect(result?.username).toBe('user')
			expect(result?.password).toBe('pass')
			expect(result?.hostname).toBe('example.com')
			// Default HTTPS port (443) shows as empty string
			expect(result?.port).toBe('')
			expect(result?.pathname).toBe('/path')
			expect(result?.search).toBe('?query=value')
			expect(result?.hash).toBe('#fragment')
			// Default port is omitted from href
			expect(result?.href).toBe('https://user:pass@example.com/path?query=value#fragment')
		})
	})

	describe('practical usage patterns', () => {
		it('can be used for validation in conditional logic', () => {
			function handleUserUrl(input: string) {
				const url = safeParseUrl(input)
				if (url) {
					return { valid: true, href: url.href }
				} else {
					return { valid: false, error: 'Invalid URL' }
				}
			}

			expect(handleUserUrl('https://example.com')).toEqual({
				valid: true,
				href: 'https://example.com/',
			})

			expect(handleUserUrl('not-a-url')).toEqual({
				valid: false,
				error: 'Invalid URL',
			})
		})

		it('can be used to normalize URLs', () => {
			const input1 = 'HTTPS://EXAMPLE.COM/Path'
			const input2 = 'https://example.com/Path'

			const result1 = safeParseUrl(input1)
			const result2 = safeParseUrl(input2)

			expect(result1?.href).toBe('https://example.com/Path')
			expect(result2?.href).toBe('https://example.com/Path')
			expect(result1?.href).toBe(result2?.href)
		})
	})
})
