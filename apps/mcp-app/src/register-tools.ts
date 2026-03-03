import {
	registerAppResource,
	registerAppTool,
	RESOURCE_MIME_TYPE,
} from '@modelcontextprotocol/ext-apps/server'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult, ReadResourceResult } from '@modelcontextprotocol/sdk/types.js'
import type { TLShape } from 'tldraw'
import { structuredClone, uniqueId } from 'tldraw'
import { z } from 'zod'
import {
	convertFocusedShapeToTldrawRecord,
	convertTldrawRecordToFocusedShape,
} from './focused-shape-converters'
import type { FocusedShape } from './focused-shape-schema'
import {
	parseBooleanFlag,
	parseFocusedShapesInput,
	parseFocusedShapeUpdatesInput,
	parseJsonArray,
	parseShapeIdsInput,
} from './parse-json'
import {
	type CreateImageInput,
	type CreateShapesInput,
	type DeleteShapesInput,
	type UpdateShapesInput,
	createImageInputSchema,
	createShapesInputSchema,
	deleteShapesInputSchema,
	updateShapesInputSchema,
} from './shared/tool-schemas'
import type { RegisterToolsOptions, ServerDeps } from './shared/types'
import { ALLOWED_IMAGE_TYPES, CANVAS_RESOURCE_URI } from './shared/types'
import {
	deepMerge,
	errorResponse,
	generateCheckpointId,
	normalizeShapeId,
	parseTlShapes,
	toSimpleShapeId,
} from './shared/utils'
import { READ_ME_CONTENT } from './tools/read-me'

/**
 * Shared tool/resource registration logic for both Node.js and Cloudflare Workers entry points.
 *
 * Both `server.ts` (Node) and `src/cloudflare-worker.ts` (Workers) call `registerTools()`
 * with platform-specific storage backends.
 */

// --- Registration ---

