/**
 * Shared tool/resource registration logic for both Node.js and Cloudflare Workers entry points.
 *
 * Both `server.ts` (Node) and `src/cloudflare-worker.ts` (Workers) call `registerTools()`
 * with platform-specific storage backends.
 */

import {
	registerAppResource,
	registerAppTool,
	RESOURCE_MIME_TYPE,
} from '@modelcontextprotocol/ext-apps/server'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult, ReadResourceResult } from '@modelcontextprotocol/sdk/types.js'
import type { TLShape } from 'tldraw'
import { structuredClone } from 'tldraw'
import { z } from 'zod'
import {
	convertFocusedShapeToTldrawRecord,
	convertTldrawRecordToFocusedShape,
	type FocusedShape,
} from './focused-shape'
import {
	parseBooleanFlag,
	parseFocusedShapesInput,
	parseFocusedShapeUpdatesInput,
	parseJsonArray,
	parseShapeIdsInput,
} from './parse-json'
import { READ_ME_CONTENT } from './tools/read-me'

// --- Public types ---

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
	uploadImageHandler?: (args: {
		filename: string
		base64: string
		contentType: string
	}) => Promise<{ imageUrl: string; key: string; contentType: string }>
	/** Logging function (defaults to console.error). */
	log?: (...args: unknown[]) => void
}

// --- Constants ---

export const CANVAS_RESOURCE_URI = 'ui://show-canvas/mcp-app.html'

export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
	'image/png': 'png',
	'image/jpeg': 'jpg',
	'image/gif': 'gif',
	'image/webp': 'webp',
	'image/svg+xml': 'svg',
}

// --- Helpers ---

export function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function normalizeShapeId(id: string): string {
	return id.startsWith('shape:') ? id : `shape:${id}`
}

export function toSimpleShapeId(id: string): string {
	return id.replace(/^shape:/, '')
}

export function deepMerge(base: unknown, patch: unknown): unknown {
	if (!isPlainObject(base) || !isPlainObject(patch)) return patch
	const merged: Record<string, unknown> = { ...base }
	for (const [key, value] of Object.entries(patch)) {
		merged[key] = deepMerge(merged[key], value)
	}
	return merged
}

export function parseTlShapes(value: unknown[]): TLShape[] {
	return value.filter(
		(s): s is TLShape => isPlainObject(s) && typeof s.id === 'string' && typeof s.type === 'string'
	)
}

export function errorResponse(err: unknown, summary?: string): CallToolResult {
	const message = err instanceof Error ? err.message : String(err)
	return {
		content: [{ type: 'text', text: `Error: ${message}\n${summary ?? ''}` }],
		isError: true,
	}
}

