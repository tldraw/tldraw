import {
	TLCustomServerEvent,
	TabRenderDeclineReason,
	TabRenderReply,
	TabRenderRequest,
	ThumbnailShapeMeasurement,
} from '@tldraw/dotcom-shared'
import {
	Box,
	Editor,
	FileHelpers,
	TLPageId,
	TLShapeId,
	clamp,
	compact,
	fetch,
	last,
	sleep,
} from 'tldraw'
import {
	getThumbnailContentInset,
	measureShapeForMcp,
	renderThumbnailPng,
} from '../../utils/boardCapture'

// Answers MCP tool calls from this tab, so the user's agent doesn't wait on a Browser Run session for
// something this editor can already work out. See "Rendering in an open tab" in
// browser-run-thumbnails.md.
//
// This runs in the tab someone may be drawing in, so it only ever reads: the camera, the current page
// and the selection stay put, which is why it computes an export frame rather than borrowing the
// render page's zoom-to-fit. And a job this tab can't answer is declined rather than attempted — the
// worker has a fallback, and an answer that costs the user a dropped frame is worse than a slow one.

type TabRenderEvent = Extract<TLCustomServerEvent, { type: 'mcp_tab_render' }>
type CaptureRequest = Extract<TabRenderRequest, { mode: 'screenshot' }>

// Time budget per slice of a measure. Geometry is cached for the page in view, but a first measure of
// another page lays out all of its text, which on a big page is long enough to be felt.
const MEASURE_SLICE_MS = 8

// Well inside the worker's measure timeout: text measured against a fallback font is a slightly wrong
// answer, and no answer costs the whole Browser Run fallback.
const FONT_WAIT_MS = 1_500

export async function answerTabRender(
	editor: Editor | null,
	fileId: string,
	{ jobId, request }: TabRenderEvent
) {
	const reply = (body: TabRenderReply) => postTabRenderReply(fileId, jobId, body)

	const refusal = getRefusal(editor, request)
	if (refusal || !editor) {
		await reply({ status: 'declined', reason: refusal ?? 'editor_not_ready' })
		return
	}

	// Not awaited: the ack only has to arrive, and work shouldn't wait on the round trip.
	void reply({ status: 'accepted' })
	try {
		await reply(await doTabRender(editor, request))
	} catch (error) {
		console.error('Could not answer a tab render job', error)
		await reply({ status: 'declined', reason: 'failed' })
	}
}

function getRefusal(
	editor: Editor | null,
	request: TabRenderRequest
): TabRenderDeclineReason | undefined {
	if (!editor) return 'editor_not_ready'
	const pageId = request.pageId as TLPageId
	if (!editor.getPage(pageId)) return 'page_missing'
	if (request.mode === 'screenshot') {
		// The export draws from the current page's rendering shapes, and switching a user's page
		// underneath them to take a picture is not an option.
		if (editor.getCurrentPageId() !== pageId) return 'page_not_current'
		if (getShapesOnCurrentPage(editor, request.shapeIds).length === 0) return 'shapes_missing'
	}
	return undefined
}

function doTabRender(editor: Editor, request: TabRenderRequest): Promise<TabRenderReply> {
	return request.mode === 'measure'
		? measurePage(editor, request.pageId as TLPageId)
		: capturePage(editor, request)
}

async function measurePage(editor: Editor, pageId: TLPageId): Promise<TabRenderReply> {
	const ids = [...editor.getPageShapeIds(pageId)]

	// The editor only loads fonts for the page it's on, and an agent can ask about any of them.
	// Autosizing text has no correct size until its real font has loaded.
	const fonts = new Set(ids.flatMap((id) => editor.fonts.getShapeFontFaces(id)))
	await Promise.race([
		Promise.allSettled([...fonts].map((font) => editor.fonts.ensureFontIsLoaded(font))),
		sleep(FONT_WAIT_MS),
	])

	const shapes: Record<string, ThumbnailShapeMeasurement> = {}
	let sliceStart = performance.now()
	for (const id of ids) {
		if (performance.now() - sliceStart > MEASURE_SLICE_MS) {
			await yieldToMainThread()
			sliceStart = performance.now()
		}
		const measured = measureShapeForMcp(editor, id)
		if (measured) shapes[id] = measured
	}
	return { status: 'measured', shapes }
}

async function capturePage(editor: Editor, request: CaptureRequest): Promise<TabRenderReply> {
	const { theme, width, height } = request
	const ids = getShapesOnCurrentPage(editor, request.shapeIds)
	const { bounds, scale } = getExportFrame(editor, ids, width, height)
	const blob = await renderThumbnailPng(editor, ids, { theme, width, height, bounds, scale })
	const dataUrl = await FileHelpers.blobToDataUrl(blob)
	return { status: 'captured', base64: dataUrl.slice(dataUrl.indexOf(',') + 1) }
}

function getShapesOnCurrentPage(editor: Editor, shapeIds: string[]) {
	const onPage = editor.getCurrentPageShapeIds()
	return shapeIds.filter((id): id is TLShapeId => onPage.has(id as TLShapeId))
}

// The rectangle and zoom the render page reaches by calling zoomToBounds on its own disposable
// camera, worked out without touching this one. The two have to frame alike: the same shapes should
// read the same whether Browser Run drew them or a tab did.
function getExportFrame(editor: Editor, ids: TLShapeId[], width: number, height: number) {
	const shapes = Box.Common(compact(ids.map((id) => editor.getShapePageBounds(id))))
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

// A lost reply needs no handling: the worker times out and falls back to Browser Run.
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
