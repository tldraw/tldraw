import { type App, useApp } from '@modelcontextprotocol/ext-apps/react'
import { useCallback, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { type TLShape, Editor, Tldraw, getIndexAbove, structuredClone } from 'tldraw'
import 'tldraw/tldraw.css'
import {
	type FocusedShape,
	FocusedShapeSchema,
	FocusedShapeUpdateSchema,
	convertFocusedShapeToTldrawRecord,
	convertTldrawRecordToFocusedShape,
} from '../focused-shape'
import { healJsonArrayString } from '../parse-json'

const EDITOR_HEIGHT = 600
const SYNC_DEBOUNCE_MS = 350
const POLL_INTERVAL_MS = 1500

interface CanvasSnapshot {
	canvasId?: string
	version: number
	shapes: TLShape[]
}

const debugLines: string[] = []
function log(msg: string) {
	debugLines.push(`${new Date().toISOString().slice(11, 23)} ${msg}`)
	const el = document.getElementById('debug')
	if (el) el.textContent = debugLines.join('\n')
}

window.addEventListener('error', (e) => log(`ERROR: ${e.message}`))
window.addEventListener('unhandledrejection', (e) => log(`REJECTION: ${e.reason}`))

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

function toSnapshotShapesFromRecords(value: unknown): TLShape[] | null {
	if (!Array.isArray(value)) return null
	return value.filter((shape): shape is TLShape => {
		return isRecord(shape) && typeof shape.id === 'string' && typeof shape.type === 'string'
	})
}

function toSnapshotShapesFromFocused(value: unknown): TLShape[] | null {
	if (!Array.isArray(value)) return null
	const shapes: TLShape[] = []
	for (const item of value) {
		const parsed = FocusedShapeSchema.safeParse(item)
		if (!parsed.success) continue
		try {
			shapes.push(convertFocusedShapeToTldrawRecord(parsed.data))
		} catch {
			// Ignore malformed focused-shape entries in snapshot payloads.
		}
	}
	return shapes
}

function parseCanvasSnapshot(value: unknown): CanvasSnapshot | null {
	if (!isRecord(value)) return null
	if (typeof value.version !== 'number') return null
	if (value.canvasId !== undefined && typeof value.canvasId !== 'string') return null

	const shapes =
		toSnapshotShapesFromRecords(value.shapes) ?? toSnapshotShapesFromFocused(value.focusedShapes)
	if (!shapes) return null

	return {
		canvasId: typeof value.canvasId === 'string' ? value.canvasId : undefined,
		version: value.version,
		shapes,
	}
}

function extractSnapshotFromToolResult(result: unknown): CanvasSnapshot | null {
	if (!isRecord(result)) return null
	return parseCanvasSnapshot(result.structuredContent)
}

function parsePartialJsonArray(value: string): unknown[] {
	const trimmed = healJsonArrayString(value.trim())
	if (!trimmed.startsWith('[')) return []

	const candidates: string[] = [trimmed]
	if (!trimmed.endsWith(']')) {
		candidates.push(`${trimmed}]`)
	}

	const withoutTrailingBracket = trimmed.endsWith(']') ? trimmed.slice(0, -1) : trimmed
	const lastComma = withoutTrailingBracket.lastIndexOf(',')
	if (lastComma > 0) {
		candidates.push(`${withoutTrailingBracket.slice(0, lastComma)}]`)
	}

	const lastObjectEnd = withoutTrailingBracket.lastIndexOf('}')
	if (lastObjectEnd >= 0) {
		candidates.push(`${withoutTrailingBracket.slice(0, lastObjectEnd + 1)}]`)
	}

	for (const candidate of new Set(candidates)) {
		try {
			const parsed = JSON.parse(candidate)
			if (Array.isArray(parsed)) return parsed
		} catch {
			// Keep trying best-effort candidates.
		}
	}

	return []
}

function dropPotentiallyIncompleteTail<T>(items: T[]): T[] {
	if (items.length <= 1) return []
	return items.slice(0, -1)
}

function extractToolArguments(input: unknown): Record<string, unknown> | null {
	if (!isRecord(input)) return null
	const args = input.arguments
	return isRecord(args) ? args : input
}

function parsePreviewArray(value: unknown, isPartial: boolean): unknown[] {
	let parsedItems: unknown[] = []
	if (Array.isArray(value)) {
		parsedItems = value
	} else if (typeof value === 'string') {
		parsedItems = parsePartialJsonArray(value)
	} else {
		return []
	}

	return isPartial ? dropPotentiallyIncompleteTail(parsedItems) : parsedItems
}

function parseNewBlankCanvasFlag(value: unknown, isPartial: boolean): boolean | null {
	if (typeof value === 'boolean') return value
	if (typeof value === 'number') return value !== 0
	if (typeof value === 'string') {
		const normalized = value.trim().toLowerCase()
		if (normalized.length === 0) return null
		if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true
		if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false
		if (isPartial) {
			if ('true'.startsWith(normalized)) return true
			if ('false'.startsWith(normalized)) return false
		}
	}
	return null
}

function normalizeShapeId(shapeId: string): string {
	return shapeId.startsWith('shape:') ? shapeId : `shape:${shapeId}`
}

function toSimpleShapeId(shapeId: string): string {
	return shapeId.replace(/^shape:/, '')
}

function deepMerge(base: unknown, patch: unknown): unknown {
	if (!isRecord(base) || !isRecord(patch)) return patch

	const merged: Record<string, unknown> = { ...base }
	for (const [key, value] of Object.entries(patch)) {
		merged[key] = deepMerge(merged[key], value)
	}
	return merged
}

function toCreatePreviewShapes(value: unknown, isPartial: boolean): TLShape[] {
	const candidateItems = parsePreviewArray(value, isPartial)
	const previewShapes: TLShape[] = []
	for (const item of candidateItems) {
		const parsed = FocusedShapeSchema.safeParse(item)
		if (!parsed.success) continue
		try {
			previewShapes.push(convertFocusedShapeToTldrawRecord(parsed.data))
		} catch {
			// Ignore unsupported preview items.
		}
	}
	return previewShapes
}

function toUpdatePreviewShapes(
	value: unknown,
	isPartial: boolean,
	baseShapes: TLShape[]
): TLShape[] {
	const candidateItems = parsePreviewArray(value, isPartial)
	if (candidateItems.length <= 0) return []

	const baseShapesById = new Map<string, TLShape>()
	for (const shape of baseShapes) {
		baseShapesById.set(shape.id, shape)
	}

	const previewShapes: TLShape[] = []
	for (const item of candidateItems) {
		const parsedUpdate = FocusedShapeUpdateSchema.safeParse(item)
		if (!parsedUpdate.success) continue

		const update = parsedUpdate.data
		const existingShape = baseShapesById.get(normalizeShapeId(update.shapeId))
		if (!existingShape) continue

		try {
			const existingFocused = convertTldrawRecordToFocusedShape(existingShape)
			const merged = deepMerge(existingFocused, {
				...update,
				shapeId: toSimpleShapeId(update.shapeId),
				_type: update._type ?? existingFocused._type,
			}) as FocusedShape
			previewShapes.push(convertFocusedShapeToTldrawRecord(merged))
		} catch {
			// Ignore unsupported update previews.
		}
	}

	return previewShapes
}

function toDeletePreviewSnapshot(
	value: unknown,
	isPartial: boolean,
	committed: CanvasSnapshot
): CanvasSnapshot | null {
	const candidateItems = parsePreviewArray(value, isPartial)
	const shapeIds = candidateItems.filter((item): item is string => typeof item === 'string')
	if (shapeIds.length <= 0) return null

	const idsToDelete = new Set(shapeIds.map((shapeId) => normalizeShapeId(shapeId)))
	const filteredShapes = committed.shapes.filter((shape) => !idsToDelete.has(shape.id))
	if (filteredShapes.length === committed.shapes.length) return null

	return {
		canvasId: committed.canvasId,
		version: committed.version,
		shapes: filteredShapes.map((shape) => structuredClone(shape)),
	}
}

function mergeShapesById(base: TLShape[], additions: TLShape[]): TLShape[] {
	const merged = new Map<string, TLShape>()
	for (const shape of base) {
		merged.set(shape.id, structuredClone(shape))
	}
	for (const shape of additions) {
		merged.set(shape.id, structuredClone(shape))
	}
	return [...merged.values()]
}

function applySnapshot(editor: Editor, snapshot: CanvasSnapshot) {
	const nextShapes = snapshot.shapes.map((shape) => structuredClone(shape))

	editor.store.mergeRemoteChanges(() => {
		editor.run(
			() => {
				const existingIds = [...editor.getCurrentPageShapeIds()]
				if (existingIds.length > 0) {
					editor.deleteShapes(existingIds)
				}
				if (nextShapes.length <= 0) return

				const pageId = editor.getCurrentPageId()
				const nextIndexByParent = new Map<string, ReturnType<Editor['getHighestIndexForParent']>>()

				for (const shape of nextShapes) {
					const parentId =
						typeof shape.parentId === 'string' && shape.parentId.length > 0
							? shape.parentId
							: pageId

					shape.parentId = parentId

					if (!nextIndexByParent.has(parentId)) {
						nextIndexByParent.set(parentId, editor.getHighestIndexForParent(parentId))
					}

					const nextIndex = nextIndexByParent.get(parentId)!
					shape.index = nextIndex
					nextIndexByParent.set(parentId, getIndexAbove(nextIndex))
				}

				editor.createShapes(nextShapes)
			},
			{ history: 'ignore' }
		)
	})
}

function LogAllSnapshotsButton({ app }: { app: App }) {
	const handleClick = useCallback(async () => {
		try {
			const result = await app.callServerTool({
				name: 'get_all_canvas_snapshots',
				arguments: {},
			})
			const payload = isRecord(result) ? result.structuredContent : result
			log(JSON.stringify(payload, null, 2))
			log('Logged all canvas snapshots to console')
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err)
			log(`Failed to get all snapshots: ${msg}`)
		}
	}, [app])

	return (
		<button
			onClick={handleClick}
			style={{
				position: 'fixed',
				top: 8,
				right: 8,
				zIndex: 999999,
				padding: '6px 12px',
				fontSize: 12,
				fontFamily: 'monospace',
				background: '#222',
				color: '#0f0',
				border: '1px solid #0f0',
				borderRadius: 4,
				cursor: 'pointer',
			}}
		>
			Log all snapshots
		</button>
	)
}

