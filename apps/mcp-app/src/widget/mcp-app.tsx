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
	type TLAsset,
	type TLComponents,
	type TLShape,
	type TLShapeId,
	DefaultToolbar,
	Editor,
	Tldraw,
	structuredClone,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { isPlainObject } from '../shared/utils'
import { createR2AssetStore } from './asset-store'
import { debugLines, log } from './debug'
import { exportTldr } from './export-tldr'
import {
	type CanvasSnapshot,
	getLatestCheckpointSnapshot,
	loadLocalSnapshot,
	parseCheckpointFromToolResult,
	pushCanvasContext,
	saveCheckpointToServer,
	saveLocalSnapshot,
} from './persistence'
import { applyPreviewToEditor, applySnapshot, zoomToFitRequestShapes } from './snapshot'
import {
	extractToolArguments,
	mergeShapesById,
	parseNewBlankCanvasFlag,
	toCreatePreviewShapes,
	toDeletePreviewSnapshot,
	toUpdatePreviewShapes,
} from './streaming'

const PUBLISHABLE_KEY = import.meta.env.VITE_PUBLIC_CLERK_PUBLISHABLE_KEY as string
const LICENSE_KEY = import.meta.env.VITE_TLDRAW_LICENSE_KEY as string

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
const SAVE_DEBOUNCE_MS = 500

const DisplayModeContext = createContext<{
	displayMode: 'inline' | 'fullscreen'
	toggleFullscreen: (() => void) | null
	canFullscreen: boolean
	canDownload: boolean
	app: App | null
}>({
	displayMode: 'inline',
	toggleFullscreen: null,
	canFullscreen: true,
	canDownload: true,
	app: null,
})

function SharePanelContent() {
	const editor = useEditor()
	const { displayMode, toggleFullscreen, canFullscreen, canDownload, app } =
		useContext(DisplayModeContext)
	return (
		<div className="tlui-share-zone" draggable={false} style={{ display: 'flex', gap: 4 }}>
			{toggleFullscreen && canFullscreen && (
				<button
					className="tlui-button tlui-button__normal"
					onClick={toggleFullscreen}
					title={displayMode === 'fullscreen' ? 'Exit fullscreen' : 'Enter fullscreen'}
				>
					{displayMode === 'fullscreen' ? 'Exit fullscreen' : 'Fullscreen'}
				</button>
			)}
			{canDownload && (
				<button
					className="tlui-button tlui-button__normal"
					onClick={() => exportTldr(editor, app ?? undefined)}
					title="Copy to clipboard and download .tldr file"
				>
					Export .tldr
				</button>
			)}
		</div>
	)
}

function DynamicToolbar() {
	const { displayMode } = useContext(DisplayModeContext)
	return <DefaultToolbar orientation={displayMode === 'fullscreen' ? 'vertical' : 'horizontal'} />
}

