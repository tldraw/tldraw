import { type App, McpUiDisplayMode, useApp } from '@modelcontextprotocol/ext-apps/react'
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
	type TLComponents,
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
import { computeExecKey } from '../shared/exec-key'
import { primeEmbeddedMethodMap } from '../shared/generated-data'
import {
	MCP_SERVER_DESCRIPTION,
	MCP_SERVER_NAME,
	MCP_SERVER_TITLE,
	MCP_SERVER_VERSION,
	MCP_SERVER_WEBSITE_URL,
} from '../shared/types'
import type { MCP_APP_HOST_NAMES } from '../shared/types'
import {
	isHostCodeEditor,
	isPlainObject,
	resolveMcpAppHostNameFromClientInfo,
} from '../shared/utils'
import { McpAppContext } from './app-context'
import { DEV_LOG_PANEL_HEIGHT, DevLogPanel, useDevLog } from './dev-log'
import { executeCode } from './exec-helpers'
import { exportTldr } from './export-tldr'
import { ImageDropGuard, uiOverrides } from './image-guard'
import {
	type CanvasSnapshot,
	buildContextJson,
	captureEditorSnapshot,
	clearCanvasContext,
	getEmbeddedBootstrap,
	pushCanvasContext,
} from './persistence'
import { applySnapshot, zoomToFitRequestShapes } from './snapshot'

const LICENSE_KEY = import.meta.env.VITE_TLDRAW_LICENSE_KEY as string

const USER_EDIT_DEBOUNCE_MS = 1_500
const PULL_JOB_ATTEMPTS = 4
const PULL_JOB_RETRY_MS = 700
// Some hosts (Claude) stream ontoolinputpartial during the call but deliver
// the final input only with the tool result — waiting for it would stall
// execution past the server's wait window. Probing from stabilized partials
// is safe: jobs are claimed by final-code hash, so an incomplete partial
// simply matches nothing.
const PARTIAL_PROBE_DEBOUNCE_MS = 400
const MAX_PARTIAL_PROBES = 5

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

/** Parse an app-only tool result: structuredContent first, then JSON text. */
function parseToolResultJson(res: unknown): Record<string, unknown> | null {
	if (!isPlainObject(res)) return null
	if (isPlainObject(res.structuredContent)) return res.structuredContent
	if (Array.isArray(res.content)) {
		const textItem = res.content.find(
			(c: unknown): c is { type: string; text: string } =>
				isPlainObject(c) && c.type === 'text' && typeof c.text === 'string'
		)
		if (textItem) {
			try {
				const parsed = JSON.parse(textItem.text)
				return isPlainObject(parsed) ? parsed : null
			} catch {
				return null
			}
		}
	}
	return null
}

function toSnapshot(data: Record<string, unknown>): CanvasSnapshot {
	return {
		shapes: Array.isArray(data.shapes) ? (data.shapes as CanvasSnapshot['shapes']) : [],
		assets: Array.isArray(data.assets) ? (data.assets as CanvasSnapshot['assets']) : [],
		bindings: Array.isArray(data.bindings) ? (data.bindings as CanvasSnapshot['bindings']) : [],
	}
}

/** The canvasId carried by an exec tool result, from structuredContent or text. */
function parseCanvasIdFromToolResult(result: unknown): string | null {
	if (!isPlainObject(result)) return null
	const sc = result.structuredContent
	if (isPlainObject(sc) && typeof sc.canvasId === 'string' && sc.canvasId) {
		return sc.canvasId
	}
	if (Array.isArray(result.content)) {
		for (const item of result.content) {
			if (!isPlainObject(item) || item.type !== 'text' || typeof item.text !== 'string') continue
			const match = item.text.match(/Canvas (?:ID: )?([a-z0-9]{8,32})\b/)
			if (match) return match[1]
		}
	}
	return null
}

interface PendingExecArgs {
	code: string
	baseCanvasId?: string
	/** True once the host delivered the final (non-partial) tool input. */
	final: boolean
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