export function registerTools(
	server: McpServer,
	deps: ServerDeps,
	opts?: RegisterToolsOptions
): void {
	const log = opts?.log ?? ((...args: unknown[]) => console.error(...args))
	const getBindingFromId = (binding: unknown): TLShape['id'] | null => {
		if (!binding || typeof binding !== 'object') return null
		const maybeFromId = (binding as { fromId?: unknown }).fromId
		return typeof maybeFromId === 'string' ? (maybeFromId as TLShape['id']) : null
	}

	// --- read_me ---

	server.registerTool(
		'read_me',
		{
			description:
				'Get the tldraw shape format reference. Call this FIRST before creating diagrams or drawing.',
			annotations: {
				readOnlyHint: true,
				idempotentHint: true,
				openWorldHint: false,
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
			description: 'Creates shapes, drawings, and diagrams on the tldraw canvas.',
			inputSchema: createShapesInputSchema,
			annotations: {
				destructiveHint: true,
				idempotentHint: false,
				openWorldHint: false,
			},
			_meta: { ui: { resourceUri: CANVAS_RESOURCE_URI } },
		},
		async ({ shapesJson, new_blank_canvas }: CreateShapesInput): Promise<CallToolResult> => {
			try {
				log(
					`[tldraw-mcp] create_shapes called: new_blank_canvas=${new_blank_canvas}, activeCheckpointId=${deps.getActiveCheckpointId()}`
				)
				const newBlankCanvas = parseBooleanFlag(new_blank_canvas, false)
				const focusedShapes = parseFocusedShapesInput(shapesJson)
				const results = focusedShapes.map((s: FocusedShape) => convertFocusedShapeToTldrawRecord(s))
				const newRecords = results.map((r) => r.shape)
				const newBindings = results.flatMap((r) => r.bindings)

				const hadActiveCheckpoint = deps.getActiveCheckpointId() !== null
				const baseShapes = newBlankCanvas ? [] : deps.getActiveShapes()
				log(
					`[tldraw-mcp] create_shapes: baseShapes=${baseShapes.length}, newRecords=${newRecords.length}, newBlankCanvas=${newBlankCanvas}, hadActiveCheckpoint=${hadActiveCheckpoint}`
				)
				const mergedById = new Map<string, TLShape>()
				for (const s of baseShapes) mergedById.set(s.id, structuredClone(s))
				for (const s of newRecords) mergedById.set(s.id, structuredClone(s))
				const resultShapes = [...mergedById.values()]
				const existingAssets = newBlankCanvas ? [] : deps.getActiveAssets()
				const existingBindings = newBlankCanvas ? [] : deps.getActiveBindings()
				const replacedShapeIds = new Set(newRecords.map((shape) => shape.id))
				const preservedBindings = existingBindings.filter((binding) => {
					const fromId = getBindingFromId(binding)
					return fromId === null || !replacedShapeIds.has(fromId)
				})
				const resultBindings = [...preservedBindings, ...newBindings]

				const checkpointId = generateCheckpointId()
				deps.saveCheckpoint(checkpointId, resultShapes, existingAssets, resultBindings)
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
						bindings: resultBindings,
					},
				}
			} catch (err) {
				return errorResponse(
					'create_shapes',
					err,
					'Ensure shapesJson is a valid JSON array string of shapes objects (call read_me first for the format reference). '
				)
			}
		}
	)

	// --- update_shapes ---

	registerAppTool(
		server,
		'update_shapes',
		{
			title: 'Update Shapes',
			description: 'Updates existing shapes, diagrams, and drawings on the tldraw canvas.',
			inputSchema: updateShapesInputSchema,
			annotations: {
				destructiveHint: true,
				idempotentHint: false,
				openWorldHint: false,
			},
			_meta: { ui: { resourceUri: CANVAS_RESOURCE_URI } },
		},
		async ({ updatesJson }: UpdateShapesInput): Promise<CallToolResult> => {
			try {
				log(`[tldraw-mcp] update_shapes called: activeCheckpointId=${deps.getActiveCheckpointId()}`)
				const updates = parseFocusedShapeUpdatesInput(updatesJson)
				const baseShapes = deps.getActiveShapes()
				log(
					`[tldraw-mcp] update_shapes: baseShapes=${baseShapes.length}, updates=${updates.length}`
				)

				if (baseShapes.length === 0) {
					return errorResponse(
						'update_shapes',
						new Error('No shapes on the canvas to update.'),
						'The canvas is empty. Use create_shapes first to add shapes, then update them.'
					)
				}

				const shapesById = new Map(baseShapes.map((s) => [s.id, structuredClone(s)]))
				const updated: string[] = []
				const notFound: string[] = []
				const failed: string[] = []
				const newBindings: unknown[] = []

				for (const update of updates) {
					const id = normalizeShapeId(update.shapeId) as TLShape['id']
					const existing = shapesById.get(id)
					if (!existing) {
						notFound.push(toSimpleShapeId(id))
						continue
					}

					try {
						const existingFocused = convertTldrawRecordToFocusedShape(existing)
						const merged = deepMerge(existingFocused, {
							...update,
							shapeId: toSimpleShapeId(id),
							_type: update._type ?? existingFocused._type,
						}) as FocusedShape
						const result = convertFocusedShapeToTldrawRecord(merged)
						result.shape.index = existing.index
						shapesById.set(id, result.shape)
						newBindings.push(...result.bindings)
						updated.push(toSimpleShapeId(id))
					} catch {
						failed.push(toSimpleShapeId(id))
					}
				}

				const resultShapes = [...shapesById.values()]
				const existingAssets = deps.getActiveAssets()
				const existingBindings = deps.getActiveBindings()
				const replacedShapeIds = new Set(
					updated.map((shapeId) => normalizeShapeId(shapeId) as TLShape['id'])
				)
				const preservedBindings = existingBindings.filter((binding) => {
					const fromId = getBindingFromId(binding)
					return fromId === null || !replacedShapeIds.has(fromId)
				})
				const resultBindings = [...preservedBindings, ...newBindings]

				const checkpointId = generateCheckpointId()
				deps.saveCheckpoint(checkpointId, resultShapes, existingAssets, resultBindings)
				deps.setActiveCheckpointId(checkpointId)

				const lines = [`Updated ${updated.length} of ${updates.length} shape(s).`]
				if (notFound.length > 0) {
					const available = baseShapes.map((s) => toSimpleShapeId(s.id))
					lines.push(
						`Skipped ${notFound.length} not found: ${notFound.join(', ')}. ` +
							`Available shape IDs: ${available.join(', ')}`
					)
				}
				if (failed.length > 0) {
					lines.push(`Skipped ${failed.length} due to invalid update data: ${failed.join(', ')}`)
				}

				return {
					content: [
						{
							type: 'text',
							text: lines.join('\n'),
						},
					],
					structuredContent: {
						checkpointId,
						action: 'update' as const,
						updates,
						tldrawRecords: resultShapes,
						bindings: resultBindings,
					},
				}
			} catch (err) {
				return errorResponse(
					'update_shapes',
					err,
					'Ensure updatesJson is a valid JSON array of update objects, each with a shapeId field matching an existing shape on the canvas.'
				)
			}
		}
	)

	// --- delete_shapes ---

	registerAppTool(
		server,
		'delete_shapes',
		{
			title: 'Delete Shapes',
			description: 'Deletes shapes by id from a JSON string (string[]).',
			inputSchema: deleteShapesInputSchema,
			annotations: {
				destructiveHint: true,
				idempotentHint: false,
				openWorldHint: false,
			},
			_meta: { ui: { resourceUri: CANVAS_RESOURCE_URI } },
		},
		async ({ shapeIdsJson }: DeleteShapesInput): Promise<CallToolResult> => {
			try {
				log(`[tldraw-mcp] delete_shapes called: activeCheckpointId=${deps.getActiveCheckpointId()}`)
				const shapeIds = parseShapeIdsInput(shapeIdsJson)
				const baseShapes = deps.getActiveShapes()
				log(
					`[tldraw-mcp] delete_shapes: baseShapes=${baseShapes.length}, shapeIds=${shapeIds.length}`
				)
				const idsToDelete = new Set(shapeIds.map((id) => normalizeShapeId(id)))
				const resultShapes = baseShapes.filter((s) => !idsToDelete.has(s.id))
				const deletedCount = baseShapes.length - resultShapes.length
				const existingAssets = deps.getActiveAssets()
				// Filter out bindings that reference deleted shapes
				const existingBindings = deps.getActiveBindings()
				const resultBindings = existingBindings.filter((b: any) => {
					return !idsToDelete.has(b.fromId) && !idsToDelete.has(b.toId)
				})

				const checkpointId = generateCheckpointId()
				deps.saveCheckpoint(checkpointId, resultShapes, existingAssets, resultBindings)
				deps.setActiveCheckpointId(checkpointId)

				const lines = [`Deleted ${deletedCount} of ${shapeIds.length} shape(s).`]
				const notFoundCount = shapeIds.length - deletedCount
				if (notFoundCount > 0) {
					const notFoundIds = shapeIds.filter(
						(id) => !baseShapes.some((s) => s.id === normalizeShapeId(id))
					)
					const available = baseShapes.map((s) => toSimpleShapeId(s.id))
					lines.push(
						`${notFoundCount} ID(s) not found on canvas: ${notFoundIds.join(', ')}. ` +
							`Available shape IDs: ${available.join(', ')}`
					)
				}

				return {
					content: [
						{
							type: 'text',
							text: lines.join('\n'),
						},
					],
					structuredContent: {
						checkpointId,
						action: 'delete' as const,
						shapeIds,
						tldrawRecords: resultShapes,
						bindings: resultBindings,
					},
				}
			} catch (err) {
				return errorResponse(
					'delete_shapes',
					err,
					'Ensure shapeIdsJson is a valid JSON array of shape ID strings, e.g. \'["box1", "arrow1"]\'.'
				)
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
			annotations: {
				destructiveHint: false,
				idempotentHint: false,
				openWorldHint: false,
			},
			_meta: { ui: { resourceUri: CANVAS_RESOURCE_URI } },
		},
		async ({ url, x, y, w, h }: CreateImageInput): Promise<CallToolResult> => {
			try {
				const shapeId = `shape:${uniqueId()}`
				const assetId = `asset:${uniqueId()}`

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
				return errorResponse(
					'create_image',
					err,
					'Provide a publicly accessible image URL and numeric x, y, w, h values for position and size.'
				)
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
			annotations: {
				readOnlyHint: true,
				idempotentHint: true,
				openWorldHint: false,
			},
			_meta: { ui: { visibility: ['app'] } },
		},
		async ({ checkpointId }: { checkpointId: string }): Promise<CallToolResult> => {
			const checkpoint = deps.loadCheckpoint(checkpointId)
			if (!checkpoint) {
				return {
					content: [{ type: 'text', text: 'Not found.' }],
					structuredContent: { shapes: [], assets: [], bindings: [], focusedShapes: [] },
				}
			}

			const shapes = parseTlShapes(checkpoint.shapes)
			const assets = checkpoint.assets
			const bindings = checkpoint.bindings
			const arrowConnections = new Map<string, { fromId: string | null; toId: string | null }>()
			for (const binding of bindings) {
				if (!binding || typeof binding !== 'object') continue
				const maybeFromId = (binding as { fromId?: unknown }).fromId
				const maybeToId = (binding as { toId?: unknown }).toId
				const terminal = (binding as { props?: { terminal?: unknown } }).props?.terminal
				if (
					typeof maybeFromId !== 'string' ||
					typeof maybeToId !== 'string' ||
					(terminal !== 'start' && terminal !== 'end')
				) {
					continue
				}

				const simpleArrowId = toSimpleShapeId(maybeFromId as TLShape['id'])
				const simpleTargetId = toSimpleShapeId(maybeToId as TLShape['id'])
				const existing = arrowConnections.get(simpleArrowId) ?? { fromId: null, toId: null }
				if (terminal === 'start') existing.fromId = simpleTargetId
				if (terminal === 'end') existing.toId = simpleTargetId
				arrowConnections.set(simpleArrowId, existing)
			}
			const focusedShapes = shapes
				.map((s) => {
					try {
						const focused = convertTldrawRecordToFocusedShape(s)
						if (focused._type === 'arrow') {
							const connected = arrowConnections.get(focused.shapeId)
							if (connected) {
								focused.fromId = connected.fromId
								focused.toId = connected.toId
							}
						}
						return focused
					} catch {
						return null
					}
				})
				.filter(Boolean)

			return {
				content: [{ type: 'text', text: `${shapes.length} shape(s), ${assets.length} asset(s).` }],
				structuredContent: { shapes, assets, bindings, focusedShapes },
			}
		}
	)

	// --- save_checkpoint (app-only) ---

	server.registerTool(
		'save_checkpoint',
		{
			title: 'Save Checkpoint',
			description:
				'App-only: save shapes to a checkpoint (from user edits). shapesJson and assetsJson must be JSON array strings.',
			inputSchema: z.object({
				checkpointId: z.string().min(1),
				shapesJson: z.string(),
				assetsJson: z.string().optional(),
				bindingsJson: z.string().optional(),
			}),
			annotations: {
				destructiveHint: true,
				idempotentHint: false,
				openWorldHint: false,
			},
			_meta: { ui: { visibility: ['app'] } },
		},
		async ({
			checkpointId,
			shapesJson,
			assetsJson,
			bindingsJson,
		}: {
			checkpointId: string
			shapesJson: string
			assetsJson?: string
			bindingsJson?: string
		}): Promise<CallToolResult> => {
			try {
				log(
					`[tldraw-mcp] save_checkpoint called: checkpointId=${checkpointId}, prev activeCheckpointId=${deps.getActiveCheckpointId()}`
				)
				const raw = parseJsonArray(shapesJson, 'shapesJson')
				const shapes = parseTlShapes(raw)
				const assets = assetsJson ? parseJsonArray(assetsJson, 'assetsJson') : []
				const bindings = bindingsJson ? parseJsonArray(bindingsJson, 'bindingsJson') : []
				deps.saveCheckpoint(checkpointId, shapes, assets, bindings)
				deps.setActiveCheckpointId(checkpointId)
				log(
					`[tldraw-mcp] save_checkpoint done: activeCheckpointId=${deps.getActiveCheckpointId()}, shapes=${shapes.length}, assets=${assets.length}`
				)
				return {
					content: [
						{ type: 'text', text: `Saved ${shapes.length} shape(s), ${assets.length} asset(s).` },
					],
					structuredContent: {
						checkpointId,
						shapesCount: shapes.length,
						assetsCount: assets.length,
					},
				}
			} catch (err) {
				return errorResponse('save_checkpoint', err)
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
					clerkToken: z.string().optional(),
				}),
				annotations: {
					destructiveHint: false,
					idempotentHint: false,
					openWorldHint: false,
				},
				_meta: { ui: { visibility: ['app'] } },
			},
			async ({
				filename,
				base64,
				contentType,
				clerkToken,
			}: {
				filename: string
				base64: string
				contentType: string
				clerkToken?: string
			}): Promise<CallToolResult> => {
				try {
					const ext = ALLOWED_IMAGE_TYPES[contentType]
					if (!ext) {
						return errorResponse(
							'upload_image',
							new Error(`Unsupported content type: ${contentType}.`),
							`Allowed types: ${Object.keys(ALLOWED_IMAGE_TYPES).join(', ')}`
						)
					}

					const result = await handler({ filename, base64, contentType, clerkToken })

					return {
						content: [{ type: 'text', text: `Uploaded image: ${result.imageUrl}` }],
						structuredContent: {
							imageUrl: result.imageUrl,
							key: result.key,
							contentType: result.contentType,
						},
					}
				} catch (err) {
					return errorResponse(
						'upload_image',
						err,
						'Ensure base64 is a valid base64-encoded image string and contentType is a supported MIME type.'
					)
				}
			}
		)
	}

	// --- canvas resource ---

	registerAppResource(
		server,
		'tldraw-canvas',
		CANVAS_RESOURCE_URI,
		{
			title: 'tldraw Canvas',
			description: 'Interactive tldraw canvas UI used by create, update, and delete shape tools.',
			mimeType: RESOURCE_MIME_TYPE,
		},
		async (): Promise<ReadResourceResult> => {
			let html = await deps.loadWidgetHtml()

			// Embed the active checkpoint in the HTML so the widget can bootstrap
			// without localStorage. This handles hosts that isolate iframe origins
			// between tool calls (e.g. Cursor).
			const activeId = deps.getActiveCheckpointId()
			if (activeId) {
				const checkpoint = deps.loadCheckpoint(activeId)
				if (checkpoint) {
					const bootstrap = JSON.stringify({
						checkpointId: activeId,
						shapes: parseTlShapes(checkpoint.shapes),
						assets: checkpoint.assets,
						bindings: checkpoint.bindings,
					}).replace(/</g, '\\u003c')
					html = html.replace(
						'</head>',
						`<script>window.__TLDRAW_BOOTSTRAP__=${bootstrap}</script></head>`
					)
				}
			}

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
										'https://equipped-amoeba-75.clerk.accounts.dev',
										'https://img.clerk.com',
										...(opts?.extraResourceDomains ?? []),
										'blob:',
									],
									connectDomains: [
										'https://cdn.tldraw.com',
										'https://equipped-amoeba-75.clerk.accounts.dev',
										...(opts?.extraConnectDomains ?? []),
									],
								},
								permissions: { clipboardWrite: {} },
								...(domain ? { domain } : {}),
							},
						},
					},
				],
			}
		}
	)
}
