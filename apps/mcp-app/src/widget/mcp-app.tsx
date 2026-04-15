import { type App, McpUiDisplayMode, useApp } from '@modelcontextprotocol/ext-apps/react'
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
	type TLAsset,
	type TLBindingCreate,
	type TLComponents,
	type TLShapeId,
	type TLUiEventHandler,
	DefaultToolbar,
	DefaultToolbarContent,
	Editor,
	Tldraw,
	TldrawUiIcon,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './mcp-app.css'
import tldrawLogoUrl from '../../plugins/tldraw-mcp/assets/logo.svg'
import { primeEmbeddedMethodMap } from '../shared/generated-data'
import {
	MCP_SERVER_DESCRIPTION,
	MCP_SERVER_NAME,
	MCP_SERVER_TITLE,
	MCP_SERVER_VERSION,
	MCP_SERVER_WEBSITE_URL,
} from '../shared/types'
import type { MCP_APP_HOST_NAMES } from '../shared/types'
import { isHostCodeEditor, resolveMcpAppHostNameFromClientInfo } from '../shared/utils'
import { McpAppContext } from './app-context'
import { DEV_LOG_PANEL_HEIGHT, DevLogPanel, useDevLog } from './dev-log'
import { executeCode } from './exec-helpers'
import { exportTldr } from './export-tldr'
import { ImageDropGuard, uiOverrides } from './image-guard'
import {
	type CanvasSnapshot,
	getEmbeddedBootstrap,
	getLatestCheckpointSnapshot,
	loadLocalSnapshot,
	parseCheckpointFromToolResult,
	clearCanvasContext,
	pushCanvasContext,
	saveCheckpointToServer,
	saveLocalSnapshot,
	setCurrentCanvasId,
	setCurrentSessionId,
	syncEditorState,
} from './persistence'
import { applySnapshot, zoomToFitRequestShapes } from './snapshot'

const LICENSE_KEY = import.meta.env.VITE_TLDRAW_LICENSE_KEY as string

const SAVE_DEBOUNCE_MS = 500