	const committedSnapshotRef = useRef<CanvasSnapshot>({ shapes: [], assets: [] })
	const removeStoreListenerRef = useRef<(() => void) | null>(null)
	const editorReadyResolveRef = useRef<((editor: Editor) => void) | null>(null)
	const editorReadyPromiseRef = useRef<Promise<Editor> | null>(null)
	const hasUserEditedSinceAiRef = useRef(false)
	const lastEditorRef = useRef<'user' | 'ai'>('ai')

	// --- Exec/job coordination state ---
	// The server-side job store is the single source of execution truth:
	// pulling a job is an atomic claim, so duplicate or reordered host events
	// cost one no-op pull at worst. These refs only prevent obviously
	// redundant local work.
	const pendingArgsRef = useRef<PendingExecArgs | null>(null)
	const execStartedRef = useRef(false)
	const partialProbeTimerRef = useRef<number | null>(null)
	const partialProbeCountRef = useRef(0)
	const probeInFlightRef = useRef(false)
	// Model code drives the editor through the same 'user'-source store events
	// as real user edits; suppress the user-edit listener while it runs so
	// exec output is never pushed (or announced) as a manual edit.
	const isExecutingRef = useRef(false)
	const myCanvasIdRef = useRef<string | null>(null)
	const needsStateLoadRef = useRef(false)

