import {
	registerAppResource,
	registerAppTool,
	RESOURCE_MIME_TYPE,
} from '@modelcontextprotocol/ext-apps/server'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult, ReadResourceResult } from '@modelcontextprotocol/sdk/types.js'
import { McpAgent } from 'agents/mcp'
import type { TLShape } from 'tldraw'
import { z } from 'zod'

// Shared imports — no duplication
import {
	convertFocusedShapeToTldrawRecord,
	convertTldrawRecordToFocusedShape,
	type FocusedShape,
} from '../../tldraw-mcp-app/src/focused-shape'
import {
	parseBooleanFlag,
	parseFocusedShapesInput,
	parseFocusedShapeUpdatesInput,
	parseJsonArray,
	parseShapeIdsInput,
} from '../../tldraw-mcp-app/src/parse-json'
import { READ_ME_CONTENT } from '../../tldraw-mcp-app/src/tools/read-me'

// --- Types ---

interface Env {
	MCP_OBJECT: DurableObjectNamespace
	ASSETS: Fetcher
	IMAGES: R2Bucket
	MCP_AUTH_TOKEN: string
	WORKER_ORIGIN: string
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

function normalizeShapeId(id: string): string {
	return id.startsWith('shape:') ? id : `shape:${id}`
}

function toSimpleShapeId(id: string): string {
	return id.replace(/^shape:/, '')
}

function deepMerge(base: unknown, patch: unknown): unknown {
	if (!isPlainObject(base) || !isPlainObject(patch)) return patch
	const merged: Record<string, unknown> = { ...base }
	for (const [key, value] of Object.entries(patch)) {
		merged[key] = deepMerge(merged[key], value)
	}
	return merged
}

function errorResponse(err: unknown, summary?: string): CallToolResult {
	const message = err instanceof Error ? err.message : String(err)
	return {
		content: [{ type: 'text', text: `Error: ${message}\n${summary ?? ''}` }],
		isError: true,
	}
}

// --- Schemas ---

const createShapesInputSchema = z.object({
	new_blank_canvas: z
		.boolean()
		.optional()
		.describe('If true, create_shapes starts from a new blank canvas. Defaults to false.'),
	shapesJson: z
		.string()
		.describe('JSON array string of shapes. Must be a valid JSON array string.'),
})

type CreateShapesInput = z.infer<typeof createShapesInputSchema>

const updateShapesInputSchema = z.object({
	updatesJson: z
		.string()
		.describe('JSON array string of shape updates. Must be a valid JSON array string.'),
})

type UpdateShapesInput = z.infer<typeof updateShapesInputSchema>

const deleteShapesInputSchema = z.object({
	shapeIdsJson: z
		.string()
		.describe(
			'JSON array string of shape ids to delete. Must be a valid JSON array string of shape ids.'
		),
})

type DeleteShapesInput = z.infer<typeof deleteShapesInputSchema>

const createImageInputSchema = z.object({
	url: z.string().describe('Public URL of the image to place on the canvas.'),
	x: z.number().describe('X position of the image on the canvas.'),
	y: z.number().describe('Y position of the image on the canvas.'),
	w: z.number().describe('Width of the image on the canvas.'),
	h: z.number().describe('Height of the image on the canvas.'),
})

type CreateImageInput = z.infer<typeof createImageInputSchema>

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
	'image/png': 'png',
	'image/jpeg': 'jpg',
	'image/gif': 'gif',
	'image/webp': 'webp',
	'image/svg+xml': 'svg',
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
										...((this as any).env.WORKER_ORIGIN ? [(this as any).env.WORKER_ORIGIN] : []),
									],
									connectDomains: [
										'https://cdn.tldraw.com',
										...((this as any).env.WORKER_ORIGIN ? [(this as any).env.WORKER_ORIGIN] : []),
									],
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

		// --- create_shapes ---

		registerAppTool(
			this.server,
			'create_shapes',
			{
				title: 'Create Shapes',
				description:
					'Creates shapes from a JSON string (FocusedShape[]). Optional new_blank_canvas=true starts from a blank canvas.',
				inputSchema: createShapesInputSchema,
				_meta: { ui: { resourceUri: CANVAS_RESOURCE_URI } },
			},
			async ({ shapesJson, new_blank_canvas }: CreateShapesInput): Promise<CallToolResult> => {
				try {
					const newBlankCanvas = parseBooleanFlag(new_blank_canvas, false)
					const focusedShapes = parseFocusedShapesInput(shapesJson)
					const newRecords = focusedShapes.map((s: FocusedShape) =>
						convertFocusedShapeToTldrawRecord(s)
					)

					const baseShapes = newBlankCanvas ? [] : this.getActiveShapes()
					const mergedById = new Map<string, TLShape>()
					for (const s of baseShapes) mergedById.set(s.id, structuredClone(s))
					for (const s of newRecords) mergedById.set(s.id, structuredClone(s))
					const resultShapes = [...mergedById.values()]

					const checkpointId = generateCheckpointId()
					this.saveCheckpoint(checkpointId, resultShapes)

					return {
						content: [
							{
								type: 'text',
								text: newBlankCanvas
									? `Created ${focusedShapes.length} shape(s) on a new blank canvas.`
									: `Created ${focusedShapes.length} shape(s).`,
							},
							{ type: 'text', text: JSON.stringify(focusedShapes, null, 2) },
						],
						structuredContent: {
							checkpointId,
							action: 'create' as const,
							newBlankCanvas,
							hadBaseShapes: baseShapes.length > 0,
							focusedShapes,
							tldrawRecords: resultShapes,
						},
					}
				} catch (err) {
					return errorResponse(err, shapesJson)
				}
			}
		)

		// --- update_shapes ---

		registerAppTool(
			this.server,
			'update_shapes',
			{
				title: 'Update Shapes',
				description:
					'Updates existing shapes from a JSON string (FocusedShapeUpdate[]). Designed for partial-input streaming previews in the canvas app.',
				inputSchema: updateShapesInputSchema,
				_meta: { ui: { resourceUri: CANVAS_RESOURCE_URI } },
			},
			async ({ updatesJson }: UpdateShapesInput): Promise<CallToolResult> => {
				try {
					const updates = parseFocusedShapeUpdatesInput(updatesJson)
					const baseShapes = this.getActiveShapes()
					const shapesById = new Map(baseShapes.map((s) => [s.id, structuredClone(s)]))
					const updated: string[] = []

					for (const update of updates) {
						const id = normalizeShapeId(update.shapeId) as TLShape['id']
						const existing = shapesById.get(id)
						if (!existing) continue

						try {
							const existingFocused = convertTldrawRecordToFocusedShape(existing)
							const merged = deepMerge(existingFocused, {
								...update,
								shapeId: toSimpleShapeId(id),
								_type: update._type ?? existingFocused._type,
							}) as FocusedShape
							const converted = convertFocusedShapeToTldrawRecord(merged)
							converted.index = existing.index
							shapesById.set(id, converted)
							updated.push(toSimpleShapeId(id))
						} catch {
							// Skip invalid update inputs.
						}
					}

					const resultShapes = [...shapesById.values()]

					const checkpointId = generateCheckpointId()
					this.saveCheckpoint(checkpointId, resultShapes)

					return {
						content: [
							{
								type: 'text',
								text: `Updated ${updated.length} shape(s).`,
							},
						],
						structuredContent: {
							checkpointId,
							action: 'update' as const,
							updates,
							tldrawRecords: resultShapes,
						},
					}
				} catch (err) {
					return errorResponse(err)
				}
			}
		)

		// --- delete_shapes ---

		registerAppTool(
			this.server,
			'delete_shapes',
			{
				title: 'Delete Shapes',
				description:
					'Deletes shapes by id from a JSON string (string[]). Designed for partial-input streaming previews in the canvas app.',
				inputSchema: deleteShapesInputSchema,
				_meta: { ui: { resourceUri: CANVAS_RESOURCE_URI } },
			},
			async ({ shapeIdsJson }: DeleteShapesInput): Promise<CallToolResult> => {
				try {
					const shapeIds = parseShapeIdsInput(shapeIdsJson)
					const baseShapes = this.getActiveShapes()
					const idsToDelete = new Set(shapeIds.map((id) => normalizeShapeId(id)))
					const resultShapes = baseShapes.filter((s) => !idsToDelete.has(s.id))
					const deletedCount = baseShapes.length - resultShapes.length

					const checkpointId = generateCheckpointId()
					this.saveCheckpoint(checkpointId, resultShapes)

					return {
						content: [
							{
								type: 'text',
								text: `Deleted ${deletedCount} shape(s).`,
							},
						],
						structuredContent: {
							checkpointId,
							action: 'delete' as const,
							shapeIds,
							tldrawRecords: resultShapes,
						},
					}
				} catch (err) {
					return errorResponse(err)
				}
			}
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
				const checkpoint = this.loadCheckpoint(checkpointId)
				if (!checkpoint) {
					return {
						content: [{ type: 'text', text: 'Not found.' }],
						structuredContent: { shapes: [], assets: [] },
					}
				}
				const shapes = parseTlShapes(checkpoint.shapes)
				const assets = checkpoint.assets
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
					content: [
						{ type: 'text', text: `${shapes.length} shape(s), ${assets.length} asset(s).` },
					],
					structuredContent: { shapes, assets, focusedShapes },
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
					assetsJson: z.string().optional(),
				}),
				_meta: { ui: { visibility: ['app'] } },
			},
			async ({
				checkpointId,
				shapesJson,
				assetsJson,
			}: {
				checkpointId: string
				shapesJson: string
				assetsJson?: string
			}): Promise<CallToolResult> => {
				try {
					const raw = parseJsonArray(shapesJson, 'shapesJson')
					const shapes = parseTlShapes(raw)
					const assets = assetsJson ? parseJsonArray(assetsJson, 'assetsJson') : []
					this.saveCheckpoint(checkpointId, shapes, assets)
					return {
						content: [
							{ type: 'text', text: `Saved ${shapes.length} shape(s), ${assets.length} asset(s).` },
						],
					}
				} catch (err) {
					return errorResponse(err)
				}
			}
		)

		// --- upload_image (app-only) ---
		this.server.registerTool(
			'upload_image',
			{
				title: 'Upload Image',
				description: 'App-only: upload a base64-encoded image to R2 storage.',
				inputSchema: z.object({
					filename: z.string(),
					base64: z.string(),
					contentType: z.string(),
				}),
				_meta: { ui: { visibility: ['app'] } },
			},
			async ({
				filename,
				base64,
				contentType,
			}: {
				filename: string
				base64: string
				contentType: string
			}): Promise<CallToolResult> => {
				try {
					const ext = ALLOWED_IMAGE_TYPES[contentType]
					if (!ext) {
						return errorResponse(
							new Error(
								`Unsupported content type: ${contentType}. Allowed: ${Object.keys(ALLOWED_IMAGE_TYPES).join(', ')}`
							)
						)
					}

					const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
					const key = `images/${crypto.randomUUID()}.${ext}`

					await ((this as any).env as Env).IMAGES.put(key, bytes, {
						httpMetadata: { contentType },
						customMetadata: { originalFilename: filename },
					})

					// Build the absolute public URL so the widget iframe can fetch it
					const origin = ((this as any).env as Env).WORKER_ORIGIN || ''
					const imageUrl = `${origin}/${key}`

					return {
						content: [{ type: 'text', text: `Uploaded image: ${imageUrl}` }],
						structuredContent: { imageUrl, key, contentType },
					}
				} catch (err) {
					return errorResponse(err)
				}
			}
		)

		// --- create_image ---
		registerAppTool(
			this.server,
			'create_image',
			{
				title: 'Create Image',
				description:
					'Places an image on the canvas at a specified position and size. Provide a public image URL.',
				inputSchema: createImageInputSchema,
				_meta: { ui: { resourceUri: CANVAS_RESOURCE_URI } },
			},
			async ({ url, x, y, w, h }: CreateImageInput): Promise<CallToolResult> => {
				try {
					const shapeId = `shape:${crypto.randomUUID().replace(/-/g, '').slice(0, 18)}`
					const assetId = `asset:${crypto.randomUUID().replace(/-/g, '').slice(0, 18)}`

					// Create the asset record (needed for tldraw to render the image)
					const assetRecord = {
						id: assetId,
						typeName: 'asset',
						type: 'image',
						props: {
							w,
							h,
							name: url.split('/').pop() ?? 'image',
							isAnimated: false,
							mimeType: null,
							src: url,
						},
						meta: {},
					}

					// Create the image shape
					const imageShape: TLShape = {
						id: shapeId,
						type: 'image',
						x,
						y,
						rotation: 0,
						index: 'a1' as any,
						parentId: 'page:page' as any,
						isLocked: false,
						opacity: 1,
						props: {
							w,
							h,
							playing: true,
							url,
							assetId,
							crop: null,
							flipX: false,
							flipY: false,
							altText: '',
						},
						meta: {},
						typeName: 'shape',
					} as TLShape

					const baseShapes = this.getActiveShapes()
					const existingAssets = this.getActiveAssets()
					const resultShapes = [...baseShapes, imageShape]

					const checkpointId = generateCheckpointId()
					this.saveCheckpoint(checkpointId, resultShapes, [...existingAssets, assetRecord])

					return {
						content: [
							{ type: 'text', text: `Created image shape at (${x}, ${y}) with size ${w}x${h}.` },
						],
						structuredContent: {
							checkpointId,
							action: 'create' as const,
							newBlankCanvas: false,
							hadBaseShapes: baseShapes.length > 0,
							tldrawRecords: resultShapes,
							assetRecords: [assetRecord],
						},
					}
				} catch (err) {
					return errorResponse(err)
				}
			}
		)
	}

	// --- Checkpoint helpers ---

	saveCheckpoint(id: string, shapes: unknown[], assets: unknown[] = []) {
		const data = JSON.stringify({ shapes, assets })
		this
			.sql`INSERT OR REPLACE INTO checkpoints (id, data, created_at) VALUES (${id}, ${data}, ${Date.now()})`
		this.activeCheckpointId = id
		this.sql`INSERT OR REPLACE INTO meta (key, value) VALUES ('activeCheckpointId', ${id})`

		// Evict old checkpoints beyond MAX_CHECKPOINTS (LRU)
		this
			.sql`DELETE FROM checkpoints WHERE id NOT IN (SELECT id FROM checkpoints ORDER BY created_at DESC LIMIT ${MAX_CHECKPOINTS})`
	}

	loadCheckpoint(id: string): { shapes: unknown[]; assets: unknown[] } | null {
		const rows = [...this.sql`SELECT data FROM checkpoints WHERE id = ${id}`]
		if (rows.length === 0) return null
		const parsed = JSON.parse(rows[0].data as string)
		// Backwards compat: old checkpoints stored a plain array of shapes
		if (Array.isArray(parsed)) return { shapes: parsed, assets: [] }
		return { shapes: parsed.shapes ?? [], assets: parsed.assets ?? [] }
	}

	getActiveShapes(): TLShape[] {
		if (!this.activeCheckpointId) return []
		const checkpoint = this.loadCheckpoint(this.activeCheckpointId)
		return checkpoint ? parseTlShapes(checkpoint.shapes) : []
	}

	getActiveAssets(): unknown[] {
		if (!this.activeCheckpointId) return []
		const checkpoint = this.loadCheckpoint(this.activeCheckpointId)
		return checkpoint ? checkpoint.assets : []
	}
}

