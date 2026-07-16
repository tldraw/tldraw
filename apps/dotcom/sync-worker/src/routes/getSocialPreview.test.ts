import { RoomSnapshot } from '@tldraw/sync-core'
import { getDocumentNameFromSnapshot, renderSocialPreview } from './getSocialPreview'

function snapshotWithDocumentName(name: string): RoomSnapshot {
	return {
		schema: {} as any,
		clock: 0,
		documents: [
			{
				state: { typeName: 'document', id: 'document:document', name, meta: {} } as any,
				lastChangedClock: 0,
			},
			{
				state: { typeName: 'shape', id: 'shape:a' } as any,
				lastChangedClock: 0,
			},
		],
		tombstones: {},
	}
}

describe('renderSocialPreview', () => {
	test('uses "<name> • tldraw.com" as the title when there is a name', () => {
		const html = renderSocialPreview('My board')
		expect(html).toContain('<title>My board • tldraw.com</title>')
		expect(html).toContain('<meta property="og:title" content="My board • tldraw.com" />')
		expect(html).toContain('<meta name="twitter:title" content="My board • tldraw.com" />')
	})

	test('falls back to "tldraw.com" when there is no name', () => {
		const html = renderSocialPreview(null)
		expect(html).toContain('<title>tldraw.com</title>')
		expect(html).toContain('<meta property="og:title" content="tldraw.com" />')
	})

	test('keeps the shared description and image', () => {
		const html = renderSocialPreview('My board')
		expect(html).toContain('A free and instant collaborative whiteboarding tool.')
		expect(html).toContain('https://www.tldraw.com/social-og.png')
		expect(html).toContain('<meta name="twitter:card" content="summary" />')
	})

	test('uses the board og-image with a large card when a board image URL is given', () => {
		const html = renderSocialPreview(
			'My board',
			'https://www.tldraw.com/api/app/og-image/f/board-slug'
		)
		expect(html).toContain(
			'<meta property="og:image" content="https://www.tldraw.com/api/app/og-image/f/board-slug" />'
		)
		expect(html).toContain(
			'<meta name="twitter:image" content="https://www.tldraw.com/api/app/og-image/f/board-slug" />'
		)
		expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />')
		expect(html).toContain('<meta property="og:image:width" content="1200" />')
		expect(html).toContain('<meta property="og:image:height" content="630" />')
		expect(html).not.toContain('https://www.tldraw.com/social-og.png')
		expect(html).not.toContain('https://www.tldraw.com/social-twitter.png')
	})

	test('escapes the board image URL in the meta attributes', () => {
		const html = renderSocialPreview('My board', 'https://example.com/og?a=1&b="2"')
		expect(html).toContain('content="https://example.com/og?a=1&amp;b=&quot;2&quot;"')
	})

	test('escapes names so they cannot break out of the meta attributes', () => {
		const html = renderSocialPreview('<script>"&')
		expect(html).toContain(
			'<meta property="og:title" content="&lt;script&gt;&quot;&amp; • tldraw.com" />'
		)
		expect(html).not.toContain('<script>"&')
		// the only script in the page is our own bypass redirect
		expect(html.match(/<script>/g)).toHaveLength(1)
	})

	test('redirects humans back to the board with the bypass param', () => {
		// In-app browsers with a crawler token in their user-agent (WhatsApp, Pinterest) get routed
		// here too. The script sends them back to the board; the param makes the Vercel crawler
		// route not match on the second request.
		const html = renderSocialPreview('My board')
		expect(html).toContain(`url.searchParams.set("no_preview", '1')`)
		expect(html).toContain('location.replace(url)')
		expect(html).toContain('<a href="?no_preview=1">Open this board</a>')
		// the redirect is guarded so it can never reload this page forever, even if the
		// routing layer serves the stub to a request that already carries the param
		expect(html).toContain('if (!url.searchParams.get("no_preview"))')
	})
})

describe('getDocumentNameFromSnapshot', () => {
	test('reads the name from the document record', () => {
		expect(getDocumentNameFromSnapshot(snapshotWithDocumentName('My board'))).toBe('My board')
	})

	test('trims surrounding whitespace', () => {
		expect(getDocumentNameFromSnapshot(snapshotWithDocumentName('  My board  '))).toBe('My board')
	})

	test('returns null for an empty or whitespace-only name', () => {
		expect(getDocumentNameFromSnapshot(snapshotWithDocumentName(''))).toBe(null)
		expect(getDocumentNameFromSnapshot(snapshotWithDocumentName('   '))).toBe(null)
	})

	test('returns null when there is no snapshot or document record', () => {
		expect(getDocumentNameFromSnapshot(null)).toBe(null)
		expect(getDocumentNameFromSnapshot(undefined)).toBe(null)
		expect(
			getDocumentNameFromSnapshot({
				schema: {} as any,
				clock: 0,
				documents: [{ state: { typeName: 'shape', id: 'shape:a' } as any, lastChangedClock: 0 }],
				tombstones: {},
			})
		).toBe(null)
	})
})