	// --- User edit push state ---
	const userEditTimerRef = useRef<number | null>(null)
	const userEditDirtyRef = useRef(false)

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
		if (userEditTimerRef.current !== null) {
			window.clearTimeout(userEditTimerRef.current)
			userEditTimerRef.current = null
		}
		if (partialProbeTimerRef.current !== null) {
			window.clearTimeout(partialProbeTimerRef.current)
			partialProbeTimerRef.current = null
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

	// --- User edit persistence (canvasId-keyed, session-agnostic) ---

	const pushUserEdit = useCallback(async (): Promise<void> => {
		const editor = editorRef.current
		const canvasId = myCanvasIdRef.current
		if (!editor || !canvasId || !userEditDirtyRef.current) return
		userEditDirtyRef.current = false

		const snapshot = captureEditorSnapshot(editor)
		committedSnapshotRef.current = snapshot
		try {
			await app.callServerTool({
				name: '_push_user_edit',
				arguments: {
					canvasId,
					shapesJson: JSON.stringify(snapshot.shapes),
					assetsJson: JSON.stringify(snapshot.assets),
					bindingsJson: JSON.stringify(snapshot.bindings ?? []),
					contextJson: buildContextJson(editor),
					widgetVersion: MCP_SERVER_VERSION,
				},
			})
			logIfDevMode(`User edit saved to canvas ${canvasId} (${snapshot.shapes.length} shape(s))`)
		} catch (err) {
			userEditDirtyRef.current = true
			logIfDevMode(`User edit save failed: ${err}`)
		}
		// Advisory: authoritative state lives server-side; this tells the model
		// WHICH canvas the user touched without a tool call.
		pushCanvasContext(app, editor, {
			canvasId,
			message: `The user edited canvas ${canvasId} by hand.`,
		})
	}, [app, logIfDevMode])

	const scheduleUserEditPush = useCallback(() => {
		userEditDirtyRef.current = true
		if (userEditTimerRef.current !== null) {
			window.clearTimeout(userEditTimerRef.current)
		}
		userEditTimerRef.current = window.setTimeout(() => {
			userEditTimerRef.current = null
			void pushUserEdit()
		}, USER_EDIT_DEBOUNCE_MS)
	}, [pushUserEdit])

	const flushUserEdit = useCallback(async (): Promise<void> => {
		if (userEditTimerRef.current !== null) {
			window.clearTimeout(userEditTimerRef.current)
			userEditTimerRef.current = null
		}
		await pushUserEdit()
	}, [pushUserEdit])

	const toggleFullscreen = useCallback(async () => {
		const newMode = displayMode === 'fullscreen' ? 'inline' : 'fullscreen'
		if (newMode === 'fullscreen' && (isMobilePlatform || !canFullscreen)) {
			return
		}

		if (newMode === 'inline') {
			void flushUserEdit()
		}

		try {
			const result = await app.requestDisplayMode({ mode: newMode })
			const actualMode = result.mode === 'fullscreen' ? 'fullscreen' : 'inline'
			setDisplayMode(actualMode)
		} catch {
			return
		}
	}, [app, canFullscreen, displayMode, flushUserEdit, isMobilePlatform])

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

		if (bootstrap?.isDev) {
			enableDevMode()
			logIfDevMode('Bootstrap loaded (dev mode)')
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
					void flushUserEdit()
				}
				setDisplayMode(newMode)
			}
		}

		// --- Canvas state fetch (remount, or job already handled elsewhere) ---

		const loadAndRender = async (canvasId: string): Promise<void> => {
			logIfDevMode(`Loading canvas state for ${canvasId}`)
			const editor = await waitForEditor()
			try {
				const res = await app.callServerTool({
					name: '_get_canvas_state',
					arguments: { canvasId },
				})
				const data = parseToolResultJson(res)
				if (!data) return
				const snapshot = toSnapshot(data)
				myCanvasIdRef.current = canvasId
				applySnapshot(editor, snapshot)
				committedSnapshotRef.current = snapshot
				zoomToFitRequestShapes(editor, new Set(snapshot.shapes.map((s) => s.id)))
				pushCanvasContext(app, editor, { canvasId })
				logIfDevMode(`Rendered ${snapshot.shapes.length} shape(s) for canvas ${canvasId}`)
			} catch (err) {
				logIfDevMode(`Canvas state fetch failed: ${err}`)
			}
		}

		// --- Exec: pull this invocation's job, execute, submit ---

		const pullJob = async (rendezvousCanvasId: string, code: string, attempts: number) => {
			const codeHash = await computeExecKey(code)
			for (let attempt = 0; attempt < attempts; attempt++) {
				if (attempt > 0) {
					await new Promise((resolve) => setTimeout(resolve, PULL_JOB_RETRY_MS))
				}
				try {
					const res = await app.callServerTool({
						name: '_pull_job',
						arguments: { canvasId: rendezvousCanvasId, codeHash },
					})
					const data = parseToolResultJson(res)
					const job = data?.job
					if (
						isPlainObject(job) &&
						typeof job.execId === 'string' &&
						typeof job.code === 'string' &&
						typeof job.targetCanvasId === 'string'
					) {
						return job as {
							execId: string
							code: string
							targetCanvasId: string
							baseShapesJson?: string
							baseAssetsJson?: string
							baseBindingsJson?: string
						}
					}
				} catch (err) {
					logIfDevMode(`_pull_job attempt ${attempt + 1} failed: ${err}`)
				}
			}
			return null
		}

		interface PulledJob {
			execId: string
			code: string
			targetCanvasId: string
			baseShapesJson?: string
			baseAssetsJson?: string
			baseBindingsJson?: string
		}

		// The final-input/result path: pull with retries, and if no job exists
		// (already claimed, remount, or expired) fall back to rendering.
		const runExecJob = async (rendezvousCanvasId: string, code: string): Promise<void> => {
			if (execStartedRef.current) return
			execStartedRef.current = true
			markAiActivity()

			logIfDevMode(`Exec: pulling job via canvas ${rendezvousCanvasId}`)
			const job = await pullJob(rendezvousCanvasId, code, PULL_JOB_ATTEMPTS)

			if (!job) {
				// The job was already claimed (duplicate event, or a remount long
				// after execution) or expired. This widget is a viewer: render the
				// canvas it belongs to once that id is known.
				logIfDevMode('Exec: no job to pull — rendering existing state')
				execStartedRef.current = false
				const canvasId = myCanvasIdRef.current ?? rendezvousCanvasId
				if (canvasId) {
					await loadAndRender(canvasId)
				} else {
					needsStateLoadRef.current = true
				}
				return
			}

			await executeJob(rendezvousCanvasId, job)
		}

		// Speculative path for hosts that stream partials but withhold the
		// final tool input until after the tool call settles (Claude): one
		// non-committal pull per stabilized partial. A hash of incomplete code
		// matches no job, so a miss is a no-op — no fallback, no guard flip.
		const probePartialExec = async (): Promise<void> => {
			const args = pendingArgsRef.current
			if (!args?.code || !args.baseCanvasId) return
			if (execStartedRef.current || probeInFlightRef.current) return
			if (partialProbeCountRef.current >= MAX_PARTIAL_PROBES) return
			partialProbeCountRef.current++
			probeInFlightRef.current = true
			try {
				// Two attempts: the last partial tends to land right as the host
				// sends the tool call, i.e. just before the server enqueues the job.
				const job = await pullJob(args.baseCanvasId, args.code, 2)
				if (job && !execStartedRef.current) {
					execStartedRef.current = true
					markAiActivity()
					logIfDevMode('Exec: job claimed from partial input')
					await executeJob(args.baseCanvasId, job)
				}
			} finally {
				probeInFlightRef.current = false
			}
		}

		const executeJob = async (rendezvousCanvasId: string, job: PulledJob): Promise<void> => {
			const editor = await waitForEditor()

			// Hydrate the base snapshot (empty for a brand-new canvas).
			try {
				const base: CanvasSnapshot = {
					shapes: job.baseShapesJson ? JSON.parse(job.baseShapesJson) : [],
					assets: job.baseAssetsJson ? JSON.parse(job.baseAssetsJson) : [],
					bindings: job.baseBindingsJson ? JSON.parse(job.baseBindingsJson) : [],
				}
				if (base.shapes.length > 0 || base.assets.length > 0) {
					applySnapshot(editor, base)
				}
			} catch (err) {
				logIfDevMode(`Exec: base snapshot hydration failed: ${err}`)
			}

			logIfDevMode(`Exec: executing job ${job.execId} for canvas ${job.targetCanvasId}`)
			isExecutingRef.current = true
			let execResult: Awaited<ReturnType<typeof executeCode>>
			try {
				execResult = await executeCode(editor, job.code)
			} finally {
				isExecutingRef.current = false
			}
			logIfDevMode(
				`Exec ${execResult.success ? 'succeeded' : 'failed'}: ${JSON.stringify(execResult.result ?? execResult.error)}`
			)
			myCanvasIdRef.current = job.targetCanvasId
			markAiActivity()

			if (execResult.success) {
				const snapshot = captureEditorSnapshot(editor)
				committedSnapshotRef.current = snapshot
				try {
					await app.callServerTool({
						name: '_submit_result',
						arguments: {
							canvasId: rendezvousCanvasId,
							execId: job.execId,
							result: { success: true, result: execResult.result },
							shapesJson: JSON.stringify(snapshot.shapes),
							assetsJson: JSON.stringify(snapshot.assets),
							bindingsJson: JSON.stringify(snapshot.bindings ?? []),
							contextJson: buildContextJson(editor),
							widgetVersion: MCP_SERVER_VERSION,
						},
					})
					logIfDevMode('Exec: result submitted')
				} catch (err) {
					logIfDevMode(`Exec: _submit_result failed: ${err}`)
				}
				zoomToFitRequestShapes(editor, new Set(snapshot.shapes.map((s) => s.id)))
				const resultStr =
					execResult.result !== undefined ? JSON.stringify(execResult.result, null, 2) : undefined
				pushCanvasContext(app, editor, {
					canvasId: job.targetCanvasId,
					message: resultStr
						? `Code executed successfully on canvas. Return value:\n${resultStr}`
						: 'Code executed successfully on canvas.',
				})
			} else {
				try {
					await app.callServerTool({
						name: '_submit_result',
						arguments: {
							canvasId: rendezvousCanvasId,
							execId: job.execId,
							result: { success: false, error: execResult.error },
							widgetVersion: MCP_SERVER_VERSION,
						},
					})
				} catch (err) {
					logIfDevMode(`Exec: _submit_result (error) failed: ${err}`)
				}
				clearCanvasContext(app, {
					message:
						'Canvas context was cleared because code execution failed. Fix the error before using the canvas context again.',
				})
				teardownEditor()
				setExecError(execResult.error ?? 'Unknown error')
				void app.sendSizeChanged({ width: 400, height: ERROR_BANNER_HEIGHT })
			}
		}

		app.ontoolinput = (params) => {
			const code = params.arguments?.code
			if (typeof code !== 'string' || !code.trim()) return
			const baseCanvasId =
				typeof params.arguments?.canvasId === 'string' ? params.arguments.canvasId : undefined
			pendingArgsRef.current = { code, baseCanvasId, final: true }
			logIfDevMode(`ontoolinput: base=${baseCanvasId ?? 'none'}`)

			// The final input supersedes any scheduled partial probe.
			if (partialProbeTimerRef.current !== null) {
				window.clearTimeout(partialProbeTimerRef.current)
				partialProbeTimerRef.current = null
			}

			// With a base, the rendezvous canvas is in our own args — start now.
			// Without one, the server-minted canvasId arrives with the tool
			// result (or already did, on hosts that deliver result first).
			const rendezvous = baseCanvasId ?? myCanvasIdRef.current
			if (rendezvous) {
				void runExecJob(rendezvous, code)
			}
		}

		app.ontoolinputpartial = (params) => {
			// Args source for hosts that never deliver a usable final input
			// before the result, and the trigger for speculative job probes.
			const code = params.arguments?.code
			if (typeof code !== 'string' || !code.trim()) return
			if (pendingArgsRef.current?.final) return
			const baseCanvasId =
				typeof params.arguments?.canvasId === 'string' ? params.arguments.canvasId : undefined
			pendingArgsRef.current = { code, baseCanvasId, final: false }

			if (execStartedRef.current) return
			if (partialProbeTimerRef.current !== null) {
				window.clearTimeout(partialProbeTimerRef.current)
			}
			partialProbeTimerRef.current = window.setTimeout(() => {
				partialProbeTimerRef.current = null
				void probePartialExec()
			}, PARTIAL_PROBE_DEBOUNCE_MS)
		}

		app.ontoolresult = async (result) => {
			logIfDevMode('ontoolresult received')
			markAiActivity()

			const canvasId = parseCanvasIdFromToolResult(result)
			if (canvasId && !myCanvasIdRef.current) {
				myCanvasIdRef.current = canvasId
				logIfDevMode(`Learned canvasId from tool result: ${canvasId}`)
			}

			const args = pendingArgsRef.current
			if (!execStartedRef.current && args?.code) {
				// New-canvas flow (rendezvous = the id we just learned), or a host
				// that delivers input and result together.
				const rendezvous = args.baseCanvasId ?? canvasId
				if (rendezvous) {
					void runExecJob(rendezvous, args.code)
					return
				}
			}

			if (needsStateLoadRef.current && canvasId) {
				needsStateLoadRef.current = false
				void loadAndRender(canvasId)
				return
			}

			if (!execStartedRef.current && !args?.code && canvasId) {
				// Remount without usable tool input: pure viewer.
				void loadAndRender(canvasId)
			}
		}

		app.ontoolcancelled = (_params) => {
			if (partialProbeTimerRef.current !== null) {
				window.clearTimeout(partialProbeTimerRef.current)
				partialProbeTimerRef.current = null
			}
			markAiActivity()
			logIfDevMode('Tool invocation cancelled')
		}

		app.onteardown = async () => {
			// The one sanctioned save moment: the host awaits this before
			// unmounting, so flush any pending user edits.
			await flushUserEdit()
			return {}
		}

		const handlePageHide = () => {
			void flushUserEdit()
		}
		window.addEventListener('pagehide', handlePageHide)

		return () => {
			window.removeEventListener('pagehide', handlePageHide)
			teardownEditor()
		}
	}, [
		app,
		applyHostThemeToEditor,
		enableDevMode,
		flushUserEdit,
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
					if (isExecutingRef.current) return
					markUserEdit()
					scheduleUserEditPush()
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
		},
		[canvasTheme, markUserEdit, scheduleUserEditPush]
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
