import type { App } from '@modelcontextprotocol/ext-apps/react'
import type { TLAsset, TLBindingCreate, TLShape } from 'tldraw'
import { Editor, structuredClone } from 'tldraw'
import { convertTldrawRecordToFocusedShape } from '../focused-shape-converters'
import type { FocusedShape } from '../focused-shape-schema'
import type { MCP_APP_HOST_NAMES } from '../shared/types'
import { isPlainObject } from '../shared/utils'

export interface CanvasSnapshot {
	shapes: TLShape[]
	assets: TLAsset[]
	bindings?: TLBindingCreate[]
}

// --- Session-scoped localStorage persistence ---

let currentSessionId: string | null = null

export function setCurrentSessionId(id: string): void {
	currentSessionId = id
}

export function getCurrentSessionId(): string | null {
	return currentSessionId
}

function localStorageKey(checkpointId: string): string {
	if (!currentSessionId) return `tldraw:${checkpointId}`
	return `tldraw:${currentSessionId}:${checkpointId}`
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
		return shapes.length > 0 ? { shapes, assets: [], bindings: [] } : null
	}
	if (!isPlainObject(parsed)) return null
	const shapes = (Array.isArray(parsed.shapes) ? parsed.shapes : []).filter(
		(s: unknown): s is TLShape =>
			isPlainObject(s) && typeof s.id === 'string' && typeof s.type === 'string'
	)
	const assets = (Array.isArray(parsed.assets) ? parsed.assets : []).filter(
		(a: unknown): a is TLAsset => isPlainObject(a) && typeof a.id === 'string'
	)
	const bindings = (Array.isArray(parsed.bindings) ? parsed.bindings : []) as TLBindingCreate[]
	return shapes.length > 0 ? { shapes, assets, bindings } : null
}

export function loadLocalSnapshot(
	checkpointId: string
): { shapes: TLShape[]; assets: TLAsset[]; bindings: TLBindingCreate[] } | null {
	try {
		// eslint-disable-next-line no-restricted-syntax
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
	if (!currentSessionId) return
	try {
		// eslint-disable-next-line no-restricted-syntax
		localStorage.setItem(
			localStorageKey(checkpointId),
			JSON.stringify({ shapes, assets, bindings })
		)
		// Track this as the latest checkpoint for this session
		// eslint-disable-next-line no-restricted-syntax
		localStorage.setItem(`tldraw:${currentSessionId}:latest`, checkpointId)
	} catch {
		// localStorage may be full or unavailable.
	}
}

export function getLatestCheckpointSnapshot(): {
	shapes: TLShape[]
	assets: TLAsset[]
	bindings: TLBindingCreate[]
} | null {
	if (!currentSessionId) return null
	try {
		// eslint-disable-next-line no-restricted-syntax
		const latestId = localStorage.getItem(`tldraw:${currentSessionId}:latest`)
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
	checkpointId?: string
	snapshot?: CanvasSnapshot
	hostName?: MCP_APP_HOST_NAMES
} | null {
	const data = window.__TLDRAW_BOOTSTRAP__
	if (!isPlainObject(data)) return null
	const sessionId = typeof data.sessionId === 'string' ? data.sessionId : null
	if (!sessionId) return null

	const checkpointId = typeof data.checkpointId === 'string' ? data.checkpointId : undefined
	const hostName =
		typeof data.hostName === 'string' ? (data.hostName as MCP_APP_HOST_NAMES) : undefined

	let snapshot: CanvasSnapshot | undefined
	if (Array.isArray(data.shapes) && data.shapes.length > 0) {
		const shapes = data.shapes.filter(
			(s: unknown): s is TLShape =>
				isPlainObject(s) && typeof s.id === 'string' && typeof s.type === 'string'
		)
		const assets = (Array.isArray(data.assets) ? data.assets : []).filter(
			(a: unknown): a is TLAsset => isPlainObject(a) && typeof a.id === 'string'
		)
		const bindings = (Array.isArray(data.bindings) ? data.bindings : []) as TLBindingCreate[]
		if (shapes.length > 0) {
			snapshot = { shapes, assets, bindings }
		}
	}

	return { sessionId, checkpointId, snapshot, hostName }
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

export interface CheckpointResult {
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

// --- Canvas context push ---

export function getEditorFocusedShapes(editor: Editor): FocusedShape[] {
	const shapes: FocusedShape[] = []
	for (const record of editor.getCurrentPageShapes()) {
		try {
			const focused = convertTldrawRecordToFocusedShape(record)
			// Enrich arrow shapes with binding info from the editor
			if (focused._type === 'arrow') {
				const arrowBindings = editor.getBindingsFromShape(record.id, 'arrow')
				for (const binding of arrowBindings) {
					const terminal = (binding.props as { terminal?: string }).terminal
					const targetId = binding.toId.replace(/^shape:/, '')
					if (terminal === 'start') {
						focused.fromId = targetId
					} else if (terminal === 'end') {
						focused.toId = targetId
					}
				}
			}
			shapes.push(focused)
		} catch {
			// Ignore malformed records.
		}
	}
	return shapes
}

export function pushCanvasContext(app: App, editor: Editor) {
	const focusedShapes = getEditorFocusedShapes(editor)
	const text =
		focusedShapes.length > 0
			? `Current canvas shapes:\n${JSON.stringify(focusedShapes, null, 2)}`
			: 'Canvas is empty.'
	app.updateModelContext({ content: [{ type: 'text', text }] })
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

export function saveCheckpointToServer(app: App, checkpointId: string, editor: Editor) {
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
	app
		.callServerTool({
			name: 'save_checkpoint',
			arguments: args,
		})
		.catch(() => {
			// Best-effort; failure is non-fatal.
		})
}
