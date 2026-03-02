import type { TLShape } from 'tldraw'

export interface ServerDeps {
	saveCheckpoint(id: string, shapes: TLShape[], assets?: unknown[]): void
	loadCheckpoint(id: string): { shapes: unknown[]; assets: unknown[] } | null
	getActiveShapes(): TLShape[]
	getActiveAssets(): unknown[]
	getActiveCheckpointId(): string | null
	setActiveCheckpointId(id: string): void
	loadWidgetHtml(): Promise<string>
}

export interface RegisterToolsOptions {
	/** Extra CSP resource domains (e.g. R2 image URLs). */
	extraResourceDomains?: string[]
	/** Extra CSP connect domains. */
	extraConnectDomains?: string[]
	/** When set, the canvas resource domain is resolved from the connecting client. */
	httpDomain?: { openai: string; claude: string }
	/** Optional handler for uploading images (Workers-only, R2). */
	uploadImageHandler?(args: {
		filename: string
		base64: string
		contentType: string
		clerkToken?: string
	}): Promise<{ imageUrl: string; key: string; contentType: string }>
	/** Logging function (defaults to console.error). */
	log?(...args: unknown[]): void
}

export const CANVAS_RESOURCE_URI = 'ui://show-canvas/mcp-app.html'

export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
	'image/png': 'png',
	'image/jpeg': 'jpg',
	'image/gif': 'gif',
	'image/webp': 'webp',
	'image/svg+xml': 'svg',
}

export const MAX_CHECKPOINTS = 200
