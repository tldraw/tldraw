import { TLCustomServerEvent, TabRenderReply } from '@tldraw/dotcom-shared'
import {
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

function job(
	request: Extract<TLCustomServerEvent, { type: 'mcp_tab_render' }>['request']
): Extract<TLCustomServerEvent, { type: 'mcp_tab_render' }> {
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

	// The tab may be in use: a job that nudged the view would be felt by the person drawing in it.
	it('leaves the camera alone and frames the shapes the way the render page does', async () => {
		const { editor, firstPageId, firstShapeId } = setupEditor()
		const camera = { ...editor.getCamera() }
		const toImage = vi
			.spyOn(editor, 'toImage')
			.mockResolvedValue({ blob: new Blob(['x']), width: 1200, height: 630 })
		vi.stubGlobal(
			'createImageBitmap',
			vi.fn(async () => ({ width: 1200, height: 630, close() {} }))
		)

		await answerTabRender(editor, 'file-1', screenshotOf(firstPageId, [firstShapeId]))

		expect(editor.getCamera()).toEqual(camera)
		const options = toImage.mock.calls[0][1]!
		// 144 and 113.4 are the inset the render page zooms to fit with: min(160, 12% w, 18% h).
		const expectedScale = Math.min((1200 - 113.4) / 300, (630 - 113.4) / 150)
		expect(options.scale).toBeCloseTo(expectedScale)
		expect(options.bounds!.center.x).toBeCloseTo(250)
		expect(options.bounds!.center.y).toBeCloseTo(275)
		expect(options.bounds!.width * options.scale!).toBeCloseTo(1200)
		expect(options.bounds!.height * options.scale!).toBeCloseTo(630)
		expect(replies.at(-1)).toEqual({ status: 'captured', base64: expect.any(String) })
		editor.dispose()
	})
})
