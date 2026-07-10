import {
	Box,
	type Editor,
	Mat,
	TLShapeId,
	Vec,
	clamp,
	createBindingId,
	createShapeId,
	degreesToRadians,
	fitFrameToContent,
	getArrowBindings,
	radiansToDegrees,
	toRichText,
} from 'tldraw'
import { getRequiredEmbeddedMethodMap } from '../shared/generated-data'
import { createFocusedEditorProxy } from './focused/focused-editor-proxy'

function ensureTldrawShapeId(id: string): TLShapeId {
	if (id.startsWith('shape:')) return id as TLShapeId
	return ('shape:' + id) as TLShapeId
}

function createArrowBetweenShapesFn(editor: Editor) {
	/**
	 * Create an arrow shape that connects two existing shapes by their IDs.
	 *
	 * @param fromId - The shape ID to connect the arrow start to.
	 * @param toId - The shape ID to connect the arrow end to.
	 * @param opts - Optional arrow properties: a signed bend amount for the curve and a text label.
	 *
	 *
	 * @example
	 * createArrowBetweenShapes('box1', 'box2', { text: 'next', bend: 50 })
	 */
	return (fromId: string, toId: string, opts?: { bend?: number; text?: string }) => {
		const arrowId = createShapeId()
		const resolvedFromId = ensureTldrawShapeId(fromId)
		const resolvedToId = ensureTldrawShapeId(toId)
		editor.createShape({
			id: arrowId,
			type: 'arrow',
			props: {
				...(opts?.text ? { richText: toRichText(opts.text) } : {}),
				...(opts?.bend != null ? { bend: opts.bend } : {}),
			},
		})
		editor.createBindings([
			{
				id: createBindingId(),
				type: 'arrow',
				fromId: arrowId,
				toId: resolvedFromId,
				props: {
					terminal: 'start',
					isPrecise: false,
					isExact: false,
					normalizedAnchor: { x: 0.5, y: 0.5 },
				},
			},
			{
				id: createBindingId(),
				type: 'arrow',
				fromId: arrowId,
				toId: resolvedToId,
				props: {
					terminal: 'end',
					isPrecise: false,
					isExact: false,
					normalizedAnchor: { x: 0.5, y: 0.5 },
				},
			},
		])
		return editor
	}
}

const BOX_SHAPES_MARGIN = 40

function boxShapesFn(editor: Editor) {
	/**
	 * Create a rectangle shape around a group of existing shapes with a margin. Also groups the shapes together.
	 *
	 * @param shapesOrIds - Array of shape IDs or shape objects to box around.
	 * @param opts - Optional properties: shapeId, color, fill, text, note.
	 *
	 * @example
	 * boxShapes(['box1', 'box2'], { text: 'Group A', color: 'blue' })
	 */
	return (
		shapesOrIds: (string | { shapeId: string })[],
		opts?: { shapeId?: string; color?: string; fill?: string; text?: string; note?: string }
	) => {
		const ids = shapesOrIds.map((s) =>
			typeof s === 'string' ? ensureTldrawShapeId(s) : ensureTldrawShapeId(s.shapeId)
		)

		const bounds = editor.getShapesPageBounds(ids)
		if (!bounds) return editor

		const boxId = opts?.shapeId ? ensureTldrawShapeId(opts.shapeId) : createShapeId()

		editor.createShape({
			id: boxId,
			type: 'geo',
			x: bounds.x - BOX_SHAPES_MARGIN,
			y: bounds.y - BOX_SHAPES_MARGIN,
			props: {
				geo: 'rectangle',
				w: bounds.w + BOX_SHAPES_MARGIN * 2,
				h: bounds.h + BOX_SHAPES_MARGIN * 2,
				color: (opts?.color ?? 'black') as any,
				fill: 'none' as any,
				align: 'start' as any,
				verticalAlign: 'start' as any,
				...(opts?.text ? { richText: toRichText(opts.text) } : {}),
			},
			meta: { note: opts?.note ?? '' },
		})

		editor.sendToBack([boxId])
		editor.groupShapes([...ids, boxId])

		return editor
	}
}

export function createExecHelpers(editor: Editor) {
	const helpers = {
		createShapeId,
		createBindingId,
		Box,
		Vec,
		Mat,
		clamp,
		degreesToRadians,
		radiansToDegrees,
		getArrowBindings,
		fitFrameToContent,
		createArrowBetweenShapes: createArrowBetweenShapesFn(editor),
		boxShapes: boxShapesFn(editor),
	}

	return helpers
}

