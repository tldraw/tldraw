import { ClerkProvider, SignIn, useAuth } from '@clerk/clerk-react'
import { type App, useApp } from '@modelcontextprotocol/ext-apps/react'
import React, {
	Component,
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { createRoot } from 'react-dom/client'
import {
	type TLAssetStore,
	type TLComponents,
	type TLShape,
	type TLShapeId,
	Editor,
	Tldraw,
	getIndexAbove,
	structuredClone,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'

const PUBLISHABLE_KEY = import.meta.env.VITE_PUBLIC_CLERK_PUBLISHABLE_KEY as string

// --- Clerk auth context ---

interface AuthState {
	isSignedIn: boolean
	clerkReady: boolean
	getToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthState>({
	isSignedIn: false,
	clerkReady: false,
	getToken: async () => null,
})

function ClerkAuthSync({ children }: { children: React.ReactNode }) {
	const { isSignedIn, getToken: clerkGetToken } = useAuth()
	const getToken = useCallback(() => clerkGetToken(), [clerkGetToken])
	return (
		<AuthContext.Provider value={{ isSignedIn: isSignedIn ?? false, clerkReady: true, getToken }}>
			{children}
		</AuthContext.Provider>
	)
}

class ClerkBoundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
	state = { failed: false }
	static getDerivedStateFromError() {
		return { failed: true }
	}
	render() {
		if (this.state.failed) {
			return <>{this.props.children}</>
		}
		return (
			<ClerkProvider
				publishableKey={PUBLISHABLE_KEY}
				routerPush={() => {}}
				routerReplace={() => {}}
			>
				<ClerkAuthSync>{this.props.children}</ClerkAuthSync>
			</ClerkProvider>
		)
	}
}

const EDITOR_HEIGHT = 600
const SYNC_DEBOUNCE_MS = 350
const POLL_INTERVAL_MS = 1500

const DisplayModeContext = createContext<{
	displayMode: 'inline' | 'fullscreen'
	toggleFullscreen?: () => void
}>({ displayMode: 'inline' })

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

/**
 * Non-destructive preview apply: adds new shapes and updates existing ones
 * without deleting user-drawn shapes. Only removes committed shapes that
 * are absent from the preview (e.g. when createFromBlank clears the canvas).
 */
function applyPreviewToEditor(
	editor: Editor,
	snapshot: CanvasSnapshot,
	committedSnapshot: CanvasSnapshot
) {
	const nextShapes = snapshot.shapes.map((shape) => structuredClone(shape))
	const nextShapeIds = new Set(nextShapes.map((s) => s.id))
	const committedIds = new Set(committedSnapshot.shapes.map((s) => s.id))

	editor.store.mergeRemoteChanges(() => {
		editor.run(
			() => {
				const existingIds = [...editor.getCurrentPageShapeIds()]
				const toDelete = existingIds.filter((id) => committedIds.has(id) && !nextShapeIds.has(id))
				if (toDelete.length > 0) {
					editor.deleteShapes(toDelete)
				}

				if (nextShapes.length <= 0) return

				const remainingIds = new Set([...editor.getCurrentPageShapeIds()])
				const pageId = editor.getCurrentPageId()
				const nextIndexByParent = new Map<string, ReturnType<Editor['getHighestIndexForParent']>>()

				const toCreate: TLShape[] = []
				const toUpdate: TLShape[] = []

				for (const shape of nextShapes) {
					const parentId =
						typeof shape.parentId === 'string' && shape.parentId.length > 0
							? shape.parentId
							: pageId
					shape.parentId = parentId

					if (remainingIds.has(shape.id)) {
						toUpdate.push(shape)
					} else {
						if (!nextIndexByParent.has(parentId)) {
							nextIndexByParent.set(parentId, editor.getHighestIndexForParent(parentId))
						}
						const nextIndex = nextIndexByParent.get(parentId)!
						shape.index = nextIndex
						nextIndexByParent.set(parentId, getIndexAbove(nextIndex))
						toCreate.push(shape)
					}
				}

				if (toUpdate.length > 0) editor.updateShapes(toUpdate)
				if (toCreate.length > 0) editor.createShapes(toCreate)
			},
			{ history: 'ignore' }
		)
	})
}

// --- TLDR export ---

function collectPageBindings(editor: Editor) {
	const seen = new Set<string>()
	const bindings: unknown[] = []
	for (const shape of editor.getCurrentPageShapes()) {
		for (const binding of editor.getBindingsInvolvingShape(shape)) {
			if (seen.has(binding.id)) continue
			seen.add(binding.id)
			bindings.push(structuredClone(binding))
		}
	}
	return bindings
}

function buildTldrDocument(editor: Editor) {
	const shapes = [...editor.getCurrentPageShapes()].map((s) => structuredClone(s))
	const bindings = collectPageBindings(editor)

	return {
		tldrawFileFormatVersion: 1,
		schema: {
			schemaVersion: 2,
			sequences: {
				'com.tldraw.store': 4,
				'com.tldraw.asset': 1,
				'com.tldraw.camera': 1,
				'com.tldraw.document': 2,
				'com.tldraw.instance': 25,
				'com.tldraw.instance_page_state': 5,
				'com.tldraw.page': 1,
				'com.tldraw.shape': 4,
				'com.tldraw.instance_presence': 5,
				'com.tldraw.pointer': 1,
			},
		},
		records: [
			{
				typeName: 'page',
				id: 'page:page',
				name: 'Page 1',
				index: 'a1',
				meta: {},
			},
			...shapes,
			...bindings,
		],
	}
}

function exportTldr(editor: Editor) {
	const doc = buildTldrDocument(editor)
	const json = JSON.stringify(doc, null, 2)

	// Copy to clipboard
	navigator.clipboard.writeText(json).catch(() => {
		// Clipboard may be unavailable in some contexts.
	})

	log(json)

	// Download file
	const blob = new Blob([json], { type: 'application/json' })
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = 'diagram.tldr'
	a.click()
	URL.revokeObjectURL(url)
}

function SharePanelContent() {
	const editor = useEditor()
	const { displayMode, toggleFullscreen } = useContext(DisplayModeContext)
	return (
		<div className="tlui-share-zone" draggable={false} style={{ display: 'flex', gap: 4 }}>
			{toggleFullscreen && (
				<button
					className="tlui-button tlui-button__normal"
					onClick={toggleFullscreen}
					title={displayMode === 'fullscreen' ? 'Exit fullscreen' : 'Enter fullscreen'}
				>
					{displayMode === 'fullscreen' ? 'Exit fullscreen' : 'Fullscreen'}
				</button>
			)}
			<button
				className="tlui-button tlui-button__normal"
				onClick={() => exportTldr(editor)}
				title="Copy to clipboard and download .tldr file"
			>
				Export .tldr
			</button>
		</div>
	)
}

const tldrawComponents: TLComponents = {
	SharePanel: SharePanelContent,
}

function extractImageFiles(data: DataTransfer | null): File[] {
	if (!data) return []
	const result: File[] = []
	for (const item of data.items) {
		if (item.kind === 'file' && item.type.startsWith('image/')) {
			const file = item.getAsFile()
			if (file) result.push(file)
		}
	}
	if (result.length > 0) return result
	return [...data.files].filter((f) => f.type.startsWith('image/'))
}

function createR2AssetStore(app: App, getToken: () => Promise<string | null>): TLAssetStore {
	return {
		async upload(asset, file) {
			const arrayBuffer = await file.arrayBuffer()
			const bytes = new Uint8Array(arrayBuffer)
			let binary = ''
			for (let i = 0; i < bytes.length; i++) {
				binary += String.fromCharCode(bytes[i])
			}
			const base64 = btoa(binary)

			try {
				const token = await getToken()
				const args: Record<string, string> = {
					filename: file.name || 'image',
					base64,
					contentType: file.type || 'image/png',
				}
				if (token) args.clerkToken = token

				const result = await app.callServerTool({
					name: 'upload_image',
					arguments: args,
				})

				const sc = result?.structuredContent as Record<string, unknown> | undefined
				if (sc?.imageUrl && typeof sc.imageUrl === 'string') {
					log(`Uploaded image to storage: ${sc.imageUrl}`)
					return { src: sc.imageUrl }
				}
			} catch (err) {
				log(`upload_image failed: ${err instanceof Error ? err.message : err}`)
			}

			// Fallback: store as data URL if upload fails or upload_image tool is unavailable
			log('Falling back to data URL for image')
			return {
				src: await new Promise<string>((resolve) => {
					const reader = new FileReader()
					reader.onload = () => resolve(reader.result as string)
					reader.readAsDataURL(file)
				}),
			}
		},

		resolve(asset) {
			return asset.props.src
		},
	}
}

function TldrawCanvas({ app }: { app: App }) {
	const [displayMode, setDisplayMode] = useState<'inline' | 'fullscreen'>('inline')
	const editorRef = useRef<Editor | null>(null)
	const pendingSnapshotRef = useRef<CanvasSnapshot | null>(null)
	const canvasIdRef = useRef<string | null>(null)
	const localVersionRef = useRef(0)
	const pushTimerRef = useRef<number | null>(null)
	const pushInFlightRef = useRef(false)
	const removeStoreListenerRef = useRef<(() => void) | null>(null)
	const saveTimerRef = useRef<number | null>(null)
	const requestShapeIdsRef = useRef<Set<TLShapeId>>(new Set())

	const { isSignedIn, clerkReady, getToken } = useContext(AuthContext)
	const isSignedInRef = useRef(isSignedIn)
	const getTokenRef = useRef(getToken)
	getTokenRef.current = getToken
	const assetStore = useMemo(() => createR2AssetStore(app, () => getTokenRef.current()), [app])
	const [showAuthPrompt, setShowAuthPrompt] = useState(false)
	const pendingImageFilesRef = useRef<File[]>([])

	useEffect(() => {
		isSignedInRef.current = isSignedIn
		if (isSignedIn) {
			setShowAuthPrompt(false)
			const pendingFiles = pendingImageFilesRef.current
			if (pendingFiles.length > 0) {
				pendingImageFilesRef.current = []
				const editor = editorRef.current
				if (editor) {
					editor.putExternalContent({ type: 'files', files: pendingFiles }).catch(() => {})
				}
			}
		}
	}, [isSignedIn])

	const toggleFullscreen = useCallback(async () => {
		const newMode = displayMode === 'fullscreen' ? 'inline' : 'fullscreen'
		try {
			const result = await app.requestDisplayMode({ mode: newMode })
			const actualMode = result.mode === 'fullscreen' ? 'fullscreen' : 'inline'
			setDisplayMode(actualMode)
			log(`Display mode: ${actualMode}`)
		} catch (err) {
			log(`Display mode change failed: ${err instanceof Error ? err.message : err}`)
		}
	}, [app, displayMode])

	const displayModeCtx = useMemo(
		() => ({ displayMode, toggleFullscreen }),
		[displayMode, toggleFullscreen]
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

			const container = editor.getContainer()

			const onDrop = (e: DragEvent) => {
				const imageFiles = extractImageFiles(e.dataTransfer)
				if (imageFiles.length > 0 && !isSignedInRef.current) {
					e.preventDefault()
					e.stopPropagation()
					pendingImageFilesRef.current = imageFiles
					setShowAuthPrompt(true)
				}
			}

			const onPaste = (e: ClipboardEvent) => {
				const imageFiles = extractImageFiles(e.clipboardData)
				if (imageFiles.length === 0) return
				if (!isSignedInRef.current) {
					e.preventDefault()
					e.stopPropagation()
					pendingImageFilesRef.current = imageFiles
					setShowAuthPrompt(true)
					return
				}
				e.preventDefault()
				e.stopPropagation()
				const ed = editorRef.current
				if (ed) {
					ed.putExternalContent({ type: 'files', files: imageFiles }).catch(() => {})
				}
			}

			container.addEventListener('drop', onDrop, { capture: true })
			document.addEventListener('paste', onPaste, { capture: true })

			const prevRemoveListener = removeStoreListenerRef.current
			removeStoreListenerRef.current = () => {
				prevRemoveListener?.()
				container.removeEventListener('drop', onDrop, { capture: true })
				document.removeEventListener('paste', onPaste, { capture: true })
			}

			// Apply any snapshot that arrived before the editor was ready
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
		<DisplayModeContext.Provider value={displayModeCtx}>
			<div
				style={{
					width: '100%',
					height: displayMode === 'fullscreen' ? '100vh' : EDITOR_HEIGHT,
					position: 'relative',
				}}
			>
				<Tldraw
					assets={assetStore}
					licenseKey="tldraw-claude---chatgpt-mcp-app-2027-02-26/WyI5NFRNbWVmbiIsWyIqLmNsYXVkZW1jcGNvbnRlbnQuY29tIiwiKi53ZWItc2FuZGJveC5vYWl1c2VyY29udGVudC5jb20iXSwxNiwiMjAyNy0wMi0yNiJd.5dV7DhEo4Ms3gr9PJ8qCFrmRrgh0XNYaBMJe299DvEDiNAf8imZeCSAkpmFD2Vcuw6H2uXJfBQkda6zKdnnEdA"
					onMount={handleMount}
					components={tldrawComponents}
				/>
				{showAuthPrompt && (
					<div
						style={{
							position: 'absolute',
							inset: 0,
							background: 'rgba(0,0,0,0.45)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							zIndex: 1000,
						}}
						onClick={() => setShowAuthPrompt(false)}
					>
						<div onClick={(e) => e.stopPropagation()}>
							{clerkReady ? (
								<SignIn withSignUp />
							) : (
								<div
									style={{
										background: 'white',
										borderRadius: 8,
										padding: '24px 28px',
										textAlign: 'center',
										maxWidth: 300,
										boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
									}}
								>
									<p style={{ margin: '0 0 16px', fontSize: 14, color: '#111' }}>
										Sign in is currently unavailable.
									</p>
									<button
										onClick={() => setShowAuthPrompt(false)}
										style={{
											padding: '8px 16px',
											background: 'transparent',
											color: '#555',
											border: '1px solid #ddd',
											borderRadius: 6,
											cursor: 'pointer',
											fontSize: 14,
										}}
									>
										Dismiss
									</button>
								</div>
							)}
						</div>
					</div>
				)}
			</div>
		</DisplayModeContext.Provider>
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
		<ClerkBoundary>
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
		</ClerkBoundary>
	)
}

createRoot(document.getElementById('root')!).render(<McpApp />)
