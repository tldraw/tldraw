import { TabRenderReply, TabRenderRequest, TabRenderServerEvent } from '@tldraw/dotcom-shared'
import {
	Box,
	Editor,
	TLPageId,
	createShapeId,
	createTLStore,
	defaultBindingUtils,
	defaultAddFontsFromNode,
	defaultShapeUtils,
	tipTapDefaultExtensions,
	toRichText,
} from 'tldraw'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { getThumbnailContentInset } from '../../utils/boardCapture'
import { answerTabRender } from './tabRender'

// jsdom has no ResizeObserver, which the editor's container measurement uses.
beforeAll(() => {
	globalThis.ResizeObserver ??= class {
		observe() {}
		unobserve() {}
		disconnect() {}
	} as unknown as typeof ResizeObserver
})

const replies: TabRenderReply[] = []

beforeEach(() => {
	replies.length = 0
	vi.stubGlobal(
		'fetch',
		vi.fn(async (_url: string, init: RequestInit) => {
			replies.push(JSON.parse(init.body as string))
			return new Response('{}')
		})
	)
})

afterEach(() => {
	vi.unstubAllGlobals()
	vi.restoreAllMocks()
})

function setupEditor() {
	const store = createTLStore({ shapeUtils: defaultShapeUtils, bindingUtils: defaultBindingUtils })
	const editor = new Editor({
		store,
		shapeUtils: defaultShapeUtils,
		bindingUtils: defaultBindingUtils,
		tools: [],
		getContainer: () => document.createElement('div'),
		textOptions: {
			addFontsFromNode: defaultAddFontsFromNode,
			tipTapConfig: { extensions: tipTapDefaultExtensions },
		},
	})
	// jsdom has no FontFaceSet to load into.
	vi.spyOn(editor.fonts, 'ensureFontIsLoaded').mockResolvedValue()
	const firstPageId = editor.getCurrentPageId()
	const firstShapeId = createShapeId('first')
	editor.createShape({
		id: firstShapeId,
		type: 'geo',
		x: 100,
		y: 200,
		props: { w: 300, h: 150, richText: toRichText('Hello') },
	})
	editor.createPage({ name: 'elsewhere' })
	const otherPageId = editor.getPages().find((page) => page.id !== firstPageId)!.id
	editor.setCurrentPage(otherPageId)
	const otherShapeId = createShapeId('other')
	editor.createShape({ id: otherShapeId, type: 'geo', x: 10, y: 20, props: { w: 50, h: 60 } })
	editor.setCurrentPage(firstPageId)
	return { editor, firstPageId, firstShapeId, otherPageId, otherShapeId }
}

function job(request: TabRenderRequest): TabRenderServerEvent {
	return { type: 'mcp_tab_render', jobId: 'job', request }
}

const screenshotOf = (pageId: TLPageId, shapeIds: string[]) =>
	job({ mode: 'screenshot', pageId, shapeIds, theme: 'light', width: 1200, height: 630 })

