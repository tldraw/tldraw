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
	convertFocusedShapesToTldrawRecords,
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
	type CreateShapesInput,
	type DeleteShapesInput,
	type UpdateShapesInput,
	createShapesInputSchema,
	deleteShapesInputSchema,
	updateShapesInputSchema,
} from './shared/tool-schemas'
import type { RegisterToolsOptions, ServerDeps } from './shared/types'
import { CANVAS_RESOURCE_URI } from './shared/types'
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
 * Both `server.ts` (Node) and `src/worker.ts` (Workers) call `registerTools()`
 * with platform-specific storage backends.
 */

// --- Helpers ---

function injectBootstrapData(html: string, bootstrap: Record<string, unknown>): string {
	const toBase64 =
		typeof Buffer !== 'undefined' ? (s: string) => Buffer.from(s).toString('base64') : btoa
	const encoded = toBase64(JSON.stringify(bootstrap))
	const bootstrapScript = `<script>window.__TLDRAW_BOOTSTRAP__=JSON.parse(atob("${encoded}"))</script>`
	// Replace the LAST </head> — the inlined JS bundle may contain </head> as a string literal
	const lastIdx = html.lastIndexOf('</head>')
	if (lastIdx === -1) return html
	return html.slice(0, lastIdx) + bootstrapScript + html.slice(lastIdx)
}

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

	const analytics = opts?.analytics

	// --- read_me ---

	server.registerTool(
		'diagram_drawing_read_me',
		{
			description:
				'Use whenever you want to create a diagram or drawing. Gets the tldraw shape format reference. Call this FIRST before creating diagrams or drawing.',
			annotations: {
				readOnlyHint: true,
				idempotentHint: true,
				openWorldHint: false,
				destructiveHint: false,
			},
		},
		async (): Promise<CallToolResult> => {
			analytics?.writeDataPoint({
				blobs: ['tool_called', 'read_me'],
			})
			return {
				content: [{ type: 'text', text: READ_ME_CONTENT }],
			}
		}
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
				readOnlyHint: false,
				destructiveHint: false,
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
				analytics?.writeDataPoint({
					blobs: ['tool_called', 'create_shapes'],
				})
				const newBlankCanvas = parseBooleanFlag(new_blank_canvas, false)
				const focusedShapes = parseFocusedShapesInput(shapesJson)
				const { shapes: newRecords, bindings: newBindings } =
					convertFocusedShapesToTldrawRecords(focusedShapes)

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
						sessionId: deps.getSessionId(),
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
				readOnlyHint: false,
				destructiveHint: true,
				idempotentHint: false,
				openWorldHint: false,
			},
			_meta: { ui: { resourceUri: CANVAS_RESOURCE_URI } },
		},
		async ({ updatesJson }: UpdateShapesInput): Promise<CallToolResult> => {
			try {
				log(`[tldraw-mcp] update_shapes called: activeCheckpointId=${deps.getActiveCheckpointId()}`)
				analytics?.writeDataPoint({
					blobs: ['tool_called', 'update_shapes'],
				})
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
						result.shape.parentId = existing.parentId
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
						sessionId: deps.getSessionId(),
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
				readOnlyHint: false,
				destructiveHint: true,
				idempotentHint: false,
				openWorldHint: false,
			},
			_meta: { ui: { resourceUri: CANVAS_RESOURCE_URI } },
		},
		async ({ shapeIdsJson }: DeleteShapesInput): Promise<CallToolResult> => {
			try {
				log(`[tldraw-mcp] delete_shapes called: activeCheckpointId=${deps.getActiveCheckpointId()}`)
				analytics?.writeDataPoint({
					blobs: ['tool_called', 'delete_shapes'],
				})
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
						sessionId: deps.getSessionId(),
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

	// --- read_checkpoint (app-only) ---

	server.registerTool(
		'read_checkpoint',
		{
			title: 'Read Checkpoint',
			description: 'App-only: read shapes from a checkpoint by ID.',
			inputSchema: z.object({ checkpointId: z.string().min(1) }),
			annotations: {
				readOnlyHint: true,
				destructiveHint: false,
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
					structuredContent: {
						sessionId: deps.getSessionId(),
						shapes: [],
						assets: [],
						bindings: [],
						focusedShapes: [],
					},
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
				structuredContent: {
					sessionId: deps.getSessionId(),
					shapes,
					assets,
					bindings,
					focusedShapes,
				},
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
				readOnlyHint: false,
				destructiveHint: false,
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
						sessionId: deps.getSessionId(),
						shapesCount: shapes.length,
						assetsCount: assets.length,
					},
				}
			} catch (err) {
				return errorResponse('save_checkpoint', err)
			}
		}
	)

	// --- event (app-only) ---

	server.registerTool(
		'event',
		{
			inputSchema: z.object({
				event: z.string().min(1),
				value: z.number().optional(),
			}),
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: false,
				openWorldHint: true,
			},
			_meta: { ui: { visibility: ['app'] } },
		},
		async ({ event, value }: { event: string; value?: number }): Promise<CallToolResult> => {
			analytics?.writeDataPoint(
				typeof value === 'number'
					? {
							blobs: [event],
							doubles: [value],
						}
					: {
							blobs: [event],
						}
			)
			return {
				content: [{ type: 'text', text: 'Tracked widget event.' }],
			}
		}
	)

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
			analytics?.writeDataPoint({
				blobs: ['resource_called', 'tldraw-canvas'],
			})
			let html = await deps.loadWidgetHtml()

			// Embed bootstrap data (session ID + active checkpoint) so the widget
			// has shapes synchronously on mount — before any streaming begins.
			const activeId = deps.getActiveCheckpointId()
			const sid = deps.getSessionId()
			const hostName = opts?.getClientHostName()
			const bootstrap: Record<string, unknown> = { sessionId: sid, hostName }
			if (activeId) {
				const checkpoint = deps.loadCheckpoint(activeId)
				if (checkpoint) {
					bootstrap.checkpointId = activeId
					bootstrap.shapes = parseTlShapes(checkpoint.shapes)
					bootstrap.assets = checkpoint.assets
					bootstrap.bindings = checkpoint.bindings
				}
			}
			html = injectBootstrapData(html, bootstrap)

			// Resolve domain from client identity (only when serving over HTTP with configured domains)
			let domain: string | undefined
			if (opts?.httpDomain?.openai || opts?.httpDomain?.claude) {
				if (hostName === 'chatgpt') {
					domain = opts.httpDomain.openai
				} else if (hostName === 'claude') {
					domain = opts.httpDomain.claude
				}
				log(`[tldraw-mcp] Serving resource to "${hostName}" with domain: ${domain}`)
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
										'blob:',
									],
									connectDomains: ['https://cdn.tldraw.com', ...(opts?.extraConnectDomains ?? [])],
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
