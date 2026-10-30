import { normalizeLinkUrl } from './linkUrl'

describe('normalizeLinkUrl', () => {
	it.each([
		['https://tldraw.com', 'https://tldraw.com'],
		['  https://tldraw.com  ', 'https://tldraw.com'],
		['https://https://tldraw.com', 'https://tldraw.com'],
		['mailto:hello@tldraw.com', 'mailto:hello@tldraw.com'],
		['vscode://file/src/index.ts', 'vscode://file/src/index.ts'],
		['/relative/path', '/relative/path'],
		['', ''],
	])('keeps a valid link as typed: %j', (input, expected) => {
		expect(normalizeLinkUrl(input)).toBe(expected)
	})

	it.each([
		['tldraw.com', 'https://tldraw.com'],
		['www.tldraw.com/docs?x=1#y', 'https://www.tldraw.com/docs?x=1#y'],
		['httpbin.org', 'https://httpbin.org'],
		['example.com:8080', 'https://example.com:8080'],
		['localhost:3000', 'https://localhost:3000'],
		['hello@tldraw.com', 'mailto:hello@tldraw.com'],
	])('completes a bare host or email: %j', (input, expected) => {
		expect(normalizeLinkUrl(input)).toBe(expected)
	})

	it.each(['hello', 'hello world', 'tldraw.', 'javascript:alert(1)', 'user@tldraw.com:8080'])(
		'rejects %j',
		(input) => {
			expect(normalizeLinkUrl(input)).toBeNull()
		}
	)
})