type ExecHelpers = ReturnType<typeof createExecHelpers>

const EXEC_TIMEOUT_MS = 10_000

// Exec code runs with fetch/XHR/timers/WebSocket disabled as a lightweight
// sandbox. The globals are captured ONCE here, before any exec can disable
// them, and a depth counter tracks overlapping runs. This makes
// disable/restore re-entrancy safe: hosts can start a second exec while an
// earlier one is still awaiting, and without this a second run would capture
// an already-`undefined` timer as its "original" and restore that, permanently
// clobbering `window.setTimeout` for every later exec.
const REAL_GLOBALS = {
	fetch: typeof window !== 'undefined' ? window.fetch : undefined,
	XMLHttpRequest: typeof window !== 'undefined' ? window.XMLHttpRequest : undefined,
	setInterval: typeof window !== 'undefined' ? window.setInterval : undefined,
	setTimeout: typeof window !== 'undefined' ? window.setTimeout : undefined,
	WebSocket: typeof window !== 'undefined' ? window.WebSocket : undefined,
}

// Never invoke a captured timer as a method of the capture object: native
// window functions brand-check `this`, so `REAL_GLOBALS.setTimeout(...)`
// throws "TypeError: Illegal invocation" in Chromium. That synchronous throw
// used to reject the exec timeout race immediately, which made any model code
// containing an `await` report "Illegal invocation" while its shapes kept
// appearing. Bind once at capture time for safe invocation; the unbound
// originals above are only ever assigned back onto window.
const safeSetTimeout = REAL_GLOBALS.setTimeout
	? REAL_GLOBALS.setTimeout.bind(window)
	: (undefined as never)

let execSandboxDepth = 0

function enterExecSandbox() {
	if (execSandboxDepth++ === 0) {
		;(window as any).fetch = undefined
		;(window as any).XMLHttpRequest = undefined
		;(window as any).setInterval = undefined
		;(window as any).setTimeout = undefined
		;(window as any).WebSocket = undefined
	}
}

function exitExecSandbox() {
	// Only the outermost run restores, so an inner run finishing can't re-enable
	// timers while an outer run is still executing sandboxed code.
	if (execSandboxDepth > 0 && --execSandboxDepth === 0) {
		window.fetch = REAL_GLOBALS.fetch!
		window.XMLHttpRequest = REAL_GLOBALS.XMLHttpRequest!
		window.setInterval = REAL_GLOBALS.setInterval!
		window.setTimeout = REAL_GLOBALS.setTimeout!
		;(window as any).WebSocket = REAL_GLOBALS.WebSocket
	}
}

function serializeResult(result: unknown) {
	try {
		return JSON.parse(JSON.stringify(result))
	} catch {
		return result != null ? String(result) : undefined
	}
}

async function loadExecModule(code: string) {
	const moduleSource = `export default async function runExec({ editor, helpers }) {
	const {
		createShapeId,
		createBindingId,
		Box,
		Vec,
		Mat,
		clamp,
		degreesToRadians,
		radiansToDegrees,
		getArrowBindings,
		fitFrameToContent,
		createArrowBetweenShapes,
		boxShapes,
	} = helpers

	return await (async () => {
${code}
	})()
}`

	const moduleUrl = URL.createObjectURL(new Blob([moduleSource], { type: 'text/javascript' }))
	try {
		return (await import(/* @vite-ignore */ moduleUrl)).default as (args: {
			editor: Editor
			helpers: ExecHelpers
		}) => Promise<unknown>
	} finally {
		URL.revokeObjectURL(moduleUrl)
	}
}

export async function executeCode(
	editor: Editor,
	code: string
): Promise<{ success: boolean; result?: unknown; error?: string }> {
	const focusedEditor = createFocusedEditorProxy(editor, getRequiredEmbeddedMethodMap())
	const helpers = createExecHelpers(editor)

	// Disable fetch, XMLHttpRequest, and timers while the exec code runs.
	enterExecSandbox()

	try {
		const runExec = await loadExecModule(code)
		const result = await Promise.race([
			runExec({ editor: focusedEditor, helpers }),
			new Promise((_, reject) =>
				// Use the pristine, window-bound timer (not the sandboxed,
				// possibly-undefined one).
				safeSetTimeout(
					() => reject(new Error(`Execution timed out after ${EXEC_TIMEOUT_MS}ms`)),
					EXEC_TIMEOUT_MS
				)
			),
		])

		return { success: true, result: serializeResult(result) }
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err)
		return { success: false, error: message }
	} finally {
		exitExecSandbox()
	}
}