function TldrawCanvas({ app }: { app: App }) {
	const editorRef = useRef<Editor | null>(null)
	const pendingSnapshotRef = useRef<CanvasSnapshot | null>(null)
	const pendingPreviewSnapshotRef = useRef<CanvasSnapshot | null>(null)
	const canvasIdRef = useRef<string | null>(null)
	const localVersionRef = useRef(0)
	const pushTimerRef = useRef<number | null>(null)
	const pushInFlightRef = useRef(false)
	const previewActiveRef = useRef(false)
	const createFromBlankPreviewRef = useRef(false)
	const committedSnapshotRef = useRef<CanvasSnapshot>({ version: 0, shapes: [] })
	const removeStoreListenerRef = useRef<(() => void) | null>(null)

	const renderPreviewSnapshot = useCallback((previewSnapshot: CanvasSnapshot, summary: string) => {
		previewActiveRef.current = true

		const editor = editorRef.current
		if (!editor) {
			pendingPreviewSnapshotRef.current = previewSnapshot
			return
		}

		applySnapshot(editor, previewSnapshot)
		log(summary)
	}, [])

	const renderPreviewShapes = useCallback(
		(previewShapes: TLShape[], mode: 'create' | 'update', createFromBlank = false) => {
			if (previewShapes.length <= 0) return
			const committed = committedSnapshotRef.current
			const previewSnapshot: CanvasSnapshot = {
				canvasId: committed.canvasId,
				version: committed.version,
				shapes: createFromBlank
					? previewShapes.map((shape) => structuredClone(shape))
					: mergeShapesById(committed.shapes, previewShapes),
			}
			renderPreviewSnapshot(
				previewSnapshot,
				mode === 'create' && createFromBlank
					? `Applied create preview on blank canvas (${previewShapes.length} shape(s))`
					: `Applied ${mode} preview (${previewShapes.length} shape(s))`
			)
		},
		[renderPreviewSnapshot]
	)

	const clearPreviewAndRestoreCommitted = useCallback((reason: string) => {
		if (!previewActiveRef.current) return
		previewActiveRef.current = false
		createFromBlankPreviewRef.current = false
		pendingPreviewSnapshotRef.current = null
		const editor = editorRef.current
		if (editor) {
			applySnapshot(editor, committedSnapshotRef.current)
		}
		log(`Cleared stream preview (${reason})`)
	}, [])

	const applyPreviewFromToolInput = useCallback(
		(input: unknown, isPartial: boolean) => {
			if (!canvasIdRef.current) return
			const committed = committedSnapshotRef.current

			const args = extractToolArguments(input)
			if (!args) return

			const isCreateCall = args.shapesJson !== undefined || args.new_blank_canvas !== undefined
			const isUpdateCall = args.updatesJson !== undefined
			const isDeleteCall = args.shapeIdsJson !== undefined

			if (isUpdateCall || isDeleteCall) {
				createFromBlankPreviewRef.current = false
			}

			if (isCreateCall) {
				if (args.new_blank_canvas === undefined) {
					createFromBlankPreviewRef.current = false
				}
				const blankFlag = parseNewBlankCanvasFlag(args.new_blank_canvas, isPartial)
				if (blankFlag === true) createFromBlankPreviewRef.current = true
				if (blankFlag === false) createFromBlankPreviewRef.current = false
			}

			const createPreviewShapes = toCreatePreviewShapes(args.shapesJson, isPartial)
			if (createPreviewShapes.length > 0) {
				renderPreviewShapes(createPreviewShapes, 'create', createFromBlankPreviewRef.current)
				return
			}

			const updatePreviewShapes = toUpdatePreviewShapes(
				args.updatesJson,
				isPartial,
				committed.shapes
			)
			if (updatePreviewShapes.length > 0) {
				renderPreviewShapes(updatePreviewShapes, 'update')
				return
			}

			const deletePreviewSnapshot = toDeletePreviewSnapshot(args.shapeIdsJson, isPartial, committed)
			if (!deletePreviewSnapshot) return

			const deletedCount = committed.shapes.length - deletePreviewSnapshot.shapes.length
			renderPreviewSnapshot(
				deletePreviewSnapshot,
				`Applied delete preview (${deletedCount} shape(s))`
			)
		},
		[renderPreviewShapes, renderPreviewSnapshot]
	)

	const pushLocalSnapshot = useCallback(async () => {
		const canvasId = canvasIdRef.current
		const editor = editorRef.current
		if (!editor || !canvasId || pushInFlightRef.current) return

		pushInFlightRef.current = true
		try {
			const shapes = editor.getCurrentPageShapes().map((shape) => structuredClone(shape))
			const result = await app.callServerTool({
				name: 'sync_canvas_state',
				arguments: {
					canvasId,
					shapesJson: JSON.stringify(shapes),
				},
			})
			const snapshot = extractSnapshotFromToolResult(result)
			if (snapshot) {
				previewActiveRef.current = false
				localVersionRef.current = snapshot.version
				committedSnapshotRef.current = snapshot
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err)
			log(`sync_canvas_state failed: ${msg}`)
		} finally {
			pushInFlightRef.current = false
		}
	}, [app])

	const schedulePush = useCallback(() => {
		if (pushTimerRef.current !== null) {
			window.clearTimeout(pushTimerRef.current)
		}
		pushTimerRef.current = window.setTimeout(() => {
			pushTimerRef.current = null
			void pushLocalSnapshot()
		}, SYNC_DEBOUNCE_MS)
	}, [pushLocalSnapshot])

	const applyIncomingSnapshot = useCallback((snapshot: CanvasSnapshot) => {
		const incomingCanvasId = snapshot.canvasId
		const currentCanvasId = canvasIdRef.current
		let canvasChanged = false

		if (incomingCanvasId) {
			if (!currentCanvasId) {
				canvasIdRef.current = incomingCanvasId
				canvasChanged = true
				log(`Bound to canvas ${incomingCanvasId}`)
			} else if (currentCanvasId !== incomingCanvasId) {
				canvasIdRef.current = incomingCanvasId
				canvasChanged = true
				log(`Rebound to canvas ${incomingCanvasId}`)
			}
		} else if (currentCanvasId) {
			return
		}

		if (!canvasChanged && snapshot.version <= localVersionRef.current) return

		if (canvasChanged && pushTimerRef.current !== null) {
			window.clearTimeout(pushTimerRef.current)
			pushTimerRef.current = null
		}

		previewActiveRef.current = false
		createFromBlankPreviewRef.current = false
		committedSnapshotRef.current = snapshot

		const editor = editorRef.current
		if (!editor) {
			pendingSnapshotRef.current = snapshot
			return
		}

		applySnapshot(editor, snapshot)
		localVersionRef.current = snapshot.version
		log(`Applied remote snapshot v${snapshot.version}`)
	}, [])

	const pullRemoteSnapshot = useCallback(async () => {
		if (previewActiveRef.current || pushInFlightRef.current) return
		try {
			const result = await app.callServerTool({
				name: 'get_canvas_state',
				arguments: {},
			})
			const snapshot = extractSnapshotFromToolResult(result)
			if (!snapshot) return
			applyIncomingSnapshot(snapshot)
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err)
			log(`get_canvas_state failed: ${msg}`)
		}
	}, [app, applyIncomingSnapshot])

	useEffect(() => {
		log('TldrawCanvas mounted')
		app.onteardown = async () => {
			log('onteardown called')
			return {}
		}

		app.ontoolinputpartial = (input) => {
			if (pushInFlightRef.current) return
			applyPreviewFromToolInput(input, true)
		}

		app.ontoolinput = (input) => {
			if (pushInFlightRef.current) return
			applyPreviewFromToolInput(input, false)
		}

		app.ontoolresult = (result) => {
			if (pushInFlightRef.current) return
			const snapshot = extractSnapshotFromToolResult(result)
			if (!snapshot) {
				// clearPreviewAndRestoreCommitted('non-canvas tool result')
				return
			}
			applyIncomingSnapshot(snapshot)
		}

		app.ontoolcancelled = (params) => {
			const reason = params.reason ?? 'tool cancelled'
			clearPreviewAndRestoreCommitted(reason)
		}

		void pullRemoteSnapshot()
		const pollId = window.setInterval(() => {
			void pullRemoteSnapshot()
		}, POLL_INTERVAL_MS)

		return () => {
			window.clearInterval(pollId)
			if (pushTimerRef.current !== null) {
				window.clearTimeout(pushTimerRef.current)
				pushTimerRef.current = null
			}
			removeStoreListenerRef.current?.()
			removeStoreListenerRef.current = null
			log('TldrawCanvas unmounted!')
		}
	}, [
		app,
		applyIncomingSnapshot,
		applyPreviewFromToolInput,
		clearPreviewAndRestoreCommitted,
		pullRemoteSnapshot,
	])

	const handleMount = useCallback(
		(editor: Editor) => {
			log('Tldraw editor onMount fired')
			editorRef.current = editor

			removeStoreListenerRef.current?.()
			removeStoreListenerRef.current = editor.store.listen(
				() => {
					schedulePush()
				},
				{ source: 'user', scope: 'document' }
			)

			const pendingSnapshot = pendingSnapshotRef.current
			if (pendingSnapshot) {
				pendingSnapshotRef.current = null
				applySnapshot(editor, pendingSnapshot)
				localVersionRef.current = pendingSnapshot.version
			}

			const pendingPreviewSnapshot = pendingPreviewSnapshotRef.current
			if (pendingPreviewSnapshot) {
				pendingPreviewSnapshotRef.current = null
				applySnapshot(editor, pendingPreviewSnapshot)
			}
		},
		[schedulePush]
	)

	return (
		<div style={{ width: '100%', height: EDITOR_HEIGHT, position: 'relative' }}>
			<Tldraw
				licenseKey="tldraw-claude-mcp-content-2027-01-12/WyJ4c0lDTDVaTCIsWyIqLmNsYXVkZW1jcGNvbnRlbnQuY29tIl0sMTYsIjIwMjctMDEtMTIiXQ.RAN4FAIUQ8hjQl6Brwa9CKlZFontsjf/W3xk+gl+PThOE0M4sIT7RzWWykYSj/HjsAwCoPpJ2OsImBZIw71Yag"
				onMount={handleMount}
			/>
		</div>
	)
}