export function generateCheckpointId(): string {
	return crypto.randomUUID().replace(/-/g, '').slice(0, 18)
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

// --- Registration ---

export function registerTools(
	server: McpServer,
	deps: ServerDeps,
	opts?: RegisterToolsOptions
): void {
	const log = opts?.log ?? ((...args: unknown[]) => console.error(...args))

	// --- read_me ---

	server.registerTool(
		'read_me',
		{
			description:
				'Get the tldraw shape format reference. Call this FIRST before creating diagrams.',
			annotations: {
				readOnlyHint: true,
			},
		},
		async (): Promise<CallToolResult> => ({
			content: [{ type: 'text', text: READ_ME_CONTENT }],
		})
	)

	// --- create_shapes ---

	registerAppTool(
		server,
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
				log(
					`[tldraw-mcp] create_shapes called: new_blank_canvas=${new_blank_canvas}, activeCheckpointId=${deps.getActiveCheckpointId()}`
				)
				const newBlankCanvas = parseBooleanFlag(new_blank_canvas, false)
				const focusedShapes = parseFocusedShapesInput(shapesJson)
				const newRecords = focusedShapes.map((s: FocusedShape) =>
					convertFocusedShapeToTldrawRecord(s)
				)

				const hadActiveCheckpoint = deps.getActiveCheckpointId() !== null
				const baseShapes = newBlankCanvas ? [] : deps.getActiveShapes()
				log(
					`[tldraw-mcp] create_shapes: baseShapes=${baseShapes.length}, newRecords=${newRecords.length}, newBlankCanvas=${newBlankCanvas}, hadActiveCheckpoint=${hadActiveCheckpoint}`
				)
				const mergedById = new Map<string, TLShape>()
				for (const s of baseShapes) mergedById.set(s.id, structuredClone(s))
				for (const s of newRecords) mergedById.set(s.id, structuredClone(s))
				const resultShapes = [...mergedById.values()]

				const checkpointId = generateCheckpointId()
				deps.saveCheckpoint(checkpointId, resultShapes)
				deps.setActiveCheckpointId(checkpointId)

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
		server,
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
				const baseShapes = deps.getActiveShapes()
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
				deps.saveCheckpoint(checkpointId, resultShapes)
				deps.setActiveCheckpointId(checkpointId)

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
		server,
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
				const baseShapes = deps.getActiveShapes()
				const idsToDelete = new Set(shapeIds.map((id) => normalizeShapeId(id)))
				const resultShapes = baseShapes.filter((s) => !idsToDelete.has(s.id))
				const deletedCount = baseShapes.length - resultShapes.length

				const checkpointId = generateCheckpointId()
				deps.saveCheckpoint(checkpointId, resultShapes)
				deps.setActiveCheckpointId(checkpointId)

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

	// --- create_image ---

	registerAppTool(
		server,
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

				const baseShapes = deps.getActiveShapes()
				const existingAssets = deps.getActiveAssets()
				const resultShapes = [...baseShapes, imageShape]

				const checkpointId = generateCheckpointId()
				deps.saveCheckpoint(checkpointId, resultShapes, [...existingAssets, assetRecord])
				deps.setActiveCheckpointId(checkpointId)

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

	// --- read_checkpoint (app-only) ---

	server.registerTool(
		'read_checkpoint',
		{
			title: 'Read Checkpoint',
			description: 'App-only: read shapes from a checkpoint by ID.',
			inputSchema: z.object({ checkpointId: z.string().min(1) }),
			_meta: { ui: { visibility: ['app'] } },
		},
		async ({ checkpointId }: { checkpointId: string }): Promise<CallToolResult> => {
			const checkpoint = deps.loadCheckpoint(checkpointId)
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
				content: [{ type: 'text', text: `${shapes.length} shape(s), ${assets.length} asset(s).` }],
				structuredContent: { shapes, assets, focusedShapes },
			}
		}
	)

	// --- save_checkpoint (app-only) ---

	server.registerTool(
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
				log(
					`[tldraw-mcp] save_checkpoint called: checkpointId=${checkpointId}, prev activeCheckpointId=${deps.getActiveCheckpointId()}`
				)
				const raw = parseJsonArray(shapesJson, 'shapesJson')
				const shapes = parseTlShapes(raw)
				const assets = assetsJson ? parseJsonArray(assetsJson, 'assetsJson') : []
				deps.saveCheckpoint(checkpointId, shapes, assets)
				deps.setActiveCheckpointId(checkpointId)
				log(
					`[tldraw-mcp] save_checkpoint done: activeCheckpointId=${deps.getActiveCheckpointId()}, shapes=${shapes.length}, assets=${assets.length}`
				)
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

	// --- upload_image (app-only, conditional) ---

	if (opts?.uploadImageHandler) {
		const handler = opts.uploadImageHandler
		server.registerTool(
			'upload_image',
			{
				title: 'Upload Image',
				description: 'App-only: upload a base64-encoded image to storage.',
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

					const result = await handler({ filename, base64, contentType })

					return {
						content: [{ type: 'text', text: `Uploaded image: ${result.imageUrl}` }],
						structuredContent: {
							imageUrl: result.imageUrl,
							key: result.key,
							contentType: result.contentType,
						},
					}
				} catch (err) {
					return errorResponse(err)
				}
			}
		)
	}

	// --- canvas resource ---

	registerAppResource(
		server,
		CANVAS_RESOURCE_URI,
		CANVAS_RESOURCE_URI,
		{ mimeType: RESOURCE_MIME_TYPE },
		async (): Promise<ReadResourceResult> => {
			const html = await deps.loadWidgetHtml()

			// Resolve domain from client identity (only when serving over HTTP with configured domains)
			let domain: string | undefined
			if (opts?.httpDomain?.openai || opts?.httpDomain?.claude) {
				const clientName = server.server.getClientVersion()?.name ?? ''
				if (clientName === 'openai-mcp') {
					domain = opts.httpDomain.openai
				} else if (
					clientName === 'claude-ai' ||
					clientName === 'Anthropic' ||
					clientName === 'Anthropic/ClaudeAI'
				) {
					domain = opts.httpDomain.claude
				}
				log(`[tldraw-mcp] Serving resource to "${clientName}" with domain: ${domain}`)
			}

			return {
				contents: [
					{
						uri: CANVAS_RESOURCE_URI,
						mimeType: RESOURCE_MIME_TYPE,
						text: html,
						_meta: {
							ui: {
								csp: {
									resourceDomains: [
										'https://cdn.tldraw.com',
										'https://fonts.googleapis.com',
										'https://fonts.gstatic.com',
										...(opts?.extraResourceDomains ?? []),
									],
									connectDomains: ['https://cdn.tldraw.com', ...(opts?.extraConnectDomains ?? [])],
								},
								...(domain ? { domain } : {}),
							},
						},
					},
				],
			}
		}
	)
}
