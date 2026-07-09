import packageJson from '../../package.json'
import type { EditorApiSpec, MethodMap } from './generated-data'

// --- Canvas state (stored per-canvas in the CanvasStore DO) ---

export interface CanvasStateRecord {
	shapesJson: string
	assetsJson: string
	bindingsJson: string
	/** Focused-format context computed by the last widget to render this canvas. */
	contextJson: string | null
	seq: number
	updatedAt: number
	parentCanvasId: string | null
	lineageId: string | null
}

export interface CanvasSeed {
	shapesJson: string
	assetsJson: string
	bindingsJson: string
	contextJson: string | null
	parentCanvasId: string | null
	lineageId: string
}

// --- Exec jobs ---

export type ExecJobStatus = 'queued' | 'dispatched' | 'done' | 'failed' | 'expired'

/** Result of executing code in the widget, reported via `_submit_result`. */
export interface ExecJobResult {
	success: boolean
	result?: unknown
	error?: string
}

/** Job payload handed to a widget by `pullExecJob`. */
export interface ExecJob {
	execId: string
	code: string
	targetCanvasId: string
	baseShapesJson: string
	baseAssetsJson: string
	baseBindingsJson: string
}

export interface ExecJobSummary {
	execId: string
	status: ExecJobStatus
	createdAt: number
	updatedAt: number
}

/**
 * The CanvasStore DO surface the tool handlers use, via
 * `idFromName('canvas:<canvasId>')`. Methods are the DO's public RPC methods;
 * returns are promises at the stub boundary.
 */
export interface CanvasStoreStub {
	getCanvasState(): Promise<CanvasStateRecord | null>
	seedCanvas(seed: CanvasSeed): Promise<{ seeded: boolean }>
	putCanvasState(state: {
		shapesJson: string
		assetsJson?: string
		bindingsJson?: string
		contextJson?: string
		source: 'exec' | 'user' | 'legacy'
	}): Promise<{ seq: number }>
	enqueueExecJob(job: {
		execId: string
		code: string
		codeHash: string
		targetCanvasId: string
		legacyExecKey?: string
	}): Promise<void>
	pullExecJob(opts: { codeHash: string }): Promise<ExecJob | null>
	completeExecJob(opts: {
		execId: string
		result: ExecJobResult
		shapesJson?: string
		assetsJson?: string
		bindingsJson?: string
		contextJson?: string
	}): Promise<{ handled: boolean; targetCanvasId?: string }>
	completeExecJobByLegacyKey(opts: {
		legacyExecKey: string
		result: ExecJobResult
	}): Promise<{ handled: boolean; execId?: string; targetCanvasId?: string }>
	getRecentJobTarget(): Promise<{ execId: string; targetCanvasId: string } | null>
	waitExecJob(opts: { execId: string; timeoutMs: number }): Promise<ExecJobResult | null>
	getExecJobSummaries(): Promise<ExecJobSummary[]>
}

// --- Server dependencies ---

export interface ServerDeps {
	/** Per-canvas state + job authority, addressed by canvasId. */
	getCanvasStub(canvasId: string): CanvasStoreStub
	/**
	 * Legacy session-keyed checkpoint READ path. Only used as a lazy,
	 * best-effort fallback when an old-format canvasId is used as a base and
	 * its canvas DO is empty. Never written to.
	 */
	getCanvasCheckpointId(canvasId: string): string | null
	loadCheckpoint(id: string): { shapes: unknown[]; assets: unknown[]; bindings: unknown[] } | null
	getSessionId(): string
	getMcpSessionId(): string
	loadWidgetHtml(): Promise<string>
	loadEditorApiSpec(): Promise<EditorApiSpec>
	loadMethodMap(): Promise<MethodMap>
}

export interface RegisterToolsOptions {
	/** Extra CSP resource domains (e.g. image URLs). */
	extraResourceDomains?: string[]
	/** Extra CSP connect domains. */
	extraConnectDomains?: string[]
	/** Dynamic Workers loader for sandboxed server-side code execution. */
	searchWorkerLoader: DynamicWorkerLoader
	/** Public origin of the deployed MCP worker, used for host-specific widget domains. */
	workerOrigin?: string
	/** Flag so the tools, and thus the widget, know if they are running in dev mode. */
	isDev: boolean
	/** Logging function (defaults to console.error). */
	log?(...args: unknown[]): void
	/** Analytics engine dataset. */
	analytics?: AnalyticsEngineDataset
	/** Returns the resolved host name of the connected client. */
	getClientHostName(): MCP_APP_HOST_NAMES | undefined
}

export interface DynamicWorkerLoader {
	load(code: {
		compatibilityDate: string
		mainModule: string
		modules: Record<string, string | { js: string }>
		env?: unknown
		globalOutbound?: null
	}): {
		getEntrypoint(name?: string): unknown
	}
}

export const MCP_SERVER_NAME = 'tldraw'
export const MCP_SERVER_VERSION = packageJson.version
export const MCP_SERVER_TITLE = 'tldraw Canvas'
export const MCP_SERVER_DESCRIPTION =
	'An interactive tldraw canvas with tools for diagramming, drawing, and more.'
export const MCP_SERVER_WEBSITE_URL = 'https://www.tldraw.com'
export const MCP_SERVER_INSTRUCTIONS =
	'Use `search` to query the tldraw Editor API spec (e.g. search for methods by category or name). Use `exec` to run JavaScript on a canvas — your code receives `editor` (the tldraw Editor instance) and helpers like toRichText, createShapeId, createArrowBetweenShapes. Every exec produces a NEW canvas: omit canvasId to start blank, or pass any canvasId from an earlier result to build on that state (the original canvas is never modified — the chat history is a version history, and any canvasId in it remains a valid base). Use `get_canvas` to read the current state of any canvas, including edits the user made by hand.'

// This URI must stay STABLE across deploys: hosts bind the app widget to it at
// connector registration and cache the widget HTML served here, so a stale
// widget build can stay in use after a deploy. Keep the widget↔server protocol
// backward compatible with older widgets (legacy app-only tools stay live shims).
export const CANVAS_RESOURCE_URI = 'ui://show-canvas/mcp-app.html'

/** Must match `compatibility_date` in wrangler.toml. */
export const WORKER_COMPATIBILITY_DATE = '2025-03-10'

export type MCP_APP_HOST_NAMES = 'cursor' | 'vscode' | 'claude' | 'chatgpt'
