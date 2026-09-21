import { MAX_THUMBNAIL_PAGES } from '@tldraw/dotcom-shared'
import {
	Editor,
	createShapeId,
	createTLStore,
	defaultBindingUtils,
	defaultShapeUtils,
	defaultTldrawOptions,
} from 'tldraw'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { prepareLiveCapture } from './thumbnail-render'

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

describe('prepareLiveCapture', () => {
	// jsdom has no ResizeObserver, which the editor's container measurement uses.
	beforeAll(() => {
		globalThis.ResizeObserver ??= class {
			observe() {}
			unobserve() {}
			disconnect() {}
		} as unknown as typeof ResizeObserver
	})

	beforeEach(() => {
		delete document.body.dataset.thumbnailError
		delete document.documentElement.dataset.thumbnailError
	})

	// Two pages, one shape on each, current page is the first.
	function setup() {
		const store = createTLStore({
			shapeUtils: defaultShapeUtils,
			bindingUtils: defaultBindingUtils,
		})
		const editor = new Editor({
			store,
			shapeUtils: defaultShapeUtils,
			bindingUtils: defaultBindingUtils,
			tools: [],
			getContainer: () => document.createElement('div'),
		})
		const renderedPageId = editor.getCurrentPageId()
		editor.createShape({ id: createShapeId('rendered'), type: 'geo', x: 0, y: 0 })
		editor.createPage({ name: 'elsewhere' })
		const otherPageId = editor.getPages().find((page) => page.id !== renderedPageId)!.id
		editor.setCurrentPage(otherPageId)
		const movedId = createShapeId('moved')
		editor.createShape({ id: movedId, type: 'geo', x: 0, y: 0 })
		editor.setCurrentPage(renderedPageId)
		return { editor, movedId, renderedId: createShapeId('rendered') }
	}

	it('prunes to the requested shapes when they are on the rendered page', () => {
		const { editor, renderedId } = setup()
		expect(prepareLiveCapture(editor, [renderedId])).toBe(true)
		expect([...editor.getCurrentPageShapeIds()]).toEqual([renderedId])
		expect(document.body.dataset.thumbnailError).toBeUndefined()
		editor.dispose()
	})

	// The snapshot endpoint only proves the requested ids still exist somewhere on the board, so a
	// live shared-file snapshot that moved them to another page since the token was minted reaches
	// the render page. Pruning on that would delete every shape on the rendered page and hand the
	// screenshot a blank canvas, which the tool would return — and cache — as a picture of the
	// shapes that were asked for. It has to fail instead.
	it('refuses without touching the page when the requested shapes moved to another page', () => {
		const { editor, movedId, renderedId } = setup()
		expect(prepareLiveCapture(editor, [movedId])).toBe(false)
		expect([...editor.getCurrentPageShapeIds()]).toEqual([renderedId])
		expect(document.body.dataset.thumbnailError).toBe(
			'requested shapes are not on the requested page'
		)
		editor.dispose()
	})

	it('keeps the on-page shapes when only some of the requested shapes moved away', () => {
		const { editor, movedId, renderedId } = setup()
		expect(prepareLiveCapture(editor, [renderedId, movedId])).toBe(true)
		expect([...editor.getCurrentPageShapeIds()]).toEqual([renderedId])
		expect(document.body.dataset.thumbnailError).toBeUndefined()
		editor.dispose()
	})
})