describe('answerTabRender', () => {
	it('posts to the job on this file', async () => {
		const { editor, firstPageId } = setupEditor()
		await answerTabRender(editor, 'file-1', job({ mode: 'measure', pageId: firstPageId }))
		expect(vi.mocked(fetch).mock.calls[0][0]).toBe('/api/app/file/file-1/tab-render/job')
		editor.dispose()
	})

	it('measures the page in view, acknowledging first', async () => {
		const { editor, firstPageId, firstShapeId } = setupEditor()

		await answerTabRender(editor, 'file-1', job({ mode: 'measure', pageId: firstPageId }))

		expect(replies).toEqual([
			{ status: 'accepted' },
			{
				status: 'measured',
				shapes: {
					[firstShapeId]: expect.objectContaining({ x: 100, y: 200, w: 300, text: 'Hello' }),
				},
			},
		])
		editor.dispose()
	})

	// An agent can ask about any page, and the user shouldn't be moved to answer it.
	it('measures a page the tab is not showing, without leaving the current one', async () => {
		const { editor, firstPageId, otherPageId, otherShapeId } = setupEditor()

		await answerTabRender(editor, 'file-1', job({ mode: 'measure', pageId: otherPageId }))

		expect(replies.at(-1)).toEqual({
			status: 'measured',
			shapes: { [otherShapeId]: expect.objectContaining({ x: 10, y: 20, w: 50, h: 60 }) },
		})
		expect(editor.getCurrentPageId()).toBe(firstPageId)
		editor.dispose()
	})

	it('declines before an editor has mounted', async () => {
		await answerTabRender(null, 'file-1', job({ mode: 'measure', pageId: 'page:a' as TLPageId }))
		expect(replies).toEqual([{ status: 'declined', reason: 'editor_not_ready' }])
	})

	it('declines a page this tab does not have', async () => {
		const { editor } = setupEditor()
		await answerTabRender(
			editor,
			'file-1',
			job({ mode: 'measure', pageId: 'page:nope' as TLPageId })
		)
		expect(replies).toEqual([{ status: 'declined', reason: 'page_missing' }])
		editor.dispose()
	})

	// Declined without an ack, so the worker falls back straight away instead of waiting on this tab.
	it('declines a screenshot of a page the tab is not showing', async () => {
		const { editor, otherPageId, otherShapeId } = setupEditor()
		await answerTabRender(editor, 'file-1', screenshotOf(otherPageId, [otherShapeId]))
		expect(replies).toEqual([{ status: 'declined', reason: 'page_not_current' }])
		editor.dispose()
	})

	it('declines a screenshot whose shapes have left the page', async () => {
		const { editor, firstPageId, otherShapeId } = setupEditor()
		await answerTabRender(editor, 'file-1', screenshotOf(firstPageId, [otherShapeId]))
		expect(replies).toEqual([{ status: 'declined', reason: 'shapes_missing' }])
		editor.dispose()
	})

	it('declines when the work throws, rather than leaving the worker to time out', async () => {
		const { editor, firstPageId, firstShapeId } = setupEditor()
		vi.spyOn(console, 'error').mockImplementation(() => {})
		vi.spyOn(editor, 'toImage').mockRejectedValue(new Error('export failed'))

		await answerTabRender(editor, 'file-1', screenshotOf(firstPageId, [firstShapeId]))

		expect(replies).toEqual([{ status: 'accepted' }, { status: 'declined', reason: 'failed' }])
		editor.dispose()
	})

	function stubExport(editor: Editor) {
		vi.stubGlobal(
			'createImageBitmap',
			vi.fn(async () => ({ width: 1200, height: 630, close() {} }))
		)
		return vi
			.spyOn(editor, 'toImage')
			.mockResolvedValue({ blob: new Blob(['x']), width: 1200, height: 630 })
	}

	// The tab may be in use: a job that nudged the view would be felt by the person drawing in it.
	it('leaves the camera where it is', async () => {
		const { editor, firstPageId, firstShapeId } = setupEditor()
		const camera = { ...editor.getCamera() }
		stubExport(editor)

		await answerTabRender(editor, 'file-1', screenshotOf(firstPageId, [firstShapeId]))

		expect(replies.at(-1)).toEqual({ status: 'captured', base64: expect.any(String) })
		expect(editor.getCamera()).toEqual(camera)
		editor.dispose()
	})

	// The render page reaches its frame by zooming a real camera. Compared against zoomToBounds itself
	// rather than a copy of its formula, so the two can't drift apart unnoticed.
	it('frames shapes exactly as zoomToBounds does on the render page', async () => {
		const { editor, firstPageId, firstShapeId } = setupEditor()
		const toImage = stubExport(editor)
		await answerTabRender(editor, 'file-1', screenshotOf(firstPageId, [firstShapeId]))
		const options = toImage.mock.calls[0][1]!

		const renderPage = setupEditor().editor
		renderPage.updateViewportScreenBounds(new Box(0, 0, 1200, 630))
		renderPage.zoomToBounds(renderPage.getShapePageBounds(firstShapeId)!, {
			immediate: true,
			force: true,
			inset: getThumbnailContentInset(1200, 630),
		})

		expect(options.scale).toBeCloseTo(renderPage.getCamera().z)
		const viewport = renderPage.getViewportPageBounds()
		expect(options.bounds!.x).toBeCloseTo(viewport.x)
		expect(options.bounds!.y).toBeCloseTo(viewport.y)
		expect(options.bounds!.w).toBeCloseTo(viewport.w)
		expect(options.bounds!.h).toBeCloseTo(viewport.h)
		editor.dispose()
		renderPage.dispose()
	})

	// An export can't be sliced, so a big one would stall a tab someone may be drawing in.
	it('declines a screenshot too large to export without dropping frames', async () => {
		const { editor, firstPageId, firstShapeId } = setupEditor()
		const toImage = stubExport(editor)
		vi.spyOn(editor, 'getShapeAndDescendantIds').mockReturnValue(
			new Set(Array.from({ length: 501 }, (_, i) => createShapeId(String(i))))
		)

		await answerTabRender(editor, 'file-1', screenshotOf(firstPageId, [firstShapeId]))

		expect(replies).toEqual([{ status: 'declined', reason: 'too_many_shapes' }])
		expect(toImage).not.toHaveBeenCalled()
		editor.dispose()
	})

	it('declines a screenshot while the user is mid-drag', async () => {
		const { editor, firstPageId, firstShapeId } = setupEditor()
		const toImage = stubExport(editor)
		vi.spyOn(editor.inputs, 'getIsDragging').mockReturnValue(true)

		await answerTabRender(editor, 'file-1', screenshotOf(firstPageId, [firstShapeId]))

		expect(replies).toEqual([{ status: 'declined', reason: 'busy' }])
		expect(toImage).not.toHaveBeenCalled()
		editor.dispose()
	})

	it('runs one export at a time', async () => {
		const { editor, firstPageId, firstShapeId } = setupEditor()
		const toImage = stubExport(editor)
		let finishExport = () => {}
		toImage.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					finishExport = () => resolve({ blob: new Blob(['x']), width: 1200, height: 630 })
				})
		)

		const first = answerTabRender(editor, 'file-1', screenshotOf(firstPageId, [firstShapeId]))
		await vi.waitFor(() => expect(toImage).toHaveBeenCalledTimes(1))
		await answerTabRender(editor, 'file-1', screenshotOf(firstPageId, [firstShapeId]))
		expect(replies).toContainEqual({ status: 'declined', reason: 'busy' })

		finishExport()
		await first
		await answerTabRender(editor, 'file-1', screenshotOf(firstPageId, [firstShapeId]))
		expect(toImage).toHaveBeenCalledTimes(2)
		editor.dispose()
	})

	// Past its delay an export resolves anyway, with a valid PNG of an empty canvas. Sending that would
	// show the agent a blank board as a success, where declining gets it the real picture.
	it('declines an export that outlived its delay rather than sending what it produced', async () => {
		const { editor, firstPageId, firstShapeId } = setupEditor()
		stubExport(editor)
		vi.spyOn(performance, 'now')
			.mockReturnValueOnce(0)
			.mockReturnValue(editor.options.maxExportDelayMs)

		await answerTabRender(editor, 'file-1', screenshotOf(firstPageId, [firstShapeId]))

		expect(replies).toEqual([
			{ status: 'accepted' },
			{ status: 'declined', reason: 'export_timed_out' },
		])
		editor.dispose()
	})
})