function McpApp() {
	const handleAppCreated = useCallback((instance: App) => {
		log('App created via useApp')
		instance.onerror = (err) => log(`App.onerror: ${err}`)
		instance.onhostcontextchanged = (ctx) => {
			log(`hostcontext: ${JSON.stringify(ctx)}`)
		}
	}, [])

	const { app, isConnected, error } = useApp({
		appInfo: { name: 'tldraw', version: '1.0.0' },
		capabilities: {},
		onAppCreated: handleAppCreated,
	})

	useEffect(() => {
		if (!app || !isConnected) return
		const connectedApp = app

		let cancelled = false

		async function sendInitialSize() {
			try {
				log('Connected!')
				await connectedApp.requestDisplayMode({ mode: 'inline' })
				if (!cancelled) {
					log('App ready, rendering tldraw')
				}
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err)
				if (!cancelled) log(`Error sending initial ui request: ${msg}`)
			}
		}

		void sendInitialSize()
		return () => {
			cancelled = true
			log('McpApp cleanup')
		}
	}, [app, isConnected])

	const status = isConnected ? 'ready' : 'connecting'

	return (
		<div>
			<div
				id="debug"
				style={{
					position: 'fixed',
					bottom: 0,
					left: 0,
					right: 0,
					background: 'rgba(0,0,0,0.85)',
					color: '#0f0',
					fontFamily: 'monospace',
					fontSize: 11,
					padding: 8,
					zIndex: 999999,
					maxHeight: 150,
					overflow: 'auto',
					whiteSpace: 'pre',
				}}
			>
				{debugLines.join('\n')}
			</div>
			{error ? (
				<div style={{ padding: 20, color: 'red' }}>Error: {error.message}</div>
			) : !isConnected || !app ? (
				<div style={{ padding: 20, opacity: 0.5 }}>Status: {status}</div>
			) : (
				<>
					<LogAllSnapshotsButton app={app} />
					<TldrawCanvas app={app} />
				</>
			)}
		</div>
	)
}

createRoot(document.getElementById('root')!).render(<McpApp />)
