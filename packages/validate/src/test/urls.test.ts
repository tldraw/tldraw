import * as T from '../lib/validation'

describe('§15 URL validators', () => {
	it('[UR1] linkUrl accepts the empty string and http/https/mailto urls', () => {
		expect(T.linkUrl.validate('')).toBe('')
		expect(T.linkUrl.validate('https://example.com')).toBe('https://example.com')
		expect(T.linkUrl.validate('http://example.com')).toBe('http://example.com')
		expect(T.linkUrl.validate('mailto:user@example.com')).toBe('mailto:user@example.com')

		expect(() => T.linkUrl.validate('javascript:alert(1)')).toThrow(
			'Expected a valid url, got "javascript:alert(1)" (invalid protocol)'
		)
		expect(() => T.linkUrl.validate('asset:abc')).toThrow('(invalid protocol)')
		expect(() => T.linkUrl.validate('not a url')).toThrow('Expected a valid url, got "not a url"')
	})

	it('[UR2] srcUrl accepts the empty string and http/https/data/asset urls', () => {
		expect(T.srcUrl.validate('')).toBe('')
		expect(T.srcUrl.validate('https://example.com/image.png')).toBe('https://example.com/image.png')
		expect(T.srcUrl.validate('data:image/png;base64,iVBORw0')).toBe('data:image/png;base64,iVBORw0')
		expect(T.srcUrl.validate('asset:abc123')).toBe('asset:abc123')

		expect(() => T.srcUrl.validate('mailto:user@example.com')).toThrow('(invalid protocol)')
		expect(() => T.srcUrl.validate('javascript:alert(1)')).toThrow('(invalid protocol)')
	})

	it('[UR3] httpUrl accepts the empty string and only http/https urls', () => {
		expect(T.httpUrl.validate('')).toBe('')
		expect(T.httpUrl.validate('https://api.example.com')).toBe('https://api.example.com')
		expect(T.httpUrl.validate('http://localhost:3000')).toBe('http://localhost:3000')

		expect(() => T.httpUrl.validate('ftp://files.example.com')).toThrow('(invalid protocol)')
		expect(() => T.httpUrl.validate('mailto:user@example.com')).toThrow('(invalid protocol)')
		expect(() => T.httpUrl.validate('data:text/plain,hi')).toThrow('(invalid protocol)')
	})

	it('[UR4] strings starting with / or ./ validate; other relative forms do not', () => {
		expect(T.linkUrl.validate('/foo')).toBe('/foo')
		expect(T.linkUrl.validate('./foo')).toBe('./foo')
		expect(T.srcUrl.validate('/foo')).toBe('/foo')
		expect(T.srcUrl.validate('./foo')).toBe('./foo')
		expect(T.httpUrl.validate('/foo')).toBe('/foo')
		expect(T.httpUrl.validate('./foo')).toBe('./foo')

		expect(() => T.linkUrl.validate('../foo')).toThrow('Expected a valid url, got "../foo"')
		expect(() => T.linkUrl.validate('foo')).toThrow('Expected a valid url, got "foo"')
	})

	it('[UR5] protocol matching is case-insensitive', () => {
		expect(T.linkUrl.validate('HTTP://example.com')).toBe('HTTP://example.com')
		expect(() => T.linkUrl.validate('JAVASCRIPT:alert(1)')).toThrow('(invalid protocol)')
	})

	it('[UR6] non-strings are rejected as strings', () => {
		expect(() => T.linkUrl.validate(5)).toThrow('Expected string, got a number')
		expect(() => T.srcUrl.validate(null)).toThrow('Expected string, got null')
		expect(() => T.httpUrl.validate(undefined)).toThrow('Expected string, got undefined')
	})
})
