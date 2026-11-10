import {
	TabRenderDeclineReason,
	TabRenderReply,
	TabRenderRequest,
	TabRenderScreenshotRequest,
	TabRenderServerEvent,
	ThumbnailShapeMeasurement,
} from '@tldraw/dotcom-shared'
import {
	Box,
	Editor,
	FileHelpers,
	TLFontFace,
	TLPageId,
	TLShapeId,
	clamp,
	fetch,
	last,
	sleep,
} from 'tldraw'
import {
	getRequestedBounds,
	getRequestedShapeIds,
	getThumbnailContentInset,
	measureShapeForMcp,
	renderThumbnailPng,
} from '../../utils/boardCapture'

// Answers MCP tool calls from this tab; see "Rendering in an open tab" in browser-run-thumbnails.md.
//
// This runs in the tab someone may be drawing in, so it only ever reads: the camera, the current page
// and the selection stay put, which is why it computes an export frame rather than borrowing the
// render page's zoom-to-fit. And a job this tab can't answer cheaply is declined rather than
// attempted: the agent can try again, and an answer that costs the user a dropped frame is worse than
// a slow one.

// Time budget per slice of a measure. Geometry is cached for the page in view, but a first measure of
// another page lays out all of its text, which on a big page is long enough to be felt.
const SLICE_MS = 8

// Well inside the worker's measure timeout: text measured against a fallback font is a slightly wrong
// answer, and no answer fails the call.
const FONT_WAIT_MS = 1_500

// An export can't be sliced: it renders every shape in one synchronous flush, on the main thread of a
// tab that may be in use. Past this, the frame it would drop is worth more than the second it saves.
const MAX_EXPORT_SHAPES = 500

// Longer than this in the queue and the worker has likely stopped waiting, so an export would be main
// thread time spent on an answer nobody is waiting for.
const MAX_EXPORT_QUEUE_MS = 5_000

// One at a time, so an agent can't stack exports up on the main thread. Queued rather than declined:
// agents routinely ask for several clusters at once.
let exportQueue: Promise<unknown> = Promise.resolve()

function enqueueExport(run: () => Promise<TabRenderReply>) {
	const result = exportQueue.then(run)
	exportQueue = result.catch(() => {})
	return result
}

export async function answerTabRender(
	editor: Editor | null,
	fileId: string,
	{ jobId, request }: TabRenderServerEvent
) {
	const reply = (body: TabRenderReply) => postTabRenderReply(fileId, jobId, body)

	const refusal = editor ? getRefusal(editor, request) : 'editor_not_ready'
	if (refusal || !editor) {
		await reply({ status: 'declined', reason: refusal ?? 'editor_not_ready' })
		return
	}

	// Not awaited: the ack only has to arrive, and work shouldn't wait on the round trip.
	void reply({ status: 'accepted' })
	try {
		await reply(
			request.mode === 'measure'
				? await measurePage(editor, request.pageId as TLPageId)
				: await queueCapture(editor, request)
		)
	} catch (error) {
		console.error('Could not answer a tab render job', error)
		await reply({ status: 'declined', reason: 'failed' })
	}
}

function getRefusal(editor: Editor, request: TabRenderRequest): TabRenderDeclineReason | undefined {
	const pageId = request.pageId as TLPageId
	if (!editor.getPage(pageId)) return 'page_missing'
	if (request.mode === 'measure') return undefined

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
function queueCapture(editor: Editor, request: TabRenderScreenshotRequest) {
	const queuedAt = Date.now()
	return enqueueExport(async () => {
		const reason =
			Date.now() - queuedAt > MAX_EXPORT_QUEUE_MS ? 'busy' : getRefusal(editor, request)
		return reason ? { status: 'declined', reason } : capturePage(editor, request)
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

async function measurePage(editor: Editor, pageId: TLPageId): Promise<TabRenderReply> {
	const ids = [...editor.getPageShapeIds(pageId)]

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

	const shapes: Record<string, ThumbnailShapeMeasurement> = {}
	await forEachInSlices(ids, (id) => {
		const measured = measureShapeForMcp(editor, id)
		if (measured) shapes[id] = measured
	})
	return { status: 'measured', shapes }
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

// A lost reply needs no handling: the worker times out and tells the agent. No token: the job id is
// what the route checks, and waiting on a token refresh made idle tabs miss the ack window.
async function postTabRenderReply(fileId: string, jobId: string, reply: TabRenderReply) {
	try {
		await fetch(`/api/app/file/${fileId}/tab-render/${jobId}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(reply),
		})
	} catch (error) {
		console.error('Could not send a tab render reply', error)
	}
}