function SharePanelContent() {
	const editor = useEditor()
	const hasShapes = useValue('hasShapes', () => editor.getCurrentPageShapeIds().size > 0, [editor])

	const {
		displayMode,
		toggleFullscreen,
		canFullscreen,
		canDownload,
		app,
		lastEditor,
		hostName,
		isDev,
		isDevLogVisible,
		toggleDevLog,
	} = useContext(McpAppContext)

	const isCodeEditor = useMemo(() => {
		if (!hostName) return false
		return isHostCodeEditor(hostName)
	}, [hostName])

	const handleBuildItClick = useCallback(() => {
		if (!app) return
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
	}, [app, lastEditor])

	return (
		<div className="tlui-share-zone mcp-app__share-zone" draggable={false}>
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
			{isDev && toggleDevLog && (
				<button
					className="tlui-button tlui-button__low"
					onClick={toggleDevLog}
					title={isDevLogVisible ? 'Hide dev log' : 'Show dev log'}
				>
					{isDevLogVisible ? 'Hide dev log' : 'Show dev log'}
				</button>
			)}
			{isCodeEditor && app && (
				<button
					onClick={handleBuildItClick}
					disabled={!hasShapes}
					title="Build it"
					className={`mcp-app__build-button${hasShapes ? ' mcp-app__build-button--enabled' : ''}`}
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

const ERROR_BANNER_HEIGHT = 30

function parseHostTheme(value: unknown): 'light' | 'dark' | null {
	return value === 'dark' || value === 'light' ? value : null
}

function TldrawCanvas({ app }: { app: App }) {
	const [displayMode, setDisplayMode] =
		useState<Extract<McpUiDisplayMode, 'inline' | 'fullscreen'>>('inline')
	const [containerHeight, setContainerHeight] = useState<number | null>(null)
	const [lastEditor, setLastEditor] = useState<'user' | 'ai'>('ai')
	const [hostContext, setHostContext] = useState(() => app.getHostContext())
	const [hostTheme, setHostTheme] = useState<'light' | 'dark'>(() => {
		const initialTheme = parseHostTheme(
			(app.getHostContext() as { theme?: string } | undefined)?.theme
		)
		return initialTheme ?? 'light'
	})
	const [canvasTheme, setCanvasTheme] = useState<'light' | 'dark'>(hostTheme)
	const [execError, setExecError] = useState<string | null>(null)
	const editorRef = useRef<Editor | null>(null)

	const pendingSnapshotRef = useRef<CanvasSnapshot | null>(null)
	const committedSnapshotRef = useRef<CanvasSnapshot>({ shapes: [], assets: [] })
	const checkpointIdRef = useRef<string | null>(null)
	const removeStoreListenerRef = useRef<(() => void) | null>(null)
	const editorReadyResolveRef = useRef<((editor: Editor) => void) | null>(null)
	const editorReadyPromiseRef = useRef<Promise<Editor> | null>(null)
	const saveTimerRef = useRef<number | null>(null)
	const hasUserEditedSinceAiRef = useRef(false)
	const lastEditorRef = useRef<'user' | 'ai'>('ai')
	const execPartialDebounceRef = useRef<number | null>(null)
	const hasExecRunRef = useRef(false)

	const { isDev, isDevLogVisible, devLogEntries, logIfDevMode, toggleDevLog, enableDevMode } =
		useDevLog()

	const hostCapabilities = useMemo(() => {
		return app.getHostCapabilities()
	}, [app])

	const hostInfo = useMemo(() => {
		return app.getHostVersion()
	}, [app])

	const isMobilePlatform = hostContext?.platform === 'mobile'
	const isDarkTheme = canvasTheme === 'dark'

	const syncThemeFromEditor = useCallback(() => {
		const editor = editorRef.current
		if (!editor) return
		setCanvasTheme(editor.user.getIsDarkMode() ? 'dark' : 'light')
	}, [])

	const applyHostThemeToEditor = useCallback((theme: 'light' | 'dark') => {
		setHostTheme(theme)
		setCanvasTheme(theme)
		const editor = editorRef.current
		if (!editor) return
		editor.user.updateUserPreferences({ colorScheme: theme })
	}, [])

	const handleUiEvent = useCallback<TLUiEventHandler>(
		(name) => {
			const eventName = name as string
			if (eventName !== 'toggle-dark-mode' && eventName !== 'color-scheme') return
			queueMicrotask(() => {
				syncThemeFromEditor()
			})
		},
		[syncThemeFromEditor]
	)

	const canFullscreen = useMemo(() => {
		if (isMobilePlatform) return false
		const modes = hostContext?.availableDisplayModes
		if (!modes) return false
		return modes.includes('fullscreen')
	}, [hostContext, isMobilePlatform])

	const canDownload = useMemo(() => {
		return !!hostCapabilities?.downloadFile
	}, [hostCapabilities])

	const [hostName, setHostName] = useState<MCP_APP_HOST_NAMES | null>(null)
	const devLogPanelHeight = isDev && isDevLogVisible ? DEV_LOG_PANEL_HEIGHT : 0

	useEffect(() => {
		const resolved = resolveMcpAppHostNameFromClientInfo(hostInfo?.name ?? '')
		if (resolved) {
			setHostName(resolved)
		}
	}, [hostInfo])

	const teardownEditor = useCallback(() => {
		removeStoreListenerRef.current?.()
		removeStoreListenerRef.current = null
		if (saveTimerRef.current !== null) {
			window.clearTimeout(saveTimerRef.current)
			saveTimerRef.current = null
		}
		if (execPartialDebounceRef.current !== null) {
			window.clearTimeout(execPartialDebounceRef.current)
			execPartialDebounceRef.current = null
		}
		editorRef.current?.dispose()
		editorRef.current = null
	}, [])

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
		if (newMode === 'fullscreen' && (isMobilePlatform || !canFullscreen)) {
			return
		}

		if (newMode === 'inline') {
			const editor = editorRef.current
			if (editor) {
				committedSnapshotRef.current = syncEditorState(app, editor, checkpointIdRef.current)
			}
		}

		try {
			const result = await app.requestDisplayMode({ mode: newMode })
			const actualMode = result.mode === 'fullscreen' ? 'fullscreen' : 'inline'
			setDisplayMode(actualMode)
		} catch {
			return
		}
	}, [app, canFullscreen, displayMode, isMobilePlatform])

	const mcpAppCtx = useMemo(
		() => ({
			displayMode,
			toggleFullscreen,
			canFullscreen,
			canDownload,
			app,
			lastEditor,
			hostName,
			isDev,
			isDevLogVisible,
			toggleDevLog,
			logIfDevMode,
		}),
		[
			displayMode,
			toggleFullscreen,
			canFullscreen,
			canDownload,
			app,
			lastEditor,
			hostName,
			isDev,
			isDevLogVisible,
			toggleDevLog,
			logIfDevMode,
		]
	)

	/** Returns the editor, waiting for mount if it hasn't happened yet. */
	const waitForEditor = useCallback((): Promise<Editor> => {
		const editor = editorRef.current
		if (editor) return Promise.resolve(editor)

		if (editorReadyPromiseRef.current) return editorReadyPromiseRef.current

		editorReadyPromiseRef.current = new Promise<Editor>((resolve) => {
			editorReadyResolveRef.current = resolve
		})
		return editorReadyPromiseRef.current
	}, [])

	const scheduleSave = useCallback(() => {
		if (saveTimerRef.current !== null) {
			window.clearTimeout(saveTimerRef.current)
		}
		saveTimerRef.current = window.setTimeout(() => {
			saveTimerRef.current = null
			const editor = editorRef.current
			if (!editor) return
			syncEditorState(app, editor, checkpointIdRef.current)
		}, SAVE_DEBOUNCE_MS)
	}, [app])

	useEffect(() => {
		setHostContext(app.getHostContext())
		const initialTheme = parseHostTheme(
			(app.getHostContext() as { theme?: string } | undefined)?.theme
		)
		if (initialTheme) {
			applyHostThemeToEditor(initialTheme)
		}

		logIfDevMode('Bootstrap loading...')
		const bootstrap = getEmbeddedBootstrap()
		primeEmbeddedMethodMap()

		// Delete the bootstrap data from the window object to prevent it from being used again.
		delete window.__TLDRAW_BOOTSTRAP__

		if (bootstrap) {
			setCurrentSessionId(bootstrap.sessionId)
			if (bootstrap.canvasId) {
				setCurrentCanvasId(bootstrap.canvasId)
			}
			if (bootstrap.isDev) {
				enableDevMode()
			}
			logIfDevMode(
				`Bootstrap loaded for session ${bootstrap.sessionId}, canvas ${bootstrap.canvasId ?? 'none'}${bootstrap.isDev ? ' (dev mode)' : ''}`
			)

			if (bootstrap.snapshot) {
				if (committedSnapshotRef.current.shapes.length === 0) {
					const snapshot: CanvasSnapshot = {
						shapes: bootstrap.snapshot.shapes,
						assets: bootstrap.snapshot.assets,
						bindings: bootstrap.snapshot.bindings,
					}
					committedSnapshotRef.current = snapshot
					if (bootstrap.checkpointId) {
						checkpointIdRef.current = bootstrap.checkpointId
						logIfDevMode(
							`Restored embedded checkpoint ${bootstrap.checkpointId} with ${bootstrap.snapshot.shapes.length} shape(s)`
						)
					}
					const editor = editorRef.current
					if (editor) {
						applySnapshot(editor, snapshot)
					} else {
						pendingSnapshotRef.current = snapshot
					}
				}
			} else {
				const latestSnapshot = getLatestCheckpointSnapshot()
				if (latestSnapshot && committedSnapshotRef.current.shapes.length === 0) {
					logIfDevMode(
						`Restored latest local snapshot with ${latestSnapshot.shapes.length} shape(s)`
					)
					committedSnapshotRef.current = latestSnapshot
					const editor = editorRef.current
					if (editor) {
						applySnapshot(editor, latestSnapshot)
					} else {
						pendingSnapshotRef.current = latestSnapshot
					}
				}
			}
		}

		app.onhostcontextchanged = (ctx) => {
			const nextContext = app.getHostContext() ?? ctx
			setHostContext(nextContext)
			const nextTheme = parseHostTheme(
				(ctx as { theme?: string } | undefined)?.theme ??
					(nextContext as { theme?: string } | undefined)?.theme
			)
			if (nextTheme) {
				// Host theme changes take precedence over local preference changes.
				applyHostThemeToEditor(nextTheme)
			}

			const dims = ctx.containerDimensions
			if (dims && 'height' in dims) {
				setContainerHeight(dims.height)
			}

			if (ctx.displayMode !== undefined) {
				const newMode = ctx.displayMode === 'fullscreen' ? 'fullscreen' : 'inline'

				if (newMode !== 'fullscreen') {
					const editor = editorRef.current
					if (editor) {
						committedSnapshotRef.current = syncEditorState(app, editor, checkpointIdRef.current)
					}
				}

				setDisplayMode(newMode)
			}
		}

		const runExec = (code: string, source: string, canvasId?: string) => {
			if (hasExecRunRef.current) {
				logIfDevMode(`Exec: skipping duplicate exec from ${source}`)
				return
			}
			hasExecRunRef.current = true

			logIfDevMode(`Exec: running from ${source}`)
			markAiActivity()

			void (async () => {
				logIfDevMode('Exec: waiting for editor...')
				const editor = await waitForEditor()

				if (canvasId) {
					setCurrentCanvasId(canvasId)

					if (editor.getCurrentPageShapeIds().size === 0) {
						logIfDevMode(`Exec: canvas empty, fetching state for canvasId=${canvasId}`)
						try {
							const response = await app.callServerTool({
								name: '_get_canvas_state',
								arguments: { canvasId },
							})
							const res = response as any
							let data: any = null
							// Try structuredContent first, fall back to parsing text content
							if (res?.structuredContent) {
								data = res.structuredContent
							} else if (Array.isArray(res?.content)) {
								const textItem = res.content.find(
									(c: any) => c.type === 'text' && typeof c.text === 'string'
								)
								if (textItem) {
									try {
										data = JSON.parse(textItem.text)
									} catch {
										// not JSON
									}
								}
							}
							if (data && Array.isArray(data.shapes) && data.shapes.length > 0) {
								const snapshot: CanvasSnapshot = {
									shapes: data.shapes,
									assets: Array.isArray(data.assets) ? data.assets : [],
									bindings: Array.isArray(data.bindings) ? data.bindings : [],
								}
								applySnapshot(editor, snapshot)
								committedSnapshotRef.current = snapshot
								if (typeof data.checkpointId === 'string') {
									checkpointIdRef.current = data.checkpointId
								}
								logIfDevMode(
									`Exec: restored ${data.shapes.length} shape(s) from server for canvasId=${canvasId}`
								)
							} else {
								logIfDevMode(`Exec: no shapes returned from server for canvasId=${canvasId}`)
							}
						} catch (err) {
							logIfDevMode(`Exec: failed to fetch canvas state: ${err}`)
						}
					}
				}

				logIfDevMode('Exec: editor ready, executing code')

				const execResult = await executeCode(editor, code)
				logIfDevMode(
					`Exec ${execResult.success ? 'succeeded' : 'failed'}: ${JSON.stringify(execResult.result ?? execResult.error)}`
				)

				// Call _exec_callback FIRST to get the server-assigned canvasId
				const callbackArgs = execResult.success
					? { channel: 'exec', result: { success: true, result: execResult.result } }
					: { channel: 'exec', result: { success: false, error: execResult.error } }
				try {
					const cbResponse = await app.callServerTool({
						name: '_exec_callback',
						arguments: callbackArgs,
					})
					const cbRes = cbResponse as any
					let cbData: any = null
					if (Array.isArray(cbRes?.content)) {
						const textItem = cbRes.content.find(
							(c: any) => c.type === 'text' && typeof c.text === 'string'
						)
						if (textItem) {
							try {
								cbData = JSON.parse(textItem.text)
							} catch {
								// not JSON
							}
						}
					}
					if (cbData?.canvasId) {
						setCurrentCanvasId(cbData.canvasId)
						logIfDevMode(`Exec: server canvasId=${cbData.canvasId}`)
					}
					logIfDevMode('Exec: _exec_callback succeeded')
				} catch (err) {
					logIfDevMode(`Exec: _exec_callback failed: ${err}`)
				}

				if (execResult.success) {
					const cpId = checkpointIdRef.current ?? crypto.randomUUID()
					checkpointIdRef.current = cpId

					const resultStr =
						execResult.result !== undefined ? JSON.stringify(execResult.result, null, 2) : undefined
					committedSnapshotRef.current = syncEditorState(app, editor, cpId, {
						message: resultStr
							? `Code executed successfully on canvas. Return value:\n${resultStr}`
							: 'Code executed successfully on canvas.',
					})

					const snapshot = committedSnapshotRef.current
					const allShapeIds = new Set(snapshot.shapes.map((s) => s.id))
					zoomToFitRequestShapes(editor, allShapeIds)
				} else {
					clearCanvasContext(app, {
						message:
							'Canvas context was cleared because code execution failed. Fix the error before using the canvas context again.',
					})
					teardownEditor()
					setExecError(execResult.error ?? 'Unknown error')
					void app.sendSizeChanged({ width: 400, height: ERROR_BANNER_HEIGHT })
				}
			})()
		}

		app.ontoolinput = (params) => {
			logIfDevMode('Exec: ontoolinput called')
			const code = params.arguments?.code
			if (typeof code !== 'string' || !code.trim()) return
			const canvasId =
				typeof params.arguments?.canvasId === 'string' ? params.arguments.canvasId : undefined

			if (execPartialDebounceRef.current !== null) {
				window.clearTimeout(execPartialDebounceRef.current)
			}
			execPartialDebounceRef.current = window.setTimeout(() => {
				execPartialDebounceRef.current = null
				runExec(code, 'ontoolinput (debounced)', canvasId)
			}, 500)
		}

		app.ontoolinputpartial = (params) => {
			const code = params.arguments?.code
			if (typeof code !== 'string' || !code.trim()) return
			const canvasId =
				typeof params.arguments?.canvasId === 'string' ? params.arguments.canvasId : undefined

			if (execPartialDebounceRef.current !== null) {
				window.clearTimeout(execPartialDebounceRef.current)
			}
			execPartialDebounceRef.current = window.setTimeout(() => {
				execPartialDebounceRef.current = null
				runExec(code, 'ontoolinputpartial (debounced)', canvasId)
			}, 1000)
		}

		app.onteardown = async () => {
			return {}
		}

		app.ontoolresult = async (result) => {
			logIfDevMode('Exec: ontoolresult called')
			hasExecRunRef.current = false
			markAiActivity()

			const checkpoint = parseCheckpointFromToolResult(result)
			if (!checkpoint) return
			logIfDevMode(`Received tool result for checkpoint ${checkpoint.checkpointId}`)

			const {
				checkpointId,
				sessionId,
				shapes: resultShapes,
				assets: resultAssets,
				bindings: resultBindings,
			} = checkpoint
			checkpointIdRef.current = checkpointId

			if (sessionId) {
				setCurrentSessionId(sessionId)
			}

			const localSnapshot = loadLocalSnapshot(checkpointId)
			const finalShapes = localSnapshot ? localSnapshot.shapes : resultShapes
			const finalAssets: TLAsset[] = localSnapshot ? localSnapshot.assets : resultAssets
			const finalBindings: TLBindingCreate[] = localSnapshot
				? localSnapshot.bindings
				: resultBindings

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
				return
			}

			applySnapshot(editor, snapshot)

			if (!localSnapshot) {
				const newIds = new Set<TLShapeId>()
				for (const shape of finalShapes) {
					if (!previousCommittedIds.has(shape.id)) newIds.add(shape.id)
				}
				zoomToFitRequestShapes(editor, newIds)
			}

			saveLocalSnapshot(checkpointId, finalShapes, finalAssets, finalBindings)
			void saveCheckpointToServer(app, checkpointId, editor)
			pushCanvasContext(app, editor)
		}

		app.ontoolcancelled = (_params) => {
			hasExecRunRef.current = false
			if (execPartialDebounceRef.current !== null) {
				window.clearTimeout(execPartialDebounceRef.current)
				execPartialDebounceRef.current = null
			}
			markAiActivity()
			logIfDevMode('Tool invocation cancelled')
		}

		return () => {
			teardownEditor()
		}
	}, [
		app,
		applyHostThemeToEditor,
		enableDevMode,
		logIfDevMode,
		markAiActivity,
		teardownEditor,
		waitForEditor,
	])

	useEffect(() => {
		if (!isMobilePlatform || displayMode !== 'fullscreen') return

		void app
			.requestDisplayMode({ mode: 'inline' })
			.then((result) => {
				const actualMode = result.mode === 'fullscreen' ? 'fullscreen' : 'inline'
				setDisplayMode(actualMode)
			})
			.catch(() => {})
	}, [app, displayMode, isMobilePlatform])

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
			editorRef.current = editor
			editor.user.updateUserPreferences({ colorScheme: canvasTheme })

			if (editorReadyResolveRef.current) {
				editorReadyResolveRef.current(editor)
				editorReadyResolveRef.current = null
				editorReadyPromiseRef.current = null
			}

			removeStoreListenerRef.current?.()
			removeStoreListenerRef.current = editor.store.listen(
				() => {
					markUserEdit()
					scheduleSave()
				},
				{ source: 'user', scope: 'document' }
			)

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

			const pendingSnapshot = pendingSnapshotRef.current
			if (pendingSnapshot) {
				pendingSnapshotRef.current = null
				applySnapshot(editor, pendingSnapshot)
			}

			pushCanvasContext(app, editor)
		},
		[app, canvasTheme, markUserEdit, scheduleSave]
	)

	if (execError) {
		return (
			<div className={`mcp-app__error-banner${isDarkTheme ? ' mcp-app__error-banner--dark' : ''}`}>
				<img
					src={tldrawLogoUrl}
					alt="tldraw logo"
					className={`mcp-app__error-logo${isDarkTheme ? ' mcp-app__error-logo--dark' : ''}`}
				/>
				<span className="mcp-app__error-label">Error editing canvas:</span>
				<span
					title={execError}
					className={`mcp-app__error-message${isDarkTheme ? ' mcp-app__error-message--dark' : ''}`}
				>
					{execError}
				</span>
			</div>
		)
	}

	const isFullscreen = displayMode === 'fullscreen'

	return (
		<McpAppContext.Provider value={mcpAppCtx}>
			<div
				className={`mcp-app__canvas-layout${isFullscreen ? ' mcp-app__canvas-layout--fullscreen' : ''}`}
			>
				<div
					className={`mcp-app__canvas-surface${isFullscreen ? ' mcp-app__canvas-surface--fullscreen' : ''}${devLogPanelHeight > 0 && !isFullscreen ? ' mcp-app__canvas-surface--with-dev-log' : ''}`}
				>
					<Tldraw
						licenseKey={LICENSE_KEY}
						onMount={handleMount}
						onUiEvent={handleUiEvent}
						components={tldrawComponents}
						overrides={uiOverrides}
					>
						<ImageDropGuard />
					</Tldraw>
				</div>
				{isDev && isDevLogVisible && (
					<DevLogPanel entries={devLogEntries} isFullscreen={isFullscreen} />
				)}
			</div>
		</McpAppContext.Provider>
	)
}

function McpApp() {
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
	})

	const status = isConnected ? 'ready' : 'connecting'

	return (
		<div>
			{error ? (
				<div className="mcp-app__status mcp-app__status--error">Error: {error.message}</div>
			) : !isConnected || !app ? (
				<div className="mcp-app__status mcp-app__status--connecting">Status: {status}</div>
			) : (
				<TldrawCanvas app={app} />
			)}
		</div>
	)
}

createRoot(document.getElementById('root')!).render(<McpApp />)
