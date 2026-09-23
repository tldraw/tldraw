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
import {
	SHAPES_NOT_ON_PAGE,
	exportThumbnailImage,
	prepareLiveCapture,
	setThumbnailError,
	signalThumbnailReady,
} from './thumbnail-render'

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
	delete document.body.dataset.thumbnailReady
	delete document.documentElement.dataset.thumbnailReady
})

// Two pages with one shape each, left on the first — which stands in for the page a job named. The
// shape on the second page is the one a live snapshot moved away after the token was minted.
function setupTwoPageEditor() {
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
	const renderedId = createShapeId('rendered')
	editor.createShape({ id: renderedId, type: 'geo', x: 0, y: 0 })
	editor.createPage({ name: 'elsewhere' })
	const otherPageId = editor.getPages().find((page) => page.id !== renderedPageId)!.id
	editor.setCurrentPage(otherPageId)
	const movedId = createShapeId('moved')
	editor.createShape({ id: movedId, type: 'geo', x: 0, y: 0 })
	editor.setCurrentPage(renderedPageId)
	return { editor, movedId, renderedId }
}

describe('prepareLiveCapture', () => {
	it('prunes to the requested shapes when they are on the rendered page', () => {
		const { editor, renderedId } = setupTwoPageEditor()
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
		const { editor, movedId, renderedId } = setupTwoPageEditor()
		expect(prepareLiveCapture(editor, [movedId])).toBe(false)
		expect([...editor.getCurrentPageShapeIds()]).toEqual([renderedId])
		expect(document.body.dataset.thumbnailError).toBe(SHAPES_NOT_ON_PAGE)
		editor.dispose()
	})

	it('keeps the on-page shapes when only some of the requested shapes moved away', () => {
		const { editor, movedId, renderedId } = setupTwoPageEditor()
		expect(prepareLiveCapture(editor, [renderedId, movedId])).toBe(true)
		expect([...editor.getCurrentPageShapeIds()]).toEqual([renderedId])
		expect(document.body.dataset.thumbnailError).toBeUndefined()
		editor.dispose()
	})
})

describe('exportThumbnailImage', () => {
	// The export path resolves the requested ids the same way the live path does, so a job whose
	// shapes moved pages has to fail there too. Without the refusal it falls through to
	// makeBlankThumbnail and that blank is returned — and cached — as a picture of the shapes that
	// were asked for. The refusal lands before editor.toImage, so this needs no canvas; the short
	// timeout is because the path it guards ends at canvas.toBlob, which jsdom never calls back, so
	// a regression here would otherwise sit for the full default timeout.
	it('refuses when the requested shapes are not on the rendered page', async () => {
		const { editor, movedId } = setupTwoPageEditor()
		await expect(exportThumbnailImage(editor, 'light', 500, 500, [movedId])).rejects.toThrow(
			SHAPES_NOT_ON_PAGE
		)
		editor.dispose()
	}, 5000)
})

describe('signalThumbnailReady', () => {
	it('marks both elements ready on a clean render', () => {
		signalThumbnailReady()
		expect(document.body.dataset.thumbnailReady).toBe('true')
		expect(document.documentElement.dataset.thumbnailReady).toBe('true')
	})

	// The worker captures on `body[data-thumbnail-ready="true"]` and does not look at the error
	// marker, so a page carrying both hands back a screenshot of whatever is on screen and it gets
	// cached as the real thing. prepareLiveCapture's refusal returns from onMount, but
	// ThumbnailExportSignal keeps running and ends here, so the error has to win.
	it('refuses to mark ready once an error is marked', () => {
		setThumbnailError(SHAPES_NOT_ON_PAGE)
		signalThumbnailReady()
		expect(document.body.dataset.thumbnailReady).toBeUndefined()
		expect(document.documentElement.dataset.thumbnailReady).toBeUndefined()
		expect(document.body.dataset.thumbnailError).toBe(SHAPES_NOT_ON_PAGE)
	})
})
