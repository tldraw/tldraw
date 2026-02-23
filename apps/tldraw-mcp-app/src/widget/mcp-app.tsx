import { type App, useApp } from '@modelcontextprotocol/ext-apps/react'
import { useCallback, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { type TLShape, Editor, Tldraw, getIndexAbove, structuredClone } from 'tldraw'
import 'tldraw/tldraw.css'

const EDITOR_HEIGHT = 600
const SYNC_DEBOUNCE_MS = 350
const POLL_INTERVAL_MS = 1500

interface CanvasSnapshot {
	canvasId?: string
	version: number
	shapes: TLShape[]
}

// Visible debug log
const debugLines: string[] = []
function log(msg: string) {
	debugLines.push(`${new Date().toISOString().slice(11, 23)} ${msg}`)
	const el = document.getElementById('debug')
	if (el) el.textContent = debugLines.join('\n')
}

window.addEventListener('error', (e) => log(`ERROR: ${e.message}`))
window.addEventListener('unhandledrejection', (e) => log(`REJECTION: ${e.reason}`))

log('Script loaded')

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
	const canvasIdRef = useRef<string | null>(null)
	const localVersionRef = useRef(0)
	const pushTimerRef = useRef<number | null>(null)
	const pushInFlightRef = useRef(false)
	const removeStoreListenerRef = useRef<(() => void) | null>(null)

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
				localVersionRef.current = snapshot.version
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

		app.ontoolresult = (result) => {
			log(`toolresult2: ${JSON.stringify(result)}`)
			if (pushInFlightRef.current) return
			const snapshot = extractSnapshotFromToolResult(result)
			if (!snapshot) return
			applyIncomingSnapshot(snapshot)
		}

		void pullRemoteSnapshot()
		const pollId = window.setInterval(() => {
			if (!pushInFlightRef.current) {
				void pullRemoteSnapshot()
			}
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
	}, [app, applyIncomingSnapshot, pullRemoteSnapshot])

	const handleMount = useCallback(
		(editor: Editor) => {
			log('Tldraw editor onMount fired')
			log('window.location.href: ' + window.location.href)
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
		},
		[schedulePush]
	)

	return (
		<div style={{ width: '100%', height: EDITOR_HEIGHT, position: 'relative' }}>
			<Tldraw
				licenseKey="tldraw-claude-mcp-content-2027-01-12/WyJ4c0lDTDVaTCIsWyIqLmNsYXVkZW1jcGNvbnRlbnQuY29tIl0sMTYsIjIwMjctMDEtMTIiXQ.RAN4FAIUQ8hjQl6Brwa9CKlZFontsjf/W3xk+gl+PThOE0M4sIT7RzWWykYSj/HjsAwCoPpJ2OsImBZIw71Yag"
				onMount={handleMount}
				// cameraOptions={{ isLocked: false }}
			/>
		</div>
	)
}

function McpApp() {
	const handleAppCreated = useCallback((instance: App) => {
		log('App created via useApp')
		instance.onerror = (err) => log(`App.onerror: ${err}`)
		// instance.ontoolinputpartial = (params) => {
		// 	log(`toolinputpartial: ${params}`)
		// }
		// instance.onhostcontextchanged = (ctx) => {
		// 	log(`hostcontext: ctx=${JSON.stringify(ctx, null, 2)}`)
		// }
		// instance.ontoolinput = (params) => {
		// 	log(`toolinput: ${params}`)
		// }
		instance.ontoolresult = (result) => {
			log(`toolresult: ${JSON.stringify(result)}`)
		}

		// instance.onerror = (err) => log(`App.onerror: ${err}`)
		instance.ontoolinputpartial = (params) => {
			log(`toolinputpartial2: ${JSON.stringify(params, null, 2)}`)
		}
		instance.onhostcontextchanged = (ctx) => {
			log(`hostcontext2: ctx=${JSON.stringify(ctx, null, 2)}`)
		}
		instance.ontoolinput = (params) => {
			log(`toolinput2: ${JSON.stringify(params, null, 2)}`)
		}
	}, [])

	const { app, isConnected, error } = useApp({
		appInfo: { name: 'tldraw', version: '1.0.0' },
		capabilities: {
			// availableDisplayModes: ["inline"] //pip doesn't seem to work in claude desktop app :(
		},
		onAppCreated: handleAppCreated,
	})

	useEffect(() => {
		if (!app || !isConnected) return
		const connectedApp = app

		let cancelled = false

		async function sendInitialSize() {
			try {
				log('Connected!')
				// log('Sending size...')
				// await connectedApp.sendSizeChanged({ height: EDITOR_HEIGHT })
				await connectedApp.requestDisplayMode({ mode: 'inline' })
				if (!cancelled) {
					log('Size sent')
					log('App ready, rendering tldraw')
				}
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err)
				if (!cancelled) log(`Error sending size: ${msg}`)
			}
		}

		sendInitialSize()
		return () => {
			cancelled = true
			log('McpApp useEffect cleanup')
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
