import {
	TabRenderApplyOpsRequest,
	TabRenderDeclineReason,
	TabRenderReadRequest,
	TabRenderReply,
	TabRenderRequest,
	TabRenderScreenshotRequest,
	TabRenderServerEvent,
	ThumbnailShapeMeasurement,
	findMcpPage,
	readMcpPage,
	toShapeMeasurements,
} from '@tldraw/dotcom-shared'
import {
	Box,
	Editor,
	FileHelpers,
	TLArrowBinding,
	TLFontFace,
	TLPageId,
	TLShape,
	TLShapeId,
	clamp,
	fetch,
	last,
	sleep,
} from 'tldraw'
import { z } from 'zod'
import {
	getRequestedBounds,
	getRequestedShapeIds,
	getThumbnailContentInset,
	measureShapeForMcp,
	renderThumbnailPng,
} from '../../utils/boardCapture'
import { createCanvasOpsReceiver } from './canvas-ops/receiver'

// Answers MCP tool calls from this tab; see "Working in an open tab" and "Editing in an open tab" in
// browser-run-thumbnails.md.
//
// This runs in the tab someone may be drawing in. Reads leave the camera, the current page and the
// selection where they are, which is why a capture computes an export frame rather than borrowing the
// render page's zoom-to-fit. A job this tab can't do cheaply is declined rather than attempted: the
// agent can try again, and an answer that costs the user a dropped frame is worse than a slow one.

// Time budget per slice of a measure. Geometry is cached for the page in view, but a first measure of
// another page lays out all of its text, which on a big page is long enough to be felt.
const SLICE_MS = 8

// Well inside the worker's measure timeout: text measured against a fallback font is a slightly wrong
// answer, and no answer fails the call.
const FONT_WAIT_MS = 1_500

// An export can't be sliced: it renders every shape in one synchronous flush, on the main thread of a
// tab that may be in use. Past this, the frame it would drop is worth more than the second it saves.
const MAX_EXPORT_SHAPES = 500

// Longer than this since the job arrived and its answer may not reach the worker before the job's
// timeout. For a read that would be main thread time spent on nobody. For a write it's worse: the agent
// is told a timed-out batch may have landed, and may send it again. Counted from arrival rather than
// from the claim, so a tab that froze after claiming a write drops it when it wakes.
const MAX_QUEUE_MS = 5_000

// Enough for the model to see what to fix on a large batch, and well inside what the reply route takes.
const MAX_INVALID_OPS_DETAIL = 1_500

// One at a time, so an agent can't stack work up on the main thread, and so batches land in the order
// they came. Queued rather than declined: agents routinely ask for several things at once.
let workQueue: Promise<unknown> = Promise.resolve()

function enqueueWork(run: () => Promise<TabRenderReply>) {
	const result = workQueue.then(run)
	workQueue = result.catch(() => {})
	return result
}

export async function answerTabRender(
	editor: Editor | null,
	fileId: string,
	{ jobId, request }: TabRenderServerEvent
) {
	const receivedAt = Date.now()
	const reply = (body: TabRenderReply) => postTabRenderReply(fileId, jobId, body)

	const refusal = editor ? getRefusal(editor, request) : 'editor_not_ready'
	if (refusal || !editor) {
		await reply({ status: 'declined', reason: refusal ?? 'editor_not_ready' })
		return
	}

	// A write waits for the go-ahead: this tab may have been frozen and be waking up to a job the agent
	// gave up on, which would replay old ops.
	if (request.mode === 'apply_ops') {
		if (!(await reply({ status: 'accepted' }))) return
	} else {
		// Not awaited: the ack only has to arrive, and a read shouldn't wait on the round trip.
		void reply({ status: 'accepted' })
	}

	try {
		await reply(await doWork(editor, request, receivedAt))
	} catch (error) {
		console.error('Could not answer a tab render job', error)
		await reply({ status: 'declined', reason: 'failed' })
	}
}

function doWork(editor: Editor, request: TabRenderRequest, receivedAt: number) {
	switch (request.mode) {
		case 'read':
			return readPage(editor, request)
		case 'screenshot':
			return queueCapture(editor, request, receivedAt)
		case 'apply_ops':
			return queueApplyOps(editor, request, receivedAt)
		case 'user_state':
			return readUserState(editor)
	}
}

