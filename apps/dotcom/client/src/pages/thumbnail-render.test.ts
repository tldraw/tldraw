import { MAX_THUMBNAIL_PAGES } from '@tldraw/dotcom-shared'
import {
	Box,
	Editor,
	TLArrowShape,
	TLShapeId,
	b64Vecs,
	createBindingId,
	createShapeId,
	createTLStore,
	defaultBindingUtils,
	defaultShapeUtils,
	defaultTldrawOptions,
} from 'tldraw'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	SHAPES_NOT_ON_PAGE,
	acquireThumbnailRenderData,
	clampThumbnailDimension,
	exportThumbnailImage,
	getTightExportFrame,
	isTightShapesRender,
	measureArrow,
	measureDimensions,
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
	})
}

// Two pages with one shape each, left on the first — which stands in for the page a job named. The
// shape on the second page is the one a live snapshot moved away after the token was minted.
function setupTwoPageEditor() {
	const editor = setupEditor()
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
				props: { start: { x: 0, y: 0 }, end: { x: 2, y: 0 } },
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

describe('measureDimensions', () => {
	// The group's own size, not the larger axis-aligned page box a rotation gives it.
	it('reports a rotated group at the unrotated size of its children', () => {
		const editor = setupEditor()
		const a = createShapeId('a')
		const b = createShapeId('b')
		editor.createShapes([
			{ id: a, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
			{ id: b, type: 'geo', x: 300, y: 50, props: { w: 100, h: 100 } },
		])
		editor.groupShapes([a, b])
		const groupId = editor.getShape(a)!.parentId as TLShapeId
		editor.updateShape({ id: groupId, type: 'group', rotation: Math.PI / 4 })
		expect(editor.getShapePageBounds(groupId)!.h).toBeGreaterThan(150)
		expect(measureDimensions(editor, editor.getShape(groupId)!)).toEqual({ w: 400, h: 150 })
		editor.dispose()
	})

	it('reports a freehand stroke at the size it is drawn', () => {
		const editor = setupEditor()
		const id = createShapeId('scribble')
		editor.createShape({
			id,
			type: 'draw',
			x: 0,
			y: 0,
			props: {
				segments: [
					{
						type: 'free',
						path: b64Vecs.encodePoints(
							[0, 50, 100, 150].map((x) => ({ x, y: x % 100 ? 40 : 0, z: 0.5 })),
							2
						),
						dim: 2,
					},
				],
				isComplete: true,
			},
		})
		const dimensions = measureDimensions(editor, editor.getShape(id)!)!
		expect(dimensions.w).toBeGreaterThanOrEqual(150)
		expect(dimensions.h).toBeGreaterThanOrEqual(40)
		editor.dispose()
	})

	it('leaves out shapes whose size is on the record or is not a w and h', () => {
		const editor = setupEditor()
		const geo = createShapeId('geo')
		const note = createShapeId('note')
		const arrow = createShapeId('arrow')
		editor.createShapes([
			{ id: geo, type: 'geo', x: 0, y: 0 },
			{ id: note, type: 'note', x: 0, y: 0 },
			{ id: arrow, type: 'arrow', x: 0, y: 0, props: { end: { x: 100, y: 0 } } },
		])
		expect(measureDimensions(editor, editor.getShape(geo)!)).toBeUndefined()
		expect(measureDimensions(editor, editor.getShape(note)!)).toBeUndefined()
		expect(measureDimensions(editor, editor.getShape(arrow)!)).toBeUndefined()
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

	// A tight render frames on the shapes themselves, not the viewport: the camera's zoom limits are
	// what would otherwise crop a huge cluster or pad a tiny one.
	it('exports a tight render on its shapes’ bounds, whatever the camera shows', async () => {
		const editor = setupEditor()
		const id = createShapeId('wide')
		editor.createShape({ id, type: 'geo', x: 100, y: 50, props: { w: 400, h: 100 } })
		editor.setCamera({ x: 0, y: 0, z: 1 })
		const toImage = vi.spyOn(editor, 'toImage').mockRejectedValue(new Error('stop'))

		await expect(
			exportThumbnailImage(editor, 'light', 2560, 640, [id], { tight: true })
		).rejects.toThrow('stop')

		const [ids, options] = toImage.mock.calls[0]
		expect(ids).toEqual([id])
		expect(options).toMatchObject({ scale: 6.4, padding: 0 })
		expect(options!.bounds).toMatchObject({ x: 100, y: 50, w: 400, h: 100 })
		editor.dispose()
	})
})

describe('tight renders', () => {
	it('is tight only with shapes to draw', () => {
		expect(isTightShapesRender({ fit: 'tight', shapeIds: ['shape:a'] })).toBe(true)
		expect(isTightShapesRender({ fit: 'tight' })).toBe(false)
		expect(isTightShapesRender({ shapeIds: ['shape:a'] })).toBe(false)
	})

	// OG images and other thumbnails keep their 200-1600 range; only a tight render may go past it.
	it('lets a tight render reach 2560px and go below the thumbnail minimum', () => {
		expect(clampThumbnailDimension(2560)).toBe(1600)
		expect(clampThumbnailDimension(40)).toBe(200)
		expect(clampThumbnailDimension(2560, { tight: true })).toBe(2560)
		expect(clampThumbnailDimension(4000, { tight: true })).toBe(2560)
		expect(clampThumbnailDimension(1, { tight: true })).toBe(1)
		expect(clampThumbnailDimension(0, { tight: true })).toBe(1)
	})

	it('fills the image edge to edge when the bounds match its aspect ratio', () => {
		expect(getTightExportFrame(new Box(10, 20, 400, 100), 2560, 640)).toEqual({
			bounds: new Box(10, 20, 400, 100),
			scale: 6.4,
		})
	})

	// The worker sized the image from a measure; if the bounds have shifted since, centre them rather
	// than stretch the picture.
	it('centres bounds that no longer match the image, rather than stretching them', () => {
		expect(getTightExportFrame(new Box(0, 0, 400, 200), 2560, 640)).toEqual({
			bounds: new Box(-200, 0, 800, 200),
			scale: 3.2,
		})
	})

	it('draws a zero-height line at the scale its length sets', () => {
		expect(getTightExportFrame(new Box(0, 10, 500, 0), 2560, 1)).toEqual({
			bounds: new Box(0, 10 - 1 / 5.12 / 2, 500, 1 / 5.12),
			scale: 5.12,
		})
	})
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

describe('acquireThumbnailRenderData', () => {
	const pushed = {
		error: false as const,
		records: [],
		schema: { schemaVersion: 2, sequences: {} },
		renderParams: { x: 0, y: 0, z: 1, width: 1200, height: 630, theme: 'light' as const },
	}
	const renderUrl = (params: string) =>
		new URL(`https://www.tldraw.com/__thumbnail-render?token=t${params}`)

	let fetchMock: ReturnType<typeof vi.fn>
	beforeEach(() => {
		fetchMock = vi.fn(async () => Response.json({ ...pushed, records: [{ id: 'fetched' }] }))
		vi.stubGlobal('fetch', fetchMock)
	})
	afterEach(() => {
		vi.useRealTimers()
		vi.unstubAllGlobals()
		delete (window as any).__TLDRAW_RENDER__
	})

	it('takes records pushed after the page started waiting, without fetching', async () => {
		const acquiring = acquireThumbnailRenderData(renderUrl('&push=1'))
		;(window as any).__TLDRAW_RENDER__ = pushed

		expect(await acquiring).toEqual({
			ok: true,
			token: 't',
			records: [],
			schema: pushed.schema,
			renderParams: pushed.renderParams,
		})
		expect(fetchMock).not.toHaveBeenCalled()
	})

	it('waits for an announced push rather than fetching', async () => {
		vi.useFakeTimers()
		let settled = false
		const acquiring = acquireThumbnailRenderData(renderUrl('&push=1')).then((data) => {
			settled = true
			return data
		})
		await vi.advanceTimersByTimeAsync(30_000)
		expect(settled).toBe(false)
		expect(fetchMock).not.toHaveBeenCalled()

		;(window as any).__TLDRAW_RENDER__ = pushed
		expect(await acquiring).toMatchObject({ ok: true, records: [] })
	})

	it('fetches straight away when no push was announced', async () => {
		expect(await acquireThumbnailRenderData(renderUrl(''))).toMatchObject({
			ok: true,
			records: [{ id: 'fetched' }],
		})
		expect(fetchMock).toHaveBeenCalledTimes(1)
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