// --- Fetch handler ---
// McpAgent.serve() handles CORS, session management, and transport internally.
// Expose both transports: Streamable HTTP at /mcp, SSE at /sse.
// MCP Inspector works with SSE; Claude web and ChatGPT use Streamable HTTP.

const mcpHandler = (TldrawMCP as any).serve('/mcp')
const sseHandler = (TldrawMCP as any).serveSSE('/sse')

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url)

		// CORS preflight (needed for Claude web / ChatGPT Custom Connector)
		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: CORS_HEADERS })
		}

		// Health check (no auth)
		if (url.pathname === '/health') return new Response('OK')

		// R2 image serving (no auth — public, immutable assets)
		if (url.pathname.startsWith('/images/')) {
			return handleImageRequest(url, env)
		}

		// Auth check for MCP endpoints: skip if MCP_AUTH_TOKEN not set (local dev)
		if (env.MCP_AUTH_TOKEN) {
			const auth = request.headers.get('Authorization')
			if (auth !== `Bearer ${env.MCP_AUTH_TOKEN}`) {
				return corsResponse(new Response('Unauthorized', { status: 401 }))
			}
		}

		// SSE transport (for MCP Inspector and legacy clients)
		if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
			return sseHandler.fetch(request, env, ctx)
		}

		// Streamable HTTP transport (for Claude web, ChatGPT, and modern clients)
		if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
			return mcpHandler.fetch(request, env, ctx)
		}

		return new Response('Not found', { status: 404 })
	},
}

async function handleImageRequest(url: URL, env: Env): Promise<Response> {
	const key = url.pathname.slice(1) // "images/uuid.png"
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
