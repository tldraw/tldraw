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

// --- Canvas-scoped localStorage persistence ---

let currentSessionId: string | null = null
let currentCanvasId: string | null = null

export function setCurrentSessionId(id: string): void {
	currentSessionId = id
}

export function setCurrentCanvasId(id: string): void {
	currentCanvasId = id
}

export function getCurrentCanvasId(): string | null {
	return currentCanvasId
}

function localStorageKey(checkpointId: string): string {
	if (currentCanvasId) return `tldraw:canvas:${currentCanvasId}:${checkpointId}`
	if (currentSessionId) return `tldraw:${currentSessionId}:${checkpointId}`
	return `tldraw:${checkpointId}`
}

function parseSnapshotData(
	raw: string
): { shapes: TLShape[]; assets: TLAsset[]; bindings: TLBindingCreate[] } | null {
	const parsed = JSON.parse(raw)
	// Backwards compat: old format was a plain array of shapes
	if (Array.isArray(parsed)) {
		const shapes = parsed.filter(
			(s: unknown): s is TLShape =>
				isPlainObject(s) && typeof s.id === 'string' && typeof s.type === 'string'
		)
		if (parsed.length > 0 && shapes.length === 0) return null
		return { shapes, assets: [], bindings: [] }
	}
	if (!isPlainObject(parsed) || !Array.isArray(parsed.shapes)) return null
	const shapes = parsed.shapes.filter(
		(s: unknown): s is TLShape =>
			isPlainObject(s) && typeof s.id === 'string' && typeof s.type === 'string'
	)
	if (parsed.shapes.length > 0 && shapes.length === 0) return null
	const assets = (Array.isArray(parsed.assets) ? parsed.assets : []).filter(
		(a: unknown): a is TLAsset => isPlainObject(a) && typeof a.id === 'string'
	)
	const bindings = (Array.isArray(parsed.bindings) ? parsed.bindings : []) as TLBindingCreate[]
	return { shapes, assets, bindings }
}

export function loadLocalSnapshot(
	checkpointId: string
): { shapes: TLShape[]; assets: TLAsset[]; bindings: TLBindingCreate[] } | null {
	try {
		// eslint-disable-next-line tldraw/no-direct-storage
		const raw = localStorage.getItem(localStorageKey(checkpointId))
		if (!raw) return null
		return parseSnapshotData(raw)
	} catch {
		return null
	}
}

export function saveLocalSnapshot(
	checkpointId: string,
	shapes: TLShape[],
	assets: TLAsset[] = [],
	bindings: TLBindingCreate[] = []
): void {
	const scopeId = currentCanvasId ?? currentSessionId
	if (!scopeId) return
	try {
		// eslint-disable-next-line tldraw/no-direct-storage
		localStorage.setItem(
			localStorageKey(checkpointId),
			JSON.stringify({ shapes, assets, bindings })
		)
		const latestKey = currentCanvasId
			? `tldraw:canvas:${currentCanvasId}:latest`
			: `tldraw:${currentSessionId}:latest`
		// eslint-disable-next-line tldraw/no-direct-storage
		localStorage.setItem(latestKey, checkpointId)
	} catch {
		// localStorage may be full or unavailable.
	}
}

export function getLatestCheckpointSnapshot(): {
	shapes: TLShape[]
	assets: TLAsset[]
	bindings: TLBindingCreate[]
} | null {
	const scopeId = currentCanvasId ?? currentSessionId
	if (!scopeId) return null
	try {
		const latestKey = currentCanvasId
			? `tldraw:canvas:${currentCanvasId}:latest`
			: `tldraw:${currentSessionId}:latest`
		// eslint-disable-next-line tldraw/no-direct-storage
		const latestId = localStorage.getItem(latestKey)
		if (!latestId) return null
		return loadLocalSnapshot(latestId)
	} catch {
		return null
	}
}

// --- Embedded bootstrap ---

declare global {
	interface Window {
		__TLDRAW_BOOTSTRAP__?: unknown
	}
}

export function getEmbeddedBootstrap(): {
	sessionId: string
	canvasId?: string
	checkpointId?: string
	isDev: boolean
	workerOrigin?: string
	mcpSessionId?: string
	snapshot?: CanvasSnapshot
} | null {
	const data = window.__TLDRAW_BOOTSTRAP__
	if (!isPlainObject(data)) return null
	const sessionId = typeof data.sessionId === 'string' ? data.sessionId : null
	if (!sessionId) return null

	const canvasId = typeof data.canvasId === 'string' ? data.canvasId : undefined
	const checkpointId = typeof data.checkpointId === 'string' ? data.checkpointId : undefined
	const isDev = data.isDev === true
	const workerOrigin = typeof data.workerOrigin === 'string' ? data.workerOrigin : undefined
	const mcpSessionId = typeof data.mcpSessionId === 'string' ? data.mcpSessionId : undefined

	let snapshot: CanvasSnapshot | undefined
	if (Array.isArray(data.shapes)) {
		const shapes = data.shapes.filter(
			(s: unknown): s is TLShape =>
				isPlainObject(s) && typeof s.id === 'string' && typeof s.type === 'string'
		)
		const assets = (Array.isArray(data.assets) ? data.assets : []).filter(
			(a: unknown): a is TLAsset => isPlainObject(a) && typeof a.id === 'string'
		)
		const bindings = (Array.isArray(data.bindings) ? data.bindings : []) as TLBindingCreate[]
		if (data.shapes.length === 0 || shapes.length > 0) {
			snapshot = { shapes, assets, bindings }
		}
	}

	return { sessionId, canvasId, checkpointId, isDev, workerOrigin, mcpSessionId, snapshot }
}

