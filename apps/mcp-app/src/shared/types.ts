import { DEFAULT_SUPPORTED_IMAGE_TYPES } from '@tldraw/utils'
import type { TLShape } from 'tldraw'

export interface ServerDeps {
	saveCheckpoint(id: string, shapes: TLShape[], assets?: unknown[], bindings?: unknown[]): void
	loadCheckpoint(id: string): { shapes: unknown[]; assets: unknown[]; bindings: unknown[] } | null
	getActiveShapes(): TLShape[]
	getActiveAssets(): unknown[]
	getActiveBindings(): unknown[]
	getActiveCheckpointId(): string | null
	setActiveCheckpointId(id: string): void
	getSessionId(): string
	loadWidgetHtml(): Promise<string>
}

export interface RegisterToolsOptions {
	/** Extra CSP resource domains (e.g. R2 image URLs). */
	extraResourceDomains?: string[]
	/** Extra CSP connect domains. */
	extraConnectDomains?: string[]
	/** When set, the canvas resource domain is resolved from the connecting client. */
	httpDomain?: { openai: string; claude: string }
	/** Logging function (defaults to console.error). */
	log?(...args: unknown[]): void
	/** Analytics engine dataset. */
	analytics?: AnalyticsEngineDataset
	/** Returns the resolved host name of the connected client. */
	getClientHostName(): MCP_APP_HOST_NAMES | undefined
}

export const MCP_SERVER_NAME = 'tldraw'
export const MCP_SERVER_VERSION = '0.1.0'
export const MCP_SERVER_TITLE = 'tldraw Canvas'
export const MCP_SERVER_DESCRIPTION =
	'An interactive tldraw canvas with tools for diagramming, drawing, and more.'
export const MCP_SERVER_WEBSITE_URL = 'https://www.tldraw.com'
export const MCP_SERVER_INSTRUCTIONS =
	'Use read_me for shape format examples. For create_shapes, update_shapes, and delete_shapes, send JSON array strings (build the array first, then JSON.stringify). Use create_shapes before update_shapes or delete_shapes when the canvas is empty.'

export const CANVAS_RESOURCE_URI = 'ui://show-canvas/mcp-app.html'

const MIME_TO_EXT: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
	'image/gif': 'gif',
	'image/apng': 'apng',
	'image/avif': 'avif',
	'image/svg+xml': 'svg',
}

export const ALLOWED_IMAGE_TYPES: Record<string, string> = Object.fromEntries(
	DEFAULT_SUPPORTED_IMAGE_TYPES.filter((mime) => mime in MIME_TO_EXT).map((mime) => [
		mime,
		MIME_TO_EXT[mime],
	])
)

export const MAX_CHECKPOINTS = 200

export type MCP_APP_HOST_NAMES = 'cursor' | 'vscode' | 'claude' | 'chatgpt'