const tldrawComponents: TLComponents = {
	SharePanel: SharePanelContent,
	Toolbar: DynamicToolbar,
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

function TldrawCanvas({ app }: { app: App }) {
	const [displayMode, setDisplayMode] = useState<'inline' | 'fullscreen'>('inline')
	const [containerHeight, setContainerHeight] = useState<number | null>(null)
	const editorRef = useRef<Editor | null>(null)

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
	const pendingSnapshotRef = useRef<CanvasSnapshot | null>(null)
	const pendingPreviewSnapshotRef = useRef<CanvasSnapshot | null>(null)
	const previewActiveRef = useRef(false)
	const createFromBlankPreviewRef = useRef(false)
	const committedSnapshotRef = useRef<CanvasSnapshot>({ shapes: [], assets: [] })
	const checkpointIdRef = useRef<string | null>(null)
	const removeStoreListenerRef = useRef<(() => void) | null>(null)
	const saveTimerRef = useRef<number | null>(null)
	const requestShapeIdsRef = useRef<Set<TLShapeId>>(new Set())

	const toggleFullscreen = useCallback(async () => {
		const newMode = displayMode === 'fullscreen' ? 'inline' : 'fullscreen'

		// Sync current editor state before leaving fullscreen
		if (newMode === 'inline') {
			const editor = editorRef.current
			if (editor) {
				const shapes = [...editor.getCurrentPageShapes()].map((s) => structuredClone(s))
				const assets = [...editor.getAssets()].map((a) => structuredClone(a))
				committedSnapshotRef.current = { shapes, assets }
				pushCanvasContext(app, editor)
				const cpId = checkpointIdRef.current
				if (cpId) {
					saveLocalSnapshot(cpId, shapes, assets)
					saveCheckpointToServer(app, cpId, editor)
				}
			}
		}

		try {
			const result = await app.requestDisplayMode({ mode: newMode })
			const actualMode = result.mode === 'fullscreen' ? 'fullscreen' : 'inline'
			setDisplayMode(actualMode)
			log(`Display mode: ${actualMode}`)
		} catch (err) {
			log(`Display mode change failed: ${err instanceof Error ? err.message : err}`)
		}
	}, [app, displayMode])

	const canFullscreen = useMemo(() => {
		const modes = app.getHostContext()?.availableDisplayModes
		return !modes || modes.includes('fullscreen')
	}, [app])

	const canDownload = useMemo(() => {
		return !!app.getHostCapabilities()?.downloadFile
	}, [app])

	const displayModeCtx = useMemo(
		() => ({ displayMode, toggleFullscreen, canFullscreen, canDownload, app }),
		[displayMode, toggleFullscreen, canFullscreen, canDownload, app]
	)

	const renderPreviewSnapshot = useCallback((previewSnapshot: CanvasSnapshot, summary: string) => {
		previewActiveRef.current = true

		const editor = editorRef.current
		if (!editor) {
			pendingPreviewSnapshotRef.current = previewSnapshot
			return
		}

		applyPreviewToEditor(editor, previewSnapshot, committedSnapshotRef.current)
		zoomToFitRequestShapes(editor, requestShapeIdsRef.current)
		log(summary)
	}, [])

	const renderPreviewShapes = useCallback(
		(previewShapes: TLShape[], mode: 'create' | 'update', createFromBlank = false) => {
			if (previewShapes.length <= 0) return
			for (const shape of previewShapes) {
				requestShapeIdsRef.current.add(shape.id)
			}
			const committed = committedSnapshotRef.current
			const editor = editorRef.current
			const baseShapes = createFromBlank
				? []
				: editor
					? [...editor.getCurrentPageShapes()]
					: committed.shapes
			const previewSnapshot: CanvasSnapshot = {
				shapes: createFromBlank
					? previewShapes.map((shape) => structuredClone(shape))
					: mergeShapesById(baseShapes, previewShapes),
				assets: [],
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

	const scheduleSave = useCallback(() => {
		if (saveTimerRef.current !== null) {
			window.clearTimeout(saveTimerRef.current)
		}
		saveTimerRef.current = window.setTimeout(() => {
			saveTimerRef.current = null
			const editor = editorRef.current
			const cpId = checkpointIdRef.current
			if (!editor) return

			// Push model context
			pushCanvasContext(app, editor)

			// Persist to localStorage + server
			if (cpId) {
				const shapes = [...editor.getCurrentPageShapes()].map((s) => structuredClone(s))
				const assets = [...editor.getAssets()].map((a) => structuredClone(a))
				saveLocalSnapshot(cpId, shapes, assets)
				saveCheckpointToServer(app, cpId, editor)
			}
		}, SAVE_DEBOUNCE_MS)
	}, [app])

	const applyPreviewFromToolInput = useCallback(
		(input: unknown, isPartial: boolean) => {
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

			const editor = editorRef.current
			const liveShapes = editor ? [...editor.getCurrentPageShapes()] : committed.shapes
			const updatePreviewShapes = toUpdatePreviewShapes(args.updatesJson, isPartial, liveShapes)
			if (updatePreviewShapes.length > 0) {
				renderPreviewShapes(updatePreviewShapes, 'update')
				return
			}

			const liveForDelete: CanvasSnapshot = {
				shapes: editor ? [...editor.getCurrentPageShapes()] : committed.shapes,
				assets: [],
			}
			const deletePreviewSnapshot = toDeletePreviewSnapshot(
				args.shapeIdsJson,
				isPartial,
				liveForDelete
			)
			if (!deletePreviewSnapshot) return

			const deletedCount = liveForDelete.shapes.length - deletePreviewSnapshot.shapes.length
			renderPreviewSnapshot(
				deletePreviewSnapshot,
				`Applied delete preview (${deletedCount} shape(s))`
			)
		},
		[renderPreviewShapes, renderPreviewSnapshot]
	)

	useEffect(() => {
		log('TldrawCanvas mounted')

		// Pre-populate with latest checkpoint so streaming preview and update/delete
		// have the existing canvas shapes as their base. This is the key to "forking":
		// when a new tool call starts streaming, the widget already shows the previous
		// canvas, and new shapes stream in on top.
		const latestSnapshot = getLatestCheckpointSnapshot()
		if (latestSnapshot && latestSnapshot.shapes.length > 0) {
			const snapshot: CanvasSnapshot = {
				shapes: latestSnapshot.shapes,
				assets: latestSnapshot.assets,
			}
			committedSnapshotRef.current = snapshot
			const editor = editorRef.current
			if (editor) {
				applySnapshot(editor, snapshot)
			} else {
				pendingSnapshotRef.current = snapshot
			}
			log(`Pre-loaded ${latestSnapshot.shapes.length} shape(s) from latest checkpoint`)
		}

		app.onhostcontextchanged = (ctx) => {
			log(`hostcontext: ${JSON.stringify(ctx)}`)
			const record = ctx as Record<string, unknown>

			const dims = record.containerDimensions
			if (isPlainObject(dims) && typeof dims.height === 'number') {
				setContainerHeight(dims.height)
			}

			if (typeof record.displayMode === 'string') {
				// Sync editor state before host exits fullscreen
				if (record.displayMode !== 'fullscreen') {
					const editor = editorRef.current
					if (editor) {
						const shapes = [...editor.getCurrentPageShapes()].map((s) => structuredClone(s))
						const assets = [...editor.getAssets()].map((a) => structuredClone(a))
						committedSnapshotRef.current = { shapes, assets }
						pushCanvasContext(app, editor)
						const cpId = checkpointIdRef.current
						if (cpId) {
							saveLocalSnapshot(cpId, shapes, assets)
							saveCheckpointToServer(app, cpId, editor)
						}
					}
				}
				const newMode = record.displayMode === 'fullscreen' ? 'fullscreen' : 'inline'
				setDisplayMode(newMode)
			}
		}

		app.onteardown = async () => {
			log('onteardown called')
			return {}
		}

		app.ontoolinputpartial = (input) => {
			applyPreviewFromToolInput(input, true)
		}

		app.ontoolinput = (input) => {
			applyPreviewFromToolInput(input, false)
		}

		app.ontoolresult = (result) => {
			const checkpoint = parseCheckpointFromToolResult(result)
			if (!checkpoint) return

			const {
				checkpointId,
				shapes: resultShapes,
				assets: resultAssets,
				action,
				hadBaseShapes,
				newBlankCanvas,
			} = checkpoint
			checkpointIdRef.current = checkpointId

			// Clear preview state
			previewActiveRef.current = false
			createFromBlankPreviewRef.current = false
			pendingPreviewSnapshotRef.current = null

			// Check localStorage for user edits (handles remount case)
			const localSnapshot = loadLocalSnapshot(checkpointId)
			let finalShapes = localSnapshot ? localSnapshot.shapes : resultShapes
			let finalAssets: TLAsset[] = localSnapshot ? localSnapshot.assets : resultAssets

			// Client-side merge fallback: if the server didn't have base shapes for a create
			// (e.g. server process restarted between tool calls, losing in-memory state)
			// and this wasn't a blank canvas request, merge the new shapes with the latest
			// checkpoint from localStorage.
			if (!localSnapshot && action === 'create' && !hadBaseShapes && !newBlankCanvas) {
				const latestSnapshot = getLatestCheckpointSnapshot()
				if (latestSnapshot && latestSnapshot.shapes.length > 0) {
					log(`Server had no base shapes — merging locally from latest checkpoint`)
					finalShapes = mergeShapesById(latestSnapshot.shapes, resultShapes)
					// Merge assets too
					const assetMap = new Map(latestSnapshot.assets.map((a) => [a.id, a]))
					for (const a of resultAssets) assetMap.set(a.id, a)
					finalAssets = [...assetMap.values()]
				}
			}

			// Capture previous committed IDs for zoom diff fallback
			const previousCommittedIds = new Set(committedSnapshotRef.current.shapes.map((s) => s.id))

			const snapshot: CanvasSnapshot = { shapes: finalShapes, assets: finalAssets }
			committedSnapshotRef.current = snapshot

			const editor = editorRef.current
			if (!editor) {
				pendingSnapshotRef.current = snapshot
				requestShapeIdsRef.current = new Set<TLShapeId>()
				log(`Queued checkpoint ${checkpointId} (editor not ready)`)
				return
			}

			applySnapshot(editor, snapshot)

			// Zoom to fit shapes from this request — but skip if restoring
			// from localStorage (reload/remount case where user may have panned)
			if (!localSnapshot) {
				let zoomShapeIds: Set<TLShapeId> = requestShapeIdsRef.current
				if (zoomShapeIds.size === 0) {
					// No streaming preview happened — compute new shapes from diff
					const newIds = new Set<TLShapeId>()
					for (const shape of finalShapes) {
						if (!previousCommittedIds.has(shape.id)) newIds.add(shape.id)
					}
					zoomShapeIds = newIds
				}
				zoomToFitRequestShapes(editor, zoomShapeIds)
			}
			requestShapeIdsRef.current = new Set<TLShapeId>()

			// Persist to localStorage (ensures it's saved even on first render)
			saveLocalSnapshot(checkpointId, finalShapes, finalAssets)

			// Immediately push checkpoint to server so the next tool call can fork from it.
			// This is critical: the server may restart between tool calls, losing in-memory state.
			saveCheckpointToServer(app, checkpointId, editor)

			pushCanvasContext(app, editor)
			log(
				`Applied checkpoint ${checkpointId} (${finalShapes.length} shapes, ${finalAssets.length} assets)`
			)
		}

		app.ontoolcancelled = (params) => {
			const reason = params.reason ?? 'tool cancelled'
			clearPreviewAndRestoreCommitted(reason)
			requestShapeIdsRef.current = new Set<TLShapeId>()
		}

		return () => {
			if (saveTimerRef.current !== null) {
				window.clearTimeout(saveTimerRef.current)
				saveTimerRef.current = null
			}
			removeStoreListenerRef.current?.()
			removeStoreListenerRef.current = null
			log('TldrawCanvas unmounted!')
		}
	}, [app, applyPreviewFromToolInput, clearPreviewAndRestoreCommitted])

	// Set explicit height on html/body in fullscreen (position:fixed doesn't give body height in iframes)
	useEffect(() => {
		if (displayMode === 'fullscreen' && containerHeight) {
			const h = `${containerHeight}px`
			document.documentElement.style.height = h
			document.body.style.height = h
		} else {
			document.documentElement.style.height = ''
			document.body.style.height = ''
		}
	}, [displayMode, containerHeight])

	const handleMount = useCallback(
		(editor: Editor) => {
			log('Tldraw editor onMount fired')
			editorRef.current = editor

			removeStoreListenerRef.current?.()
			removeStoreListenerRef.current = editor.store.listen(
				() => {
					scheduleSave()
				},
				{ source: 'user', scope: 'document' }
			)

			// Keep viewport center stable when the container resizes (fullscreen toggle).
			// This fires synchronously when tldraw processes the resize, so there's no
			// visible delay. The camera {x,y,z} doesn't change on resize by default —
			// content just shifts because the screen bounds changed. We compensate by
			// nudging the camera by half the bounds delta.
			editor.sideEffects.registerAfterChangeHandler('instance', (prev, next) => {
				const pb = prev.screenBounds
				const nb = next.screenBounds
				const dw = nb.w - pb.w
				const dh = nb.h - pb.h
				if (dw === 0 && dh === 0) return

				const cam = editor.getCamera()
				editor.setCamera({
					x: cam.x + dw / cam.z / 2,
					y: cam.y + dh / cam.z / 2,
					z: cam.z,
				})
			})

			// Auth-gated image drop/paste handlers
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
				log(`Applied pending checkpoint snapshot`)
			}

			const pendingPreviewSnapshot = pendingPreviewSnapshotRef.current
			if (pendingPreviewSnapshot) {
				pendingPreviewSnapshotRef.current = null
				applySnapshot(editor, pendingPreviewSnapshot)
				zoomToFitRequestShapes(editor, requestShapeIdsRef.current)
			}
		},
		[scheduleSave]
	)

	const isFullscreen = displayMode === 'fullscreen'

	return (
		<DisplayModeContext.Provider value={displayModeCtx}>
			<div
				style={
					isFullscreen
						? {
								position: 'fixed',
								top: 0,
								left: 0,
								right: 0,
								bottom: 0,
								zIndex: 9999,
								background: '#fff',
								...(containerHeight ? { height: containerHeight } : {}),
							}
						: {
								width: '100%',
								height: EDITOR_HEIGHT,
								position: 'relative',
							}
				}
			>
				<Tldraw
					licenseKey={LICENSE_KEY}
					assets={assetStore}
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
	}, [])

	const { app, isConnected, error } = useApp({
		appInfo: { name: 'tldraw', version: '1.0.0' },
		capabilities: {},
		onAppCreated: handleAppCreated,
	})

	useEffect(() => {
		if (!app || !isConnected) return

		log('Connected!')

		// Read initial host context without forcing a display mode change.
		// Calling requestDisplayMode({ mode: 'inline' }) here would force the
		// host to exit fullscreen if another widget is already fullscreen.
		const initCtx = app.getHostContext() as Record<string, unknown> | undefined
		if (initCtx) {
			log(`Initial host context: ${JSON.stringify(initCtx)}`)
		}

		return () => {
			log('McpApp cleanup')
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