// --- Tool result parsing ---

function toSnapshotShapesFromRecords(value: unknown): TLShape[] | null {
	if (!Array.isArray(value)) return null
	return value.filter(
		(shape): shape is TLShape =>
			isPlainObject(shape) && typeof shape.id === 'string' && typeof shape.type === 'string'
	)
}

function toAssetRecords(value: unknown): TLAsset[] {
	if (!Array.isArray(value)) return []
	return value.filter((a): a is TLAsset => isPlainObject(a) && typeof a.id === 'string')
}

interface CheckpointResult {
	checkpointId: string
	sessionId: string | null
	shapes: TLShape[]
	assets: TLAsset[]
	bindings: TLBindingCreate[]
	action: string | null
	/** True if the server found base shapes to merge with (for create action). */
	hadBaseShapes: boolean
	/** True if the server started from a blank canvas (for create action). */
	newBlankCanvas: boolean
}

function toBindingRecords(value: unknown): TLBindingCreate[] {
	if (!Array.isArray(value)) return []
	return value.filter(
		(b): b is TLBindingCreate =>
			isPlainObject(b) && typeof b.type === 'string' && typeof b.fromId === 'string'
	)
}

export function parseCheckpointFromToolResult(result: unknown): CheckpointResult | null {
	if (!isPlainObject(result)) return null
	const sc = result.structuredContent
	if (!isPlainObject(sc)) return null
	const checkpointId = typeof sc.checkpointId === 'string' ? sc.checkpointId : null
	if (!checkpointId) return null
	const shapes = toSnapshotShapesFromRecords(sc.tldrawRecords)
	if (!shapes) return null

	const assets = toAssetRecords(sc.assets ?? sc.assetRecords)
	const bindings = toBindingRecords(sc.bindings)
	return {
		checkpointId,
		sessionId: typeof sc.sessionId === 'string' ? sc.sessionId : null,
		shapes,
		assets,
		bindings,
		action: typeof sc.action === 'string' ? sc.action : null,
		hadBaseShapes: sc.hadBaseShapes === true,
		newBlankCanvas: sc.newBlankCanvas === true,
	}
}

// --- Snapshot capture + sync ---

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

/**
 * Push model context and persist the editor state to localStorage + server.
 * Returns the captured snapshot so the caller can store it.
 */
export function syncEditorState(
	app: App,
	editor: Editor,
	checkpointId: string | null,
	opts?: { message?: string }
): CanvasSnapshot {
	const snapshot = captureEditorSnapshot(editor)
	pushCanvasContext(app, editor, opts)
	if (checkpointId) {
		saveLocalSnapshot(checkpointId, snapshot.shapes, snapshot.assets, snapshot.bindings ?? [])
		void saveCheckpointToServer(app, checkpointId, editor)
	}
	return snapshot
}

// --- Canvas context push ---

export function pushCanvasContext(app: App, editor: Editor, opts?: { message?: string }) {
	const shapes = [...editor.getCurrentPageShapes()].map((shape) =>
		convertTldrawShapeToFocusedShape(editor, shape)
	)

	const canvasStatus = shapes.length > 0 ? `Current canvas state is attached.` : 'Canvas is empty.'

	const text = opts?.message ? `${opts.message}\n\n${canvasStatus}` : canvasStatus

	void app.updateModelContext({
		content: [{ type: 'text', text }],
		structuredContent: {
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

export async function saveCheckpointToServer(
	app: App,
	checkpointId: string,
	editor: Editor
): Promise<boolean> {
	const shapes = [...editor.getCurrentPageShapes()].map((s) => structuredClone(s))
	const assets = [...editor.getAssets()].map((a) => structuredClone(a))
	const bindings = getEditorBindings(editor)
	const args: Record<string, string> = {
		checkpointId,
		shapesJson: JSON.stringify(shapes),
	}
	if (assets.length > 0) {
		args.assetsJson = JSON.stringify(assets)
	}
	if (bindings.length > 0) {
		args.bindingsJson = JSON.stringify(bindings)
	}
	if (currentCanvasId) {
		args.canvasId = currentCanvasId
	}
	try {
		const result = await app.callServerTool({
			name: 'save_checkpoint',
			arguments: args,
		})
		return result.isError !== true
	} catch {
		return false
	}
}
