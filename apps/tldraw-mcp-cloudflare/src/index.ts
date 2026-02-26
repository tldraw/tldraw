import { registerAppResource, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult, ReadResourceResult } from '@modelcontextprotocol/sdk/types.js'
import { McpAgent } from 'agents/mcp'
import type { TLShape } from 'tldraw'
import { z } from 'zod'

// Shared imports — no duplication
import { convertTldrawRecordToFocusedShape } from '../../tldraw-mcp-app/src/focused-shape'
import { parseJsonArray } from '../../tldraw-mcp-app/src/parse-json'
import { READ_ME_CONTENT } from '../../tldraw-mcp-app/src/tools/read-me'

// --- Types ---

interface Env {
	MCP_OBJECT: DurableObjectNamespace
	ASSETS: Fetcher
	IMAGES: R2Bucket
	MCP_AUTH_TOKEN: string
}

// --- Constants ---

const CANVAS_RESOURCE_URI = 'ui://show-canvas/mcp-app.html'
const MAX_CHECKPOINTS = 200

// --- Helper functions (copied from server.ts) ---

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseTlShapes(value: unknown[]): TLShape[] {
	return value.filter(
		(s): s is TLShape => isPlainObject(s) && typeof s.id === 'string' && typeof s.type === 'string'
	)
}

function generateCheckpointId(): string {
	return crypto.randomUUID().replace(/-/g, '').slice(0, 18)
}

function errorResponse(err: unknown, summary?: string): CallToolResult {
	const message = err instanceof Error ? err.message : String(err)
	return {
		content: [{ type: 'text', text: `Error: ${message}\n${summary ?? ''}` }],
		isError: true,
	}
}

// --- Widget HTML loader ---

async function loadWidgetHtml(assets: Fetcher): Promise<string> {
	const response = await assets.fetch(new Request('https://assets.local/mcp-app.html'))
	if (!response.ok) throw new Error(`Failed to load widget HTML: ${response.status}`)
	return response.text()
}

// --- CORS helpers ---

const CORS_HEADERS: Record<string, string> = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, Mcp-Session-Id',
}

function corsResponse(response: Response): Response {
	const headers = new Headers(response.headers)
	for (const [key, value] of Object.entries(CORS_HEADERS)) {
		headers.set(key, value)
	}
	return new Response(response.body, { status: response.status, headers })
}

// --- McpAgent Durable Object ---
// Use `as any` for the server property because we alias @modelcontextprotocol/sdk
// to the agents' bundled copy at runtime (via wrangler.toml [alias]), but TypeScript
// sees our direct dependency's types which are a different declaration.

export class TldrawMCP extends McpAgent<Env> {
	server = new McpServer({ name: 'tldraw', version: '1.0.0' }) as any
	activeCheckpointId: string | null = null

