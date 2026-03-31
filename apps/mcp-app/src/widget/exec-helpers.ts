import {
	Box,
	type Editor,
	Mat,
	Vec,
	clamp,
	createBindingId,
	createShapeId,
	degreesToRadians,
	fitFrameToContent,
	getArrowBindings,
	getDefaultColorTheme,
	radiansToDegrees,
	renderPlaintextFromRichText,
	toRichText,
} from 'tldraw'

function createArrowBetweenShapesFn(editor: Editor) {
	return (fromId: string, toId: string, opts?: { bend?: number; text?: string }) => {
		const arrowId = createShapeId()
		editor.createShape({
			id: arrowId,
			type: 'arrow',
			props: {
				...(opts?.text ? { text: toRichText(opts.text) } : {}),
				...(opts?.bend != null ? { bend: opts.bend } : {}),
			},
		})
		editor.createBindings([
			{
				id: createBindingId(),
				type: 'arrow',
				fromId: arrowId,
				toId: fromId as any,
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
				toId: toId as any,
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

export function createExecHelpers(editor: Editor) {
	const helpers = {
		toRichText,
		renderPlaintextFromRichText,
		createShapeId,
		createBindingId,
		Box,
		Vec,
		Mat,
		clamp,
		degreesToRadians,
		radiansToDegrees,
		getDefaultColorTheme,
		getArrowBindings,
		fitFrameToContent,
		createArrowBetweenShapes: createArrowBetweenShapesFn(editor),
	}

	return helpers
}

export type ExecHelpers = ReturnType<typeof createExecHelpers>

const EXEC_TIMEOUT_MS = 10_000

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
		toRichText,
		renderPlaintextFromRichText,
		createShapeId,
		createBindingId,
		Box,
		Vec,
		Mat,
		clamp,
		degreesToRadians,
		radiansToDegrees,
		getDefaultColorTheme,
		getArrowBindings,
		fitFrameToContent,
		createArrowBetweenShapes,
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
	const helpers = createExecHelpers(editor)

	try {
		const runExec = await loadExecModule(code)

		const result = await Promise.race([
			runExec({ editor, helpers }),
			new Promise((_, reject) =>
				setTimeout(
					() => reject(new Error(`Execution timed out after ${EXEC_TIMEOUT_MS}ms`)),
					EXEC_TIMEOUT_MS
				)
			),
		])

		return { success: true, result: serializeResult(result) }
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err)
		return { success: false, error: message }
	}
}
