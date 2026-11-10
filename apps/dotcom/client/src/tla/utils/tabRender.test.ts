import {
	TabRenderReadRequest,
	TabRenderReply,
	TabRenderRequest,
	TabRenderServerEvent,
} from '@tldraw/dotcom-shared'
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
// How the worker answers a tab's `accepted`, which for a write is the go-ahead.
let claimGranted = true

beforeEach(() => {
	replies.length = 0
	claimGranted = true
	vi.stubGlobal(
		'fetch',
		vi.fn(async (_url: string, init: RequestInit) => {
			const reply = JSON.parse(init.body as string) as TabRenderReply
			replies.push(reply)
			return new Response('{}', {
				status: reply.status === 'accepted' && !claimGranted ? 404 : 200,
			})
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

const readOf = (page: TabRenderReadRequest['page'], clusterIds: string[] = []) =>
	job({ mode: 'read', page, clusterIds })

const screenshotOf = (pageId: TLPageId, shapeIds: string[]) =>
	job({ mode: 'screenshot', pageId, shapeIds, theme: 'light', width: 1200, height: 630 })

describe('answerTabRender', () => {
	it('posts to the job on this file, without a token', async () => {
		const { editor, firstPageId } = setupEditor()
		await answerTabRender(editor, 'file-1', readOf({ kind: 'id', id: firstPageId }))
		const [url, init] = vi.mocked(fetch).mock.calls[0]
		expect(url).toBe('/api/app/file/file-1/tab-render/job')
		expect(new Headers((init as RequestInit).headers).has('Authorization')).toBe(false)
		editor.dispose()
	})

	it('reads the page in view, acknowledging first', async () => {
		const { editor, firstPageId } = setupEditor()

		await answerTabRender(editor, 'file-1', readOf({ kind: 'ordinal', ordinal: 0 }))

		expect(replies).toEqual([
			{ status: 'accepted' },
			{
				status: 'page_read',
				read: expect.objectContaining({
					pageId: firstPageId,
					pageName: 'Page 1',
					clusters: [
						expect.objectContaining({
							numberOfShapes: 1,
							bounds: { x: 100, y: 200, w: 300, h: 150 },
						}),
					],
					details: [],
				}),
			},
		])
		editor.dispose()
	})

	it('sends records only for the clusters it was asked about, with the measured text', async () => {
		const { editor, firstShapeId } = setupEditor()

		await answerTabRender(editor, 'file-1', readOf({ kind: 'ordinal', ordinal: 0 }))
		const reply = replies.at(-1)
		if (reply?.status !== 'page_read') throw new Error('expected a page read')
		const clusterId = reply.read.clusters[0].id

		await answerTabRender(editor, 'file-1', readOf({ kind: 'ordinal', ordinal: 0 }, [clusterId]))

		expect(replies.at(-1)).toMatchObject({
			status: 'page_read',
			read: {
				details: [
					{
						id: clusterId,
						shapes: [expect.objectContaining({ id: firstShapeId, plainText: 'Hello' })],
					},
				],
			},
		})
		editor.dispose()
	})

	// An agent can ask about any page, and the user shouldn't be moved to answer it.
	it('reads a page the tab is not showing, without leaving the current one', async () => {
		const { editor, firstPageId, otherPageId } = setupEditor()

		await answerTabRender(editor, 'file-1', readOf({ kind: 'id', id: otherPageId }))

		expect(replies.at(-1)).toMatchObject({
			status: 'page_read',
			read: {
				pageId: otherPageId,
				pageName: 'elsewhere',
				clusters: [{ bounds: { x: 10, y: 20, w: 50, h: 60 } }],
			},
		})
		expect(editor.getCurrentPageId()).toBe(firstPageId)
		editor.dispose()
	})

	it('declines before an editor has mounted', async () => {
		await answerTabRender(null, 'file-1', readOf({ kind: 'ordinal', ordinal: 0 }))
		expect(replies).toEqual([{ status: 'declined', reason: 'editor_not_ready' }])
	})

	it('answers with the page count for a page this tab does not have', async () => {
		const { editor } = setupEditor()
		await answerTabRender(editor, 'file-1', readOf({ kind: 'ordinal', ordinal: 5 }))
		expect(replies.at(-1)).toEqual({
			status: 'page_not_found',
			reason: 'page_out_of_range',
			pageCount: 2,
		})
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

	describe('with several screenshots at once', () => {
		// Holds the first export open, so that everything after it has to queue.
		function holdFirstExport(toImage: ReturnType<typeof stubExport>) {
			let release = () => {}
			toImage.mockImplementationOnce(
				() =>
					new Promise((resolve) => {
						release = () => resolve({ blob: new Blob(['x']), width: 1200, height: 630 })
					})
			)
			return () => release()
		}

		it('queues them one at a time rather than declining any', async () => {
			const { editor, firstPageId, firstShapeId } = setupEditor()
			const toImage = stubExport(editor)
			const release = holdFirstExport(toImage)
			const screenshot = () =>
				answerTabRender(editor, 'file-1', screenshotOf(firstPageId, [firstShapeId]))

			const jobs = [screenshot(), screenshot(), screenshot()]
			await vi.waitFor(() => expect(toImage).toHaveBeenCalledTimes(1))
			await new Promise((resolve) => setTimeout(resolve, 10))
			expect(toImage).toHaveBeenCalledTimes(1)

			release()
			await Promise.all(jobs)

			expect(toImage).toHaveBeenCalledTimes(3)
			expect(replies.filter((reply) => reply.status === 'captured')).toHaveLength(3)
			expect(replies.filter((reply) => reply.status === 'declined')).toEqual([])
			editor.dispose()
		})

		it('keeps going after an export fails', async () => {
			const { editor, firstPageId, firstShapeId } = setupEditor()
			vi.spyOn(console, 'error').mockImplementation(() => {})
			const toImage = stubExport(editor)
			toImage.mockRejectedValueOnce(new Error('export failed'))
			const screenshot = () =>
				answerTabRender(editor, 'file-1', screenshotOf(firstPageId, [firstShapeId]))

			await Promise.all([screenshot(), screenshot()])

			expect(replies).toContainEqual({ status: 'declined', reason: 'failed' })
			expect(replies).toContainEqual({ status: 'captured', base64: expect.any(String) })
			editor.dispose()
		})

		// The page can change while a job waits, and the export only draws the current one.
		it('checks again when its turn comes', async () => {
			const { editor, firstPageId, firstShapeId, otherPageId } = setupEditor()
			const toImage = stubExport(editor)
			const release = holdFirstExport(toImage)
			const screenshot = () =>
				answerTabRender(editor, 'file-1', screenshotOf(firstPageId, [firstShapeId]))

			const jobs = [screenshot(), screenshot()]
			await vi.waitFor(() => expect(toImage).toHaveBeenCalledTimes(1))
			editor.setCurrentPage(otherPageId)
			release()
			await Promise.all(jobs)

			expect(toImage).toHaveBeenCalledTimes(1)
			expect(replies).toContainEqual({ status: 'declined', reason: 'page_not_current' })
			editor.dispose()
		})

		// By now the worker has likely gone to Browser Run, so this would be wasted main thread time.
		it('gives up on a job that waited too long', async () => {
			const { editor, firstPageId, firstShapeId } = setupEditor()
			const toImage = stubExport(editor)
			const release = holdFirstExport(toImage)
			const screenshot = () =>
				answerTabRender(editor, 'file-1', screenshotOf(firstPageId, [firstShapeId]))

			const jobs = [screenshot(), screenshot()]
			await vi.waitFor(() => expect(toImage).toHaveBeenCalledTimes(1))
			vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 5_001)
			release()
			await Promise.all(jobs)

			expect(toImage).toHaveBeenCalledTimes(1)
			expect(replies).toContainEqual({ status: 'declined', reason: 'busy' })
			editor.dispose()
		})
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

	it('reports what the user has selected, what page they are on and where they are looking', async () => {
		const { editor, firstPageId, firstShapeId } = setupEditor()
		editor.select(firstShapeId)

		await answerTabRender(editor, 'file-1', job({ mode: 'user_state' }))

		expect(replies.at(-1)).toEqual({
			status: 'user_state',
			pageId: firstPageId,
			pageName: editor.getCurrentPage().name,
			selectedShapeIds: [firstShapeId],
			viewport: expect.objectContaining({ w: expect.any(Number), h: expect.any(Number) }),
		})
		editor.dispose()
	})

	describe('apply_ops', () => {
		const attribution = { userId: 'user_a', runId: 'run-1' }
		const addBox = { op: 'add', kind: 'box', id: 'hello', text: 'Hello', at: { x: 500, y: 500 } }
		const applyOps = (
			ops: unknown[] = [addBox],
			page?: Extract<TabRenderRequest, { mode: 'apply_ops' }>['page']
		) => job({ mode: 'apply_ops', ops, page, attribution })
		const hello = createShapeId('hello')

		beforeEach(() => {
			vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
		})

		it('applies a batch once it has the go-ahead, and reports what landed', async () => {
			const { editor, firstPageId } = setupEditor()

			await answerTabRender(editor, 'file-1', applyOps())

			expect(editor.getShape(hello)).toBeDefined()
			expect(replies).toEqual([
				{ status: 'accepted' },
				{
					status: 'applied',
					pageId: firstPageId,
					pageName: editor.getCurrentPage().name,
					result: expect.objectContaining({ applied: 1, errors: [], createdIds: ['hello'] }),
				},
			])
			editor.dispose()
		})

		// Refused means this tab thawed after the agent gave up. Applying anyway is how an edit lands
		// twice.
		it('does nothing when the worker refuses the claim', async () => {
			const { editor } = setupEditor()
			claimGranted = false

			await answerTabRender(editor, 'file-1', applyOps())

			expect(editor.getShape(hello)).toBeUndefined()
			expect(replies).toEqual([{ status: 'accepted' }])
			editor.dispose()
		})

		it('does nothing when the claim cannot be sent', async () => {
			const { editor } = setupEditor()
			vi.spyOn(console, 'error').mockImplementation(() => {})
			vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'))

			await answerTabRender(editor, 'file-1', applyOps())

			expect(editor.getShape(hello)).toBeUndefined()
			editor.dispose()
		})

		it('hands back why an invalid batch was refused, having applied none of it', async () => {
			const { editor } = setupEditor()

			await answerTabRender(editor, 'file-1', applyOps([addBox, { op: 'explode' }]))

			expect(editor.getShape(hello)).toBeUndefined()
			expect(replies.at(-1)).toEqual({
				status: 'declined',
				reason: 'invalid_ops',
				detail: expect.any(String),
			})
			editor.dispose()
		})

		it('declines on a view-only board, without claiming the job', async () => {
			const { editor } = setupEditor()
			editor.updateInstanceState({ isReadonly: true })

			await answerTabRender(editor, 'file-1', applyOps())

			expect(replies).toEqual([{ status: 'declined', reason: 'read_only' }])
			editor.dispose()
		})

		// Its edits would wait for a frame before being sent, and the user can't see them land.
		it('declines in a hidden tab, without claiming the job', async () => {
			const { editor } = setupEditor()
			vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')

			await answerTabRender(editor, 'file-1', applyOps())

			expect(replies).toEqual([{ status: 'declined', reason: 'tab_hidden' }])
			expect(editor.getShape(hello)).toBeUndefined()
			editor.dispose()
		})

		// Ops place shapes on the page in view, so applying this would put them on the wrong page.
		it('declines a batch meant for a page the user is not on', async () => {
			const { editor, firstPageId, otherPageId } = setupEditor()

			await answerTabRender(editor, 'file-1', applyOps([addBox], { kind: 'id', id: otherPageId }))

			expect(replies).toEqual([{ status: 'declined', reason: 'page_not_current' }])
			expect(editor.getShape(hello)).toBeUndefined()
			expect(editor.getCurrentPageId()).toBe(firstPageId)
			editor.dispose()
		})

		it('applies when a named page is the one in view, by id or by index', async () => {
			const { editor, firstPageId } = setupEditor()

			await answerTabRender(editor, 'file-1', applyOps([addBox], { kind: 'id', id: firstPageId }))
			await answerTabRender(
				editor,
				'file-1',
				applyOps([{ ...addBox, id: 'again' }], { kind: 'ordinal', ordinal: 0 })
			)

			expect(editor.getShape(hello)).toBeDefined()
			expect(editor.getShape(createShapeId('again'))).toBeDefined()
			editor.dispose()
		})

		it('declines a page the board does not have', async () => {
			const { editor } = setupEditor()

			await answerTabRender(editor, 'file-1', applyOps([addBox], { kind: 'ordinal', ordinal: 9 }))

			expect(replies).toEqual([{ status: 'declined', reason: 'page_missing' }])
			editor.dispose()
		})

		it('lands batches in the order they came', async () => {
			const { editor } = setupEditor()
			const first = { ...addBox, id: 'first' }
			const second = { op: 'rename', target: 'first', text: 'Renamed' }

			await Promise.all([
				answerTabRender(editor, 'file-1', applyOps([first])),
				answerTabRender(editor, 'file-1', applyOps([second])),
			])

			const shape = editor.getShape(createShapeId('first'))!
			expect(editor.getShapeUtil(shape).getText(shape)).toBe('Renamed')
			editor.dispose()
		})

		// Cancelling a drag rolls back past the batch, after the agent was told it landed.
		it('declines while the user is mid-drag, without claiming the job', async () => {
			const { editor } = setupEditor()
			vi.spyOn(editor.inputs, 'getIsDragging').mockReturnValue(true)

			await answerTabRender(editor, 'file-1', applyOps())

			expect(replies).toEqual([{ status: 'declined', reason: 'busy' }])
			expect(editor.getShape(hello)).toBeUndefined()
			editor.dispose()
		})

		// Reported as a plain failure, the agent would resend ops that may already have landed.
		it('reports a failure past validation as one that may have landed', async () => {
			const { editor } = setupEditor()
			vi.spyOn(console, 'error').mockImplementation(() => {})
			vi.spyOn(editor, 'squashToMark').mockImplementation(() => {
				throw new Error('history unavailable')
			})

			await answerTabRender(editor, 'file-1', applyOps())

			expect(editor.getShape(hello)).toBeDefined()
			expect(replies.at(-1)).toEqual({ status: 'declined', reason: 'apply_failed' })
			editor.dispose()
		})

		// The claim reached the worker, then the tab froze before reading the answer. By the time it
		// wakes, the job has timed out and the agent may have sent the batch again.
		it('drops a batch when the tab wakes long after the job arrived', async () => {
			const { editor } = setupEditor()
			const now = Date.now()
			vi.mocked(fetch).mockImplementationOnce(async (_url, init) => {
				replies.push(JSON.parse((init as RequestInit).body as string))
				vi.spyOn(Date, 'now').mockReturnValue(now + 5_001)
				return new Response('{}')
			})

			await answerTabRender(editor, 'file-1', applyOps())

			expect(editor.getShape(hello)).toBeUndefined()
			expect(replies).toEqual([{ status: 'accepted' }, { status: 'declined', reason: 'busy' }])
			editor.dispose()
		})

		// The agent was told to check and may have resent it, so landing now would apply it twice.
		it('drops a batch that waited too long in the queue', async () => {
			const { editor, firstPageId, firstShapeId } = setupEditor()
			const toImage = stubExport(editor)
			let release = () => {}
			toImage.mockImplementationOnce(
				() =>
					new Promise((resolve) => {
						release = () => resolve({ blob: new Blob(['x']), width: 1200, height: 630 })
					})
			)
			const capture = answerTabRender(editor, 'file-1', screenshotOf(firstPageId, [firstShapeId]))
			await vi.waitFor(() => expect(toImage).toHaveBeenCalledTimes(1))

			const apply = answerTabRender(editor, 'file-1', applyOps())
			await vi.waitFor(() =>
				expect(replies.filter((reply) => reply.status === 'accepted')).toHaveLength(2)
			)
			vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 5_001)
			release()
			await Promise.all([capture, apply])

			expect(editor.getShape(hello)).toBeUndefined()
			expect(replies).toContainEqual({ status: 'declined', reason: 'busy' })
			editor.dispose()
		})
	})
})
