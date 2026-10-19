import { normalizeLinkUrl } from './linkUrl'

describe('normalizeLinkUrl', () => {
	it.each([
		['https://tldraw.com', 'https://tldraw.com'],
		['http://tldraw.com', 'http://tldraw.com'],
		['  https://tldraw.com  ', 'https://tldraw.com'],
		['https://https://tldraw.com', 'https://tldraw.com'],
		['mailto:hello@tldraw.com', 'mailto:hello@tldraw.com'],
		['vscode://file/src/index.ts', 'vscode://file/src/index.ts'],
		['codex://threads/abc-123', 'codex://threads/abc-123'],
		['spotify:track:abc', 'spotify:track:abc'],
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
		['127.0.0.1', 'https://127.0.0.1'],
		['hello@tldraw.com', 'mailto:hello@tldraw.com'],
	])('completes a bare host or email: %j', (input, expected) => {
		expect(normalizeLinkUrl(input)).toBe(expected)
	})

	it.each([
		'hello',
		'hello world',
		'tldraw.',
		'someapp://open',
		'javascript:alert(1)',
		'javascript://%0aalert(1)',
		'data:text/html,hi',
		'file:///etc/passwd',
		'user:pass@tldraw.com',
	])('rejects %j', (input) => {
		expect(normalizeLinkUrl(input)).toBeNull()
	})
})