	async init() {
		// --- DO SQLite setup ---
		this
			.sql`CREATE TABLE IF NOT EXISTS checkpoints (id TEXT PRIMARY KEY, data TEXT, created_at INTEGER)`
		this.sql`CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)`

		// Restore active checkpoint on reconnect
		const rows = [...this.sql`SELECT value FROM meta WHERE key = 'activeCheckpointId'`]
		if (rows.length > 0) this.activeCheckpointId = rows[0].value as string

		// --- Widget resource ---
		const widgetHtml = await loadWidgetHtml((this as any).env.ASSETS)

		registerAppResource(
			this.server,
			CANVAS_RESOURCE_URI,
			CANVAS_RESOURCE_URI,
			{ mimeType: RESOURCE_MIME_TYPE },
			async (): Promise<ReadResourceResult> => ({
				contents: [
					{
						uri: CANVAS_RESOURCE_URI,
						mimeType: RESOURCE_MIME_TYPE,
						text: widgetHtml,
						_meta: {
							ui: {
								csp: {
									resourceDomains: [
										'https://cdn.tldraw.com',
										'https://fonts.googleapis.com',
										'https://fonts.gstatic.com',
									],
									connectDomains: ['https://cdn.tldraw.com'],
								},
							},
						},
					},
				],
			})
		)

		// --- read_me tool ---
		this.server.tool(
			'read_me',
			'Get the tldraw shape format reference. Call this FIRST before creating diagrams.',
			{},
			async (): Promise<CallToolResult> => ({
				content: [{ type: 'text', text: READ_ME_CONTENT }],
			})
		)

		// --- read_checkpoint (app-only) ---
		this.server.registerTool(
			'read_checkpoint',
			{
				title: 'Read Checkpoint',
				description: 'App-only: read shapes from a checkpoint by ID.',
				inputSchema: z.object({ checkpointId: z.string().min(1) }),
				_meta: { ui: { visibility: ['app'] } },
			},
			async ({ checkpointId }: { checkpointId: string }): Promise<CallToolResult> => {
				const raw = this.loadCheckpoint(checkpointId)
				const shapes = raw ? parseTlShapes(raw) : null
				if (!shapes) {
					return {
						content: [{ type: 'text', text: 'Not found.' }],
						structuredContent: { shapes: [] },
					}
				}
				const focusedShapes = shapes
					.map((s) => {
						try {
							return convertTldrawRecordToFocusedShape(s)
						} catch {
							return null
						}
					})
					.filter(Boolean)
				return {
					content: [{ type: 'text', text: `${shapes.length} shape(s).` }],
					structuredContent: { shapes, focusedShapes },
				}
			}
		)

		// --- save_checkpoint (app-only) ---
		this.server.registerTool(
			'save_checkpoint',
			{
				title: 'Save Checkpoint',
				description: 'App-only: save shapes to a checkpoint (from user edits).',
				inputSchema: z.object({
					checkpointId: z.string().min(1),
					shapesJson: z.string(),
				}),
				_meta: { ui: { visibility: ['app'] } },
			},
			async ({
				checkpointId,
				shapesJson,
			}: {
				checkpointId: string
				shapesJson: string
			}): Promise<CallToolResult> => {
				try {
					console.error(
						`[tldraw-mcp] save_checkpoint called: checkpointId=${checkpointId}, prev activeCheckpointId=${this.activeCheckpointId}`
					)
					const raw = parseJsonArray(shapesJson, 'shapesJson')
					const shapes = parseTlShapes(raw)
					this.saveCheckpoint(checkpointId, shapes)
					console.error(
						`[tldraw-mcp] save_checkpoint done: activeCheckpointId=${this.activeCheckpointId}, shapes=${shapes.length}`
					)
					return {
						content: [{ type: 'text', text: `Saved ${shapes.length} shape(s).` }],
					}
				} catch (err) {
					return errorResponse(err)
				}
			}
		)
	}

	// --- Checkpoint helpers ---

	saveCheckpoint(id: string, shapes: unknown[]) {
		this
			.sql`INSERT OR REPLACE INTO checkpoints (id, data, created_at) VALUES (${id}, ${JSON.stringify(shapes)}, ${Date.now()})`
		this.activeCheckpointId = id
		this.sql`INSERT OR REPLACE INTO meta (key, value) VALUES ('activeCheckpointId', ${id})`

		// Evict old checkpoints beyond MAX_CHECKPOINTS (LRU)
		this
			.sql`DELETE FROM checkpoints WHERE id NOT IN (SELECT id FROM checkpoints ORDER BY created_at DESC LIMIT ${MAX_CHECKPOINTS})`
	}

	loadCheckpoint(id: string): unknown[] | null {
		const rows = [...this.sql`SELECT data FROM checkpoints WHERE id = ${id}`]
		return rows.length > 0 ? JSON.parse(rows[0].data as string) : null
	}

	getActiveShapes(): TLShape[] {
		if (!this.activeCheckpointId) return []
		const raw = this.loadCheckpoint(this.activeCheckpointId)
		return raw ? parseTlShapes(raw) : []
	}
}

// --- Fetch handler ---
// McpAgent.serve() handles CORS, session management, and transport internally.
// Expose both transports: Streamable HTTP at /mcp, SSE at /sse.
// MCP Inspector works with SSE; Claude web uses Streamable HTTP.

const mcpHandler = (TldrawMCP as any).serve('/mcp')
const sseHandler = (TldrawMCP as any).serveSSE('/sse')

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url)

		// Health check
		if (url.pathname === '/health') return new Response('OK')

		// R2 image serving (placeholder for step 3)
		if (url.pathname.startsWith('/images/')) {
			const key = url.pathname.slice(1)
			const object = await env.IMAGES.get(key)
			if (!object) return new Response('Not found', { status: 404 })
			return new Response(object.body, {
				headers: {
					'Content-Type': object.httpMetadata?.contentType ?? 'image/png',
					'Cache-Control': 'public, max-age=31536000, immutable',
					'Access-Control-Allow-Origin': '*',
				},
			})
		}

		// SSE transport (for MCP Inspector and legacy clients)
		if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
			return sseHandler.fetch(request, env, ctx)
		}

		// Streamable HTTP transport (for Claude web and modern clients)
		return mcpHandler.fetch(request, env, ctx)
	},
}
