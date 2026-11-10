import { copyEventMetadata, createCopyEvent } from './copy-event'

test.each([
	['/', 'homepage'],
	['/quick-start', 'docs'],
	['/reference/editor', 'docs'],
	['/sdk-features/shapes', 'docs'],
	['/pricing', 'marketing'],
])('classifies %s independently of the legacy page category', (path, section) => {
	;(globalThis as any).jsdom.reconfigure({ url: `https://tldraw.dev${path}?email=secret#identity` })
	const event = createCopyEvent({
		page_category: 'tldraw.dev',
		text_snippet: 'private text',
		user_email: 'secret@example.com',
	})
	expect(event.page_section).toBe(section)
	expect(event.page_url).toBe(`https://tldraw.dev${path}`)
	expect(JSON.stringify(copyEventMetadata(event))).not.toMatch(
		/private text|secret|identity|user_email|text_snippet/
	)
})

test('uses the captured page after async navigation and preserves the copy kind', () => {
	;(globalThis as any).jsdom.reconfigure({ url: 'https://tldraw.dev/pricing' })
	const event = createCopyEvent({
		page_category: 'docs',
		text_snippet: 'sample',
		page_url: 'https://tldraw.dev/quick-start?x=1',
		copy_kind: 'page_markdown',
	})
	expect(event).toMatchObject({
		page_url: 'https://tldraw.dev/quick-start',
		page_section: 'docs',
		copy_kind: 'page_markdown',
	})
})