async function readUserState(editor: Editor): Promise<TabRenderReply> {
	const page = editor.getCurrentPage()
	const { x, y, w, h } = editor.getViewportPageBounds()
	return {
		status: 'user_state',
		pageId: page.id,
		pageName: page.name,
		selectedShapeIds: editor.getSelectedShapeIds(),
		viewport: { x, y, w, h },
	}
}

function getApplyPageId(editor: Editor, page: TabRenderApplyOpsRequest['page']) {
	if (!page) return editor.getCurrentPageId()
	return page.kind === 'id' ? (page.id as TLPageId) : editor.getPages()[page.ordinal]?.id
}

function getRefusal(editor: Editor, request: TabRenderRequest): TabRenderDeclineReason | undefined {
	// A page this tab doesn't have is part of a read's answer: it says which pages there are.
	if (request.mode === 'read') return undefined
	if (request.mode === 'user_state') return undefined
	if (request.mode === 'apply_ops') {
		if (editor.getIsReadonly()) return 'read_only'
		// The user has to be watching: a hidden tab's edits wait for an animation frame before they're
		// sent, so a batch could report success and be lost if the tab closed first.
		if (document.visibilityState !== 'visible') return 'tab_hidden'
		const pageId = getApplyPageId(editor, request.page)
		if (!pageId || !editor.getPage(pageId)) return 'page_missing'
		// Ops place shapes on the page in view, so a batch meant for another page would land on the
		// wrong one, and moving the user there to apply it is not an option.
		if (editor.getCurrentPageId() !== pageId) return 'page_not_current'
		// Cancelling a drag rolls back to where it began, which would take the batch with it.
		return editor.inputs.getIsDragging() ? 'busy' : undefined
	}

	const pageId = request.pageId as TLPageId
	if (!editor.getPage(pageId)) return 'page_missing'

	// The export draws from the current page's rendering shapes, and switching a user's page underneath
	// them to take a picture is not an option.
	if (editor.getCurrentPageId() !== pageId) return 'page_not_current'
	const ids = getRequestedShapeIds(editor, request.shapeIds)
	if (ids.length === 0) return 'shapes_missing'
	if (editor.getShapeAndDescendantIds(ids).size > MAX_EXPORT_SHAPES) return 'too_many_shapes'
	if (editor.inputs.getIsDragging()) return 'busy'
	return undefined
}

// Checked again at the front of the queue, because the page, the shapes and the user's drag can all
// have moved on while it waited.
function queueCapture(editor: Editor, request: TabRenderScreenshotRequest, receivedAt: number) {
	return enqueueWork(async () => {
		const reason = Date.now() - receivedAt > MAX_QUEUE_MS ? 'busy' : getRefusal(editor, request)
		return reason ? { status: 'declined', reason } : capturePage(editor, request)
	})
}

function queueApplyOps(editor: Editor, request: TabRenderApplyOpsRequest, receivedAt: number) {
	return enqueueWork(async (): Promise<TabRenderReply> => {
		const reason = Date.now() - receivedAt > MAX_QUEUE_MS ? 'busy' : getRefusal(editor, request)
		if (reason) return { status: 'declined', reason }
		try {
			const result = createCanvasOpsReceiver(editor).applyBatch(
				{ ops: request.ops },
				request.attribution
			)
			const page = editor.getCurrentPage()
			return { status: 'applied', pageId: page.id, pageName: page.name, result: { ...result } }
		} catch (error) {
			if (error instanceof z.ZodError) {
				return {
					status: 'declined',
					reason: 'invalid_ops',
					detail: z.prettifyError(error).slice(0, MAX_INVALID_OPS_DETAIL),
				}
			}
			// Validation passed, so some of the ops may have run before this.
			// Calling it a plain failure would have the agent send the batch again.
			console.error('A batch of ops failed partway', error)
			return { status: 'declined', reason: 'apply_failed' }
		}
	})
}

async function forEachInSlices<T>(items: T[], visit: (item: T) => void) {
	let sliceStart = performance.now()
	for (const item of items) {
		if (performance.now() - sliceStart > SLICE_MS) {
			await yieldToMainThread()
			sliceStart = performance.now()
		}
		visit(item)
	}
}

