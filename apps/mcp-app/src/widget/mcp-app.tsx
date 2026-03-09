import { type App, useApp } from '@modelcontextprotocol/ext-apps/react'
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
	type TLAsset,
	type TLBindingCreate,
	type TLComponents,
	type TLShape,
	type TLShapeId,
	DefaultToolbar,
	DefaultToolbarContent,
	Editor,
	Tldraw,
	TldrawUiIcon,
	structuredClone,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import type { MCP_APP_HOST_NAMES } from '../shared/types'
import {
	MCP_SERVER_DESCRIPTION,
	MCP_SERVER_NAME,
	MCP_SERVER_TITLE,
	MCP_SERVER_VERSION,
	MCP_SERVER_WEBSITE_URL,
} from '../shared/types'
import { isHostCodeEditor } from '../shared/utils'
import { McpAppContext } from './app-context'
import { log } from './debug'
import { exportTldr } from './export-tldr'
import { ImageDropGuard, uiOverrides } from './image-guard'
import {
	type CanvasSnapshot,
	getEditorBindings,
	getEmbeddedBootstrap,
	getLatestCheckpointSnapshot,
	loadLocalSnapshot,
	parseCheckpointFromToolResult,
	pushCanvasContext,
	saveCheckpointToServer,
	saveLocalSnapshot,
	setCurrentSessionId,
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

const LICENSE_KEY = import.meta.env.VITE_TLDRAW_LICENSE_KEY as string

const EDITOR_HEIGHT = 600
const SAVE_DEBOUNCE_MS = 500

function SharePanelContent() {
	const editor = useEditor()
	const hasShapes = useValue('hasShapes', () => editor.getCurrentPageShapeIds().size > 0, [editor])

	const { displayMode, toggleFullscreen, canFullscreen, canDownload, app, lastEditor, hostName } =
		useContext(McpAppContext)

	const isCodeEditor = useMemo(() => {
		if (!hostName) return false
		return isHostCodeEditor(hostName)
	}, [hostName])

	const trackWidgetEvent = useCallback(
		(event: string) => {
			if (!app) return
			app
				.callServerTool({
					name: 'event',
					arguments: { event },
				})
				.catch(() => {
					// no-op best effort
				})
		},
		[app]
	)

	const handleBuildItClick = useCallback(() => {
		if (!app) return
		trackWidgetEvent('build_it_clicked')
		const messageText =
			lastEditor === 'user'
				? "Hey I've made some edits to the canvas. The new canvas state is attached. Take the changes and implement them in the codebase."
				: 'Use the attached canvas state to implement this in the codebase.'
		app.sendMessage({
			role: 'user',
			content: [
				{
					type: 'text',
					text: messageText,
				},
			],
		})
	}, [app, lastEditor, trackWidgetEvent])

	return (
		<div className="tlui-share-zone" draggable={false} style={{ display: 'flex', gap: 4 }}>
			{canDownload && (
				<button
					className="tlui-button tlui-button__low"
					onClick={() => exportTldr(editor, app ?? undefined)}
					title="Copy to clipboard and download .tldr file"
				>
					<TldrawUiIcon label="Download .tldr file" icon="download" />
				</button>
			)}
			{toggleFullscreen && canFullscreen && (
				<button
					className="tlui-button tlui-button__low"
					onClick={toggleFullscreen}
					title={displayMode === 'fullscreen' ? 'Exit fullscreen' : 'Enter fullscreen'}
				>
					{displayMode === 'fullscreen' ? 'Exit fullscreen' : 'Fullscreen'}
				</button>
			)}
			{isCodeEditor && app && (
				<button
					onClick={handleBuildItClick}
					disabled={!hasShapes}
					title="Build it"
					style={{
						flex: '0 0 auto',
						position: 'relative',
						boxSizing: 'border-box',
						background: hasShapes ? 'var(--tl-color-primary)' : 'var(--tl-color-muted-2)',
						color: hasShapes ? 'white' : 'var(--tl-color-muted-1)',
						border: 'var(--tl-color-background)',
						font: 'inherit',
						fontWeight: 600,
						padding: 'var(--tl-space-3) var(--tl-space-4)',
						borderRadius: 'var(--tl-radius-2)',
						margin: 'var(--tl-space-2)',
						cursor: hasShapes ? 'pointer' : 'not-allowed',
						pointerEvents: 'all',
					}}
				>
					Build it
				</button>
			)}
		</div>
	)
}

function DynamicToolbar() {
	const { displayMode } = useContext(McpAppContext)
	return (
		<DefaultToolbar orientation={displayMode === 'fullscreen' ? 'vertical' : 'horizontal'}>
			<DefaultToolbarContent />
		</DefaultToolbar>
	)
}

const tldrawComponents: TLComponents = {
	SharePanel: SharePanelContent,
	Toolbar: DynamicToolbar,
}

function TldrawCanvas({ app }: { app: App }) {
	const [displayMode, setDisplayMode] = useState<'inline' | 'fullscreen'>('inline')
	const [containerHeight, setContainerHeight] = useState<number | null>(null)
	const [lastEditor, setLastEditor] = useState<'user' | 'ai'>('ai')
	const editorRef = useRef<Editor | null>(null)

	const pendingSnapshotRef = useRef<CanvasSnapshot | null>(null)
	const pendingPreviewSnapshotRef = useRef<CanvasSnapshot | null>(null)
	const previewActiveRef = useRef(false)
	const createFromBlankPreviewRef = useRef(false)
	const committedSnapshotRef = useRef<CanvasSnapshot>({ shapes: [], assets: [] })
	const checkpointIdRef = useRef<string | null>(null)
	const removeStoreListenerRef = useRef<(() => void) | null>(null)
	const saveTimerRef = useRef<number | null>(null)
	const requestShapeIdsRef = useRef<Set<TLShapeId>>(new Set())
	const hasUserEditedSinceAiRef = useRef(false)
	const lastEditorRef = useRef<'user' | 'ai'>('ai')

	const mcpAppHostContext = useMemo(() => {
		return app.getHostContext()
	}, [app])

	const hostCapabilities = useMemo(() => {
		return app.getHostCapabilities()
	}, [app])

	const canFullscreen = useMemo(() => {
		const modes = mcpAppHostContext?.availableDisplayModes
		if (!modes) return false
		return modes.includes('fullscreen')
	}, [mcpAppHostContext])

	const canDownload = useMemo(() => {
		return !!hostCapabilities?.downloadFile
	}, [hostCapabilities])

	const [hostName, setHostName] = useState<MCP_APP_HOST_NAMES | null>(null)

	const markAiActivity = useCallback(() => {
		hasUserEditedSinceAiRef.current = false
		if (lastEditorRef.current !== 'ai') {
			lastEditorRef.current = 'ai'
			setLastEditor('ai')
		}
	}, [])

	const markUserEdit = useCallback(() => {
		hasUserEditedSinceAiRef.current = true
		if (lastEditorRef.current !== 'user') {
			lastEditorRef.current = 'user'
			setLastEditor('user')
		}
	}, [])

	const toggleFullscreen = useCallback(async () => {
		const newMode = displayMode === 'fullscreen' ? 'inline' : 'fullscreen'

		// Sync current editor state before leaving fullscreen
		if (newMode === 'inline') {
			const editor = editorRef.current
			if (editor) {
				const shapes = [...editor.getCurrentPageShapes()].map((s) => structuredClone(s))
				const assets = [...editor.getAssets()].map((a) => structuredClone(a))
				const bindings = getEditorBindings(editor)
				committedSnapshotRef.current = { shapes, assets, bindings }
				pushCanvasContext(app, editor)
				const cpId = checkpointIdRef.current
				if (cpId) {
					saveLocalSnapshot(cpId, shapes, assets, bindings)
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

	const mcpAppCtx = useMemo(
		() => ({
			displayMode,
			toggleFullscreen,
			canFullscreen,
			canDownload,
			app,
			lastEditor,
			hostName,
		}),
		[displayMode, toggleFullscreen, canFullscreen, canDownload, app, lastEditor, hostName]
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
		(
			previewShapes: TLShape[],
			mode: 'create' | 'update',
			createFromBlank = false,
			previewBindings: TLBindingCreate[] = []
		) => {
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
				bindings: previewBindings,
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
				const bindings = getEditorBindings(editor)
				saveLocalSnapshot(cpId, shapes, assets, bindings)
				saveCheckpointToServer(app, cpId, editor)
			}
		}, SAVE_DEBOUNCE_MS)
	}, [app])

	const applyPreviewFromToolInput = useCallback(
		(input: unknown, isPartial: boolean) => {
			const committed = committedSnapshotRef.current

			app.updateModelContext({
				content: [
					{
						type: 'text',
						text: `Applying preview from tool input ${JSON.stringify(input, null, 2)}`,
					},
				],
			})

			const args = extractToolArguments(input)
			if (!args) return
			markAiActivity()

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

			const createPreview = toCreatePreviewShapes(args.shapesJson, isPartial)
			if (createPreview.shapes.length > 0) {
				renderPreviewShapes(
					createPreview.shapes,
					'create',
					createFromBlankPreviewRef.current,
					createPreview.bindings
				)
				return
			}

			const editor = editorRef.current
			const liveShapes = editor ? [...editor.getCurrentPageShapes()] : committed.shapes
			const updatePreview = toUpdatePreviewShapes(args.updatesJson, isPartial, liveShapes)
			if (updatePreview.shapes.length > 0) {
				renderPreviewShapes(updatePreview.shapes, 'update', false, updatePreview.bindings)
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
		[app, markAiActivity, renderPreviewShapes, renderPreviewSnapshot]
	)

	useEffect(() => {
		log('TldrawCanvas mounted')

		// Sync bootstrap: read session ID + checkpoint data embedded in the HTML
		// by the resource handler. This avoids async callServerTool on mount which
		// caused issues on ChatGPT and was too slow for streaming preview.
		const bootstrap = getEmbeddedBootstrap()
		if (bootstrap) {
			setCurrentSessionId(bootstrap.sessionId)
			log(`Session ID set: ${bootstrap.sessionId}`)
			if (bootstrap.hostName) {
				setHostName(bootstrap.hostName)
				log(`hostName (from bootstrap): ${bootstrap.hostName}`)
			}

			if (bootstrap.snapshot && bootstrap.snapshot.shapes.length > 0) {
				// Don't overwrite if a tool result already committed shapes
				if (committedSnapshotRef.current.shapes.length === 0) {
					const snapshot: CanvasSnapshot = {
						shapes: bootstrap.snapshot.shapes,
						assets: bootstrap.snapshot.assets,
						bindings: bootstrap.snapshot.bindings,
					}
					committedSnapshotRef.current = snapshot
					if (bootstrap.checkpointId) {
						checkpointIdRef.current = bootstrap.checkpointId
					}
					const editor = editorRef.current
					if (editor) {
						applySnapshot(editor, snapshot)
					} else {
						pendingSnapshotRef.current = snapshot
					}
					log(`Bootstrapped ${snapshot.shapes.length} shape(s) from embedded data`)
				}
			} else {
				// No embedded snapshot — try session-scoped localStorage
				const latestSnapshot = getLatestCheckpointSnapshot()
				if (
					latestSnapshot &&
					latestSnapshot.shapes.length > 0 &&
					committedSnapshotRef.current.shapes.length === 0
				) {
					committedSnapshotRef.current = latestSnapshot
					const editor = editorRef.current
					if (editor) {
						applySnapshot(editor, latestSnapshot)
					} else {
						pendingSnapshotRef.current = latestSnapshot
					}
					log(`Bootstrapped ${latestSnapshot.shapes.length} shape(s) from session localStorage`)
				}
			}
		}

		app.onhostcontextchanged = (ctx) => {
			log(`updated hostcontext: ${JSON.stringify(ctx)}`)

			const dims = ctx.containerDimensions
			if (dims && 'height' in dims) {
				setContainerHeight(dims.height)
			}

			// Only update display mode if the host explicitly provides it
			if (ctx.displayMode !== undefined) {
				const newMode = ctx.displayMode === 'fullscreen' ? 'fullscreen' : 'inline'

				// Sync editor state before host exits fullscreen
				if (newMode !== 'fullscreen') {
					const editor = editorRef.current
					if (editor) {
						const shapes = [...editor.getCurrentPageShapes()].map((s) => structuredClone(s))
						const assets = [...editor.getAssets()].map((a) => structuredClone(a))
						const bindings = getEditorBindings(editor)
						committedSnapshotRef.current = { shapes, assets, bindings }
						pushCanvasContext(app, editor)
						const cpId = checkpointIdRef.current
						if (cpId) {
							saveLocalSnapshot(cpId, shapes, assets, bindings)
							saveCheckpointToServer(app, cpId, editor)
						}
					}
				}

				setDisplayMode(newMode)
				log(`Display mode from host context: ${newMode}`)
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
			markAiActivity()

			const {
				checkpointId,
				sessionId,
				shapes: resultShapes,
				assets: resultAssets,
				bindings: resultBindings,
				action,
				hadBaseShapes,
				newBlankCanvas,
			} = checkpoint
			checkpointIdRef.current = checkpointId

			// Keep session ID in sync (e.g. if it wasn't available from bootstrap)
			if (sessionId) {
				setCurrentSessionId(sessionId)
			}

			// Clear preview state
			previewActiveRef.current = false
			createFromBlankPreviewRef.current = false
			pendingPreviewSnapshotRef.current = null

			// Check localStorage for user edits (handles remount case)
			const localSnapshot = loadLocalSnapshot(checkpointId)
			let finalShapes = localSnapshot ? localSnapshot.shapes : resultShapes
			let finalAssets: TLAsset[] = localSnapshot ? localSnapshot.assets : resultAssets
			let finalBindings: TLBindingCreate[] = localSnapshot ? localSnapshot.bindings : resultBindings

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
					// Merge bindings
					finalBindings = [...latestSnapshot.bindings, ...resultBindings]
				}
			}

			// Capture previous committed IDs for zoom diff fallback
			const previousCommittedIds = new Set(committedSnapshotRef.current.shapes.map((s) => s.id))

			const snapshot: CanvasSnapshot = {
				shapes: finalShapes,
				assets: finalAssets,
				bindings: finalBindings,
			}
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
			saveLocalSnapshot(checkpointId, finalShapes, finalAssets, finalBindings)

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
			markAiActivity()
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
	}, [app, applyPreviewFromToolInput, clearPreviewAndRestoreCommitted, markAiActivity])

	// Set explicit height on html/body in fullscreen
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
					markUserEdit()
					scheduleSave()
				},
				{ source: 'user', scope: 'document' }
			)

			// Keep viewport center stable when the container resizes (fullscreen toggle).
			editor.sideEffects.registerAfterChangeHandler('instance', (prev, next) => {
				const pb = prev.screenBounds
				const nb = next.screenBounds
				const dw = nb.w - pb.w
				const dh = nb.h - pb.h
				if (dw === 0 && dh === 0) return

				const cam = editor.getCamera()
				if (!Number.isFinite(cam.z) || cam.z <= 0) return
				const nextX = cam.x + dw / cam.z / 2
				const nextY = cam.y + dh / cam.z / 2
				if (!Number.isFinite(nextX) || !Number.isFinite(nextY)) return

				editor.setCamera({
					x: nextX,
					y: nextY,
					z: cam.z,
				})
			})

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
		[markUserEdit, scheduleSave]
	)

	const isFullscreen = displayMode === 'fullscreen'

	return (
		<McpAppContext.Provider value={mcpAppCtx}>
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
					onMount={handleMount}
					components={tldrawComponents}
					overrides={uiOverrides}
				>
					<ImageDropGuard />
				</Tldraw>
			</div>
		</McpAppContext.Provider>
	)
}

function McpApp() {
	const handleAppCreated = useCallback((instance: App) => {
		log('App created via useApp')
		instance.onerror = (err) => log(`App.onerror: ${err}`)
	}, [])

	const { app, isConnected, error } = useApp({
		appInfo: {
			name: MCP_SERVER_NAME,
			version: MCP_SERVER_VERSION,
			title: MCP_SERVER_TITLE,
			description: MCP_SERVER_DESCRIPTION,
			websiteUrl: MCP_SERVER_WEBSITE_URL,
		},
		capabilities: {
			availableDisplayModes: ['fullscreen', 'inline'],
		},
		onAppCreated: handleAppCreated,
	})

	useEffect(() => {
		if (!app || !isConnected) return
		log('Connected!')

		return () => {
			log('McpApp cleanup')
		}
	}, [app, isConnected])

	const status = isConnected ? 'ready' : 'connecting'

	return (
		<div>
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
