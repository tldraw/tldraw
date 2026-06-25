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
	})

	test('escapes names so they cannot break out of the meta attributes', () => {
		const html = renderSocialPreview('<script>"&')
		expect(html).toContain(
			'<meta property="og:title" content="&lt;script&gt;&quot;&amp; • tldraw.com" />'
		)
		expect(html).not.toContain('<script>')
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
