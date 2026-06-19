import type { TLShape } from 'tldraw'
import packageJson from '../../package.json'
import type { EditorApiSpec, MethodMap } from './generated-data'
import type { PendingRequests } from './pending-requests'

export interface PendingBootstrap {
	canvasId: string
	checkpointId: string | null
}

export interface ServerDeps {
	saveCheckpoint(id: string, shapes: TLShape[], assets?: unknown[], bindings?: unknown[]): void
	loadCheckpoint(id: string): { shapes: unknown[]; assets: unknown[]; bindings: unknown[] } | null
	getActiveCheckpointId(): string | null
	setActiveCheckpointId(id: string): void
	getCanvasCheckpointId(canvasId: string): string | null
	setCanvasCheckpointId(canvasId: string, checkpointId: string): void
	setPendingBootstrap(bootstrap: PendingBootstrap): void
	consumePendingBootstrap(): PendingBootstrap | null
	getSessionId(): string
	/**
	 * The full Durable Object name of this session's canonical DO, including its
	 * transport prefix (e.g. `streamable-http:<id>` or `sse:<id>`). This is the
	 * routing key the widget echoes back so widget-initiated calls can be
	 * forwarded to the DO that actually holds this session's state.
	 */
	getDoName(): string
	loadWidgetHtml(): Promise<string>
	loadEditorApiSpec(): Promise<EditorApiSpec>
	loadMethodMap(): Promise<MethodMap>
}

export interface RegisterToolsOptions {
	/** Extra CSP resource domains (e.g. R2 image URLs). */
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
	/** Pending requests store for widget→server callback bridge. */
	pendingRequests: PendingRequests
	/**
	 * Durable Object namespace, used to forward widget-initiated app-only calls
	 * to the canonical session DO when they land on the wrong instance (hosts
	 * are inconsistent about preserving the MCP session id). When omitted,
	 * forwarding is disabled and calls are always handled locally.
	 */
	mcpObject?: DurableObjectNamespace
	/**
	 * Maps an exec pending-request channel to the canvasId it created. Lives on
	 * the DO instance so both the `exec`/`_exec_callback` handlers and the
	 * forwarded-call entry point ({@link ForwardTarget.handleForwardedCall})
	 * read and clear the same entries.
	 */
	execChannelCanvasIds: Map<string, string>
}

/** Tool argument carrying the canonical DO name the widget should route to. */
export const ROUTING_DO_NAME_ARG = '__doName'

/** App-only operations that a non-canonical DO can forward to the canonical DO. */
export type ForwardOp = 'exec_callback' | 'get_canvas_state' | 'read_checkpoint' | 'save_checkpoint'

/** Result envelope returned by {@link ForwardTarget.handleForwardedCall}. */
export interface ForwardResult {
	ok: boolean
	data?: unknown
}

/**
 * Minimal RPC surface of the canonical session DO, used to forward widget calls
 * without importing the worker class (avoids a circular import).
 */
export interface ForwardTarget {
	handleForwardedCall(op: ForwardOp, payload: unknown): Promise<ForwardResult>
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
	'Use `search` to query the tldraw Editor API spec (e.g. search for methods by category or name). Use `exec` to run JavaScript on the canvas — your code receives `editor` (the tldraw Editor instance) and helpers like toRichText, createShapeId, createArrowBetweenShapes. The current canvas state is kept in model context as raw TLShape, asset, and binding data.'

export const CANVAS_RESOURCE_URI = 'ui://show-canvas/mcp-app.html'

/** Must match `compatibility_date` in wrangler.toml. */
export const WORKER_COMPATIBILITY_DATE = '2025-03-10'

export const MAX_CHECKPOINTS = 200

export type MCP_APP_HOST_NAMES = 'cursor' | 'vscode' | 'claude' | 'chatgpt'
