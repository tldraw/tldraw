import type { App } from '@modelcontextprotocol/ext-apps/react'
import { Editor, structuredClone } from 'tldraw'
import type { TLAsset, TLBindingCreate, TLShape } from 'tldraw'
import { isPlainObject } from '../shared/utils'
import { convertTldrawShapeToFocusedShape } from './focused/to-focused'

export interface CanvasSnapshot {
	shapes: TLShape[]
	assets: TLAsset[]
	bindings?: TLBindingCreate[]
}

// --- Embedded bootstrap ---
// Hosts cache the widget HTML durably, so ONLY deploy-stable data may be
// injected here (the method map is consumed separately by generated-data.ts).

declare global {
	interface Window {
		__TLDRAW_BOOTSTRAP__?: unknown
	}
}

export function getEmbeddedBootstrap(): {
	isDev: boolean
	workerOrigin?: string
} | null {
	const data = window.__TLDRAW_BOOTSTRAP__
	if (!isPlainObject(data)) return null
	return {
		isDev: data.isDev === true,
		workerOrigin: typeof data.workerOrigin === 'string' ? data.workerOrigin : undefined,
	}
}

// --- Snapshot capture ---

/**
 * Capture the current editor state as a cloned snapshot.
 */
export function captureEditorSnapshot(editor: Editor): CanvasSnapshot {
	return {
		shapes: [...editor.getCurrentPageShapes()].map((s) => structuredClone(s)),
		assets: [...editor.getAssets()].map((a) => structuredClone(a)),
		bindings: getEditorBindings(editor),
	}
}

export function getEditorBindings(editor: Editor): TLBindingCreate[] {
	const bindings: TLBindingCreate[] = []
	for (const record of editor.getCurrentPageShapes()) {
		if (record.type !== 'arrow') continue
		const arrowBindings = editor.getBindingsFromShape(record.id, 'arrow')
		for (const binding of arrowBindings) {
			bindings.push({
				type: binding.type,
				fromId: binding.fromId,
				toId: binding.toId,
				props: structuredClone(binding.props),
				meta: structuredClone(binding.meta),
			} as TLBindingCreate)
		}
	}
	return bindings
}

/**
 * The focused-format context stored server-side alongside the canvas state,
 * so `get_canvas` can serve model-friendly shapes without a live editor.
 */
export function buildContextJson(editor: Editor): string {
	const shapes = [...editor.getCurrentPageShapes()].map((shape) =>
		convertTldrawShapeToFocusedShape(editor, shape)
	)
	return JSON.stringify({ shapes })
}

// --- Canvas context push (advisory: authoritative state lives server-side) ---

export function pushCanvasContext(
	app: App,
	editor: Editor,
	opts?: { message?: string; canvasId?: string | null }
) {
	const shapes = [...editor.getCurrentPageShapes()].map((shape) =>
		convertTldrawShapeToFocusedShape(editor, shape)
	)

	const canvasLabel = opts?.canvasId ? `canvas ${opts.canvasId}` : 'the canvas'
	const canvasStatus =
		shapes.length > 0
			? `Current state of ${canvasLabel} is attached.`
			: `${canvasLabel[0].toUpperCase()}${canvasLabel.slice(1)} is empty.`

	const text = opts?.message ? `${opts.message}\n\n${canvasStatus}` : canvasStatus

	void app.updateModelContext({
		content: [{ type: 'text', text }],
		structuredContent: {
			...(opts?.canvasId ? { canvasId: opts.canvasId } : {}),
			shapes,
		},
	})
}

export function clearCanvasContext(app: App, opts?: { message?: string }) {
	const text = opts?.message ?? 'Canvas context was cleared.'
	void app.updateModelContext({
		content: [{ type: 'text', text }],
		structuredContent: {
			shapes: [],
		},
	})
}