async function readPage(editor: Editor, request: TabRenderReadRequest): Promise<TabRenderReply> {
	const lookup = findMcpPage(editor.getPages(), request.page)
	if (!lookup.ok)
		return { status: 'page_not_found', reason: lookup.reason, pageCount: lookup.pageCount }

	const pageId = lookup.page.id as TLPageId
	const ids = [...editor.getPageShapeIds(pageId)]
	const measurements = await measureShapes(editor, ids)

	const shapes: TLShape[] = []
	const bindings: TLArrowBinding[] = []
	for (const id of ids) {
		const shape = editor.getShape(id)
		if (!shape) continue
		shapes.push(shape)
		if (shape.type === 'arrow')
			bindings.push(...editor.getBindingsFromShape<TLArrowBinding>(id, 'arrow'))
	}

	// Clustering runs in one go rather than in slices. It is capped by MAX_CLUSTERING_ATOMS, and it is
	// the caller's own tab that pays for it, where it used to block everyone on the board.
	const read = readMcpPage({
		pageId,
		pageName: lookup.page.name,
		shapes,
		bindings,
		measurements: toShapeMeasurements(measurements),
		clusterIds: request.clusterIds,
	})
	return { status: 'page_read', read }
}

async function measureShapes(editor: Editor, ids: TLShapeId[]) {
	// The editor only loads fonts for the page it's on, and an agent can ask about any of them.
	// Autosizing text has no correct size until its real font has loaded.
	const fonts = new Set<TLFontFace>()
	await forEachInSlices(ids, (id) => {
		for (const font of editor.fonts.getShapeFontFaces(id)) fonts.add(font)
	})
	await Promise.race([
		Promise.allSettled([...fonts].map((font) => editor.fonts.ensureFontIsLoaded(font))),
		sleep(FONT_WAIT_MS),
	])

	const measured: Record<string, ThumbnailShapeMeasurement> = {}
	await forEachInSlices(ids, (id) => {
		const measurement = measureShapeForMcp(editor, id)
		if (measurement) measured[id] = measurement
	})
	return measured
}

async function capturePage(
	editor: Editor,
	request: TabRenderScreenshotRequest
): Promise<TabRenderReply> {
	const { theme, width, height } = request
	const ids = getRequestedShapeIds(editor, request.shapeIds)
	const { bounds, scale } = getExportFrame(editor, ids, width, height)

	const startedAt = performance.now()
	const blob = await renderThumbnailPng(editor, ids, { theme, width, height, bounds, scale })
	// An export that outlives this delay gives up on the shapes it was waiting for, such as a slow
	// image, and resolves anyway with a valid PNG of an empty canvas, which the agent would take for a
	// picture of the board. Nothing in the result gives that away, so the clock has to.
	if (performance.now() - startedAt >= editor.options.maxExportDelayMs) {
		return { status: 'declined', reason: 'export_timed_out' }
	}
	const dataUrl = await FileHelpers.blobToDataUrl(blob)
	return { status: 'captured', base64: dataUrl.slice(dataUrl.indexOf(',') + 1) }
}

// What zoomToBounds would reach on a camera sized to the output, worked out without touching this one.
function getExportFrame(editor: Editor, ids: TLShapeId[], width: number, height: number) {
	const shapes = getRequestedBounds(editor, ids)
	const inset = getThumbnailContentInset(width, height)
	const { zoomSteps } = editor.getCameraOptions()
	const scale = clamp(
		Math.min((width - inset) / shapes.w, (height - inset) / shapes.h),
		zoomSteps[0],
		last(zoomSteps)!
	)
	const w = width / scale
	const h = height / scale
	return { bounds: new Box(shapes.midX - w / 2, shapes.midY - h / 2, w, h), scale }
}

// Not setTimeout: a hidden tab clamps those to once a second, which would turn a slice loop into a
// timeout. Message tasks aren't throttled.
function yieldToMainThread() {
	return new Promise<void>((resolve) => {
		const { port1, port2 } = new MessageChannel()
		port1.onmessage = () => {
			port1.close()
			resolve()
		}
		port2.postMessage(null)
	})
}

// A lost reply needs no handling: the worker times out and tells the agent. Whether the worker took
// the reply is what a write checks before it applies anything. The job id is all the route checks; see
// postTabRenderReply in the sync worker.
async function postTabRenderReply(fileId: string, jobId: string, reply: TabRenderReply) {
	try {
		const response = await fetch(`/api/app/file/${fileId}/tab-render/${jobId}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(reply),
		})
		return response.ok
	} catch (error) {
		console.error('Could not send a tab render reply', error)
		return false
	}
}
