import { type App, useApp } from '@modelcontextprotocol/ext-apps/react'
import { useCallback, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { type TLShape, Editor, Tldraw, getIndexAbove, structuredClone } from 'tldraw'
import 'tldraw/tldraw.css'
import { FocusedShapeSchema, convertFocusedShapeToTldrawRecord } from '../focused-shape'

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

function parseCanvasSnapshot(value: unknown): CanvasSnapshot | null {
	if (!isRecord(value)) return null
	if (typeof value.version !== 'number' || !Array.isArray(value.shapes)) return null
	if (value.canvasId !== undefined && typeof value.canvasId !== 'string') return null

	const shapes = value.shapes.filter((shape): shape is TLShape => {
		return isRecord(shape) && typeof shape.id === 'string' && typeof shape.type === 'string'
	})

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
	const trimmed = value.trim()
	if (!trimmed.startsWith('[')) return []

	try {
		const parsed = JSON.parse(trimmed)
		return Array.isArray(parsed) ? parsed : []
	} catch {
		// Best effort for a partially-streamed JSON array.
	}

	const lastObjectEnd = trimmed.lastIndexOf('}')
	if (lastObjectEnd < 0) return []

	try {
		const parsed = JSON.parse(`${trimmed.slice(0, lastObjectEnd + 1)}]`)
		return Array.isArray(parsed) ? parsed : []
	} catch {
		return []
	}
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

function toPreviewShapes(value: unknown, isPartial: boolean): TLShape[] {
	let parsedItems: unknown[] = []
	if (Array.isArray(value)) {
		parsedItems = value
	} else if (typeof value === 'string') {
		parsedItems = parsePartialJsonArray(value)
	} else {
		return []
	}

	const candidateItems = isPartial ? dropPotentiallyIncompleteTail(parsedItems) : parsedItems
	const previewShapes: TLShape[] = []
	for (const item of candidateItems) {
		const parsed = FocusedShapeSchema.safeParse(item)
		if (!parsed.success) continue
		try {
			const converted = convertFocusedShapeToTldrawRecord(parsed.data)
			if (typeof converted.id !== 'string' || typeof converted.type !== 'string') continue
			previewShapes.push(converted as unknown as TLShape)
		} catch {
			// Ignore unsupported preview items.
		}
	}
	return previewShapes
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

function TldrawCanvas({ app }: { app: App }) {
	const editorRef = useRef<Editor | null>(null)
	const pendingSnapshotRef = useRef<CanvasSnapshot | null>(null)
	const pendingPreviewSnapshotRef = useRef<CanvasSnapshot | null>(null)
	const canvasIdRef = useRef<string | null>(null)
	const localVersionRef = useRef(0)
	const pushTimerRef = useRef<number | null>(null)
	const pushInFlightRef = useRef(false)
	const previewActiveRef = useRef(false)
	const committedSnapshotRef = useRef<CanvasSnapshot>({ version: 0, shapes: [] })
	const removeStoreListenerRef = useRef<(() => void) | null>(null)

	const renderPreviewShapes = useCallback((previewShapes: TLShape[]) => {
		if (previewShapes.length <= 0) return
		const committed = committedSnapshotRef.current
		const previewSnapshot: CanvasSnapshot = {
			canvasId: committed.canvasId,
			version: committed.version,
			shapes: mergeShapesById(committed.shapes, previewShapes),
		}
		previewActiveRef.current = true

		const editor = editorRef.current
		if (!editor) {
			pendingPreviewSnapshotRef.current = previewSnapshot
			return
		}

		applySnapshot(editor, previewSnapshot)
		log(`Applied stream preview (${previewShapes.length} shape(s))`)
	}, [])

	const clearPreviewAndRestoreCommitted = useCallback((reason: string) => {
		if (!previewActiveRef.current) return
		previewActiveRef.current = false
		pendingPreviewSnapshotRef.current = null
		const editor = editorRef.current
		if (editor) {
			applySnapshot(editor, committedSnapshotRef.current)
		}
		log(`Cleared stream preview (${reason})`)
	}, [])

	const applyPreviewFromToolInput = useCallback(
		(input: unknown, isPartial: boolean) => {
			const args = extractToolArguments(input)
			if (!args) return

			const rawShapes = args.shapesJson ?? args.shapes
			const previewShapes = toPreviewShapes(rawShapes, isPartial)
			if (previewShapes.length <= 0) return

			renderPreviewShapes(previewShapes)
		},
		[renderPreviewShapes]
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

		if (incomingCanvasId) {
			if (currentCanvasId && currentCanvasId !== incomingCanvasId) return
			if (!currentCanvasId) {
				canvasIdRef.current = incomingCanvasId
				log(`Bound to canvas ${incomingCanvasId}`)
			}
		} else if (currentCanvasId) {
			return
		}

		if (snapshot.version <= localVersionRef.current) return

		previewActiveRef.current = false
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
			log('onteardown called!')
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
				clearPreviewAndRestoreCommitted('non-canvas tool result')
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
				<TldrawCanvas app={app} />
			)}
		</div>
	)
}

createRoot(document.getElementById('root')!).render(<McpApp />)
