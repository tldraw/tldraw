import { MAX_THUMBNAIL_PAGES } from '@tldraw/dotcom-shared'
import { defaultTldrawOptions } from 'tldraw'
import { describe, expect, it } from 'vitest'

describe('MAX_THUMBNAIL_PAGES', () => {
	// The MCP board-info tool enumerates a board's pages in the sync worker, which parses the room
	// snapshot directly and has no editor instance — so it caps enumeration with MAX_THUMBNAIL_PAGES
	// rather than reading editor.options.maxPages. The worker also can't depend on @tldraw/editor (a
	// React/DOM package), so the value is duplicated in @tldraw/dotcom-shared. This test guards that
	// duplicate: if the SDK's default maxPages ever changes, MAX_THUMBNAIL_PAGES must be updated to
	// match, otherwise the tool would silently truncate the page list of a full board.
	it('matches the tldraw SDK default maxPages', () => {
		expect(MAX_THUMBNAIL_PAGES).toBe(defaultTldrawOptions.maxPages)
	})
})
