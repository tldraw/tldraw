import { MAX_THUMBNAIL_PAGES } from '@tldraw/dotcom-shared'
import {
	Editor,
	TLArrowShape,
	createBindingId,
	createShapeId,
	createTLStore,
	defaultAddFontsFromNode,
	defaultBindingUtils,
	defaultShapeUtils,
	defaultTldrawOptions,
	tipTapDefaultExtensions,
	toRichText,
} from 'tldraw'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	SHAPES_NOT_ON_PAGE,
	exportThumbnailImage,
	measureArrow,
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

describe('measureArrow', () => {
	function setupEditor() {
		const store = createTLStore({
			shapeUtils: defaultShapeUtils,
			bindingUtils: defaultBindingUtils,
		})
		return new Editor({
			store,
			shapeUtils: defaultShapeUtils,
			bindingUtils: defaultBindingUtils,
			tools: [],
			getContainer: () => document.createElement('div'),
			// An arrow label is rich text, which the editor refuses to lay out without these.
			options: {
				text: {
					addFontsFromNode: defaultAddFontsFromNode,
					tipTapConfig: { extensions: tipTapDefaultExtensions },
				},
			},
		})
	}

	// The record of a bound arrow is a stub at its origin; only the editor knows where it runs.
	it('reports a bound arrow where it is drawn, between the shapes it is bound to', () => {
		const editor = setupEditor()
		const a = createShapeId('a')
		const b = createShapeId('b')
		const arrowId = createShapeId('arrow')
		editor.createShapes([
			{ id: a, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
			{ id: b, type: 'geo', x: 400, y: 0, props: { w: 100, h: 100 } },
			{
				id: arrowId,
				type: 'arrow',
				x: 0,
				y: 0,
				props: { start: { x: 0, y: 0 }, end: { x: 2, y: 0 }, richText: toRichText('next') },
			},
		])
		const bind = (toId: typeof a, terminal: 'start' | 'end') => ({
			id: createBindingId(),
			type: 'arrow' as const,
			fromId: arrowId,
			toId,
			props: { terminal, normalizedAnchor: { x: 0.5, y: 0.5 }, isPrecise: false, isExact: false },
		})
		editor.createBindings([bind(a, 'start'), bind(b, 'end')])

		const measured = measureArrow(editor, editor.getShape<TLArrowShape>(arrowId)!)!
		// Clipped to each box's edge, along the line between their centres.
		expect(measured.start.x).toBeGreaterThanOrEqual(100)
		expect(measured.start.x).toBeLessThan(150)
		expect(measured.end.x).toBeGreaterThan(350)
		expect(measured.end.x).toBeLessThanOrEqual(400)
		expect(measured.start.y).toBeCloseTo(50)
		expect(measured.end.y).toBeCloseTo(50)
		// jsdom measures no text, so the label's box is only roughly where a browser would put it.
		expect(measured.label!.x).toBeGreaterThan(measured.start.x)
		expect(measured.label!.x).toBeLessThan(measured.end.x)
		expect(measured.label!.y).toBeCloseTo(50, -1)
		editor.dispose()
	})

	it('reports a free arrow inside a frame in page space', () => {
		const editor = setupEditor()
		const frame = createShapeId('frame')
		const arrowId = createShapeId('arrow')
		editor.createShapes([
			{ id: frame, type: 'frame', x: 1000, y: 500, props: { w: 400, h: 300 } },
			{
				id: arrowId,
				type: 'arrow',
				parentId: frame,
				x: 10,
				y: 20,
				props: { start: { x: 0, y: 0 }, end: { x: 100, y: 0 } },
			},
		])

		expect(measureArrow(editor, editor.getShape<TLArrowShape>(arrowId)!)).toEqual({
			start: { x: 1010, y: 520 },
			end: { x: 1110, y: 520 },
		})
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

describe('the failure beacon', () => {
	// The page's state is module-scoped because it renders once; a fresh module per test is a fresh page.
	beforeEach(() => {
		vi.resetModules()
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	// Browser Run reports only that the capture element was missing, so the page's own reason and how
	// far it got are the only way a failure can be told apart from any other.
	it('reports the first error once, with the last phase the page completed', async () => {
		// What the page had marked when each request went out: the beacon has to leave before the
		// error marker, which is what ends the Browser Run session.
		const markedAtSend: (string | undefined)[] = []
		const fetchMock = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => {
			markedAtSend.push(document.body.dataset.thumbnailError)
			return new Response(null, { status: 404 })
		})
		vi.stubGlobal('fetch', fetchMock)
		const { acquireThumbnailRenderData, setThumbnailError } = await import('./thumbnail-render')

		const data = await acquireThumbnailRenderData(
			new URL('https://x.test/__thumbnail-render?token=t')
		)
		expect(data).toEqual({ ok: false, message: 'Could not load render job (404)' })
		setThumbnailError('Could not load render job (404)')
		setThumbnailError('a later failure')

		const beacons = fetchMock.mock.calls.filter(([url]) =>
			String(url).endsWith('/api/app/thumbnail-render/result')
		)
		expect(beacons.map(([, init]) => JSON.parse(init!.body as string))).toEqual([
			{ token: 't', error: { message: 'Could not load render job (404)', phase: 'boot' } },
		])
		expect(markedAtSend).toEqual([undefined, undefined])
	})
})
