import {
	registerAppResource,
	registerAppTool,
	RESOURCE_MIME_TYPE,
} from '@modelcontextprotocol/ext-apps/server'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult, ReadResourceResult } from '@modelcontextprotocol/sdk/types.js'
import { randomUUID } from 'node:crypto'
import { structuredClone, type TLShape } from 'tldraw'
import { z } from 'zod'
import {
	convertFocusedShapeToTldrawRecord,
	convertTldrawRecordToFocusedShape,
	type FocusedShape,
} from './src/focused-shape'
import {
	parseBooleanFlag,
	parseFocusedShapesInput,
	parseFocusedShapeUpdatesInput,
	parseJsonArray,
	parseShapeIdsInput,
} from './src/parse-json'
import { loadCachedCanvasWidgetHtml } from './src/tools/loadCachedCanvasWidgetHtml'
import { READ_ME_CONTENT } from './src/tools/read-me'

export const server = new McpServer({
	name: 'tldraw',
	version: '1.0.0',
})

const CANVAS_RESOURCE_URI = 'ui://show-canvas/mcp-app.html'

// --- Checkpoint store ---

const MAX_CHECKPOINTS = 200
const checkpoints = new Map<string, TLShape[]>()
let activeCheckpointId: string | null = null
console.error(`[tldraw-mcp] Server module loaded — fresh state, activeCheckpointId=null`)

function generateCheckpointId(): string {
	return randomUUID().replace(/-/g, '').slice(0, 18)
}

function saveCheckpoint(id: string, shapes: TLShape[]): void {
	console.error(
		`[tldraw-mcp] saveCheckpoint: id=${id}, shapes=${shapes.length}, existing checkpoints=${checkpoints.size}`
	)
	checkpoints.set(id, shapes)
	if (checkpoints.size > MAX_CHECKPOINTS) {
		const oldest = checkpoints.keys().next().value
		if (oldest) checkpoints.delete(oldest)
	}
}

function getActiveShapes(): TLShape[] {
	if (!activeCheckpointId) {
		// Fallback: if the server restarted and a widget already pushed a checkpoint,
		// use the most recently saved one.
		if (checkpoints.size > 0) {
			const lastKey = [...checkpoints.keys()].at(-1)!
			const shapes = checkpoints.get(lastKey) ?? []
			console.error(
				`[tldraw-mcp] getActiveShapes: activeCheckpointId was NULL, fell back to last checkpoint=${lastKey}, shapes=${shapes.length}`
			)
			activeCheckpointId = lastKey
			return shapes
		}
		console.error(
			`[tldraw-mcp] getActiveShapes: activeCheckpointId is NULL and no checkpoints, returning []`
		)
		return []
	}
	const shapes = checkpoints.get(activeCheckpointId) ?? []
	console.error(
		`[tldraw-mcp] getActiveShapes: activeCheckpointId=${activeCheckpointId}, shapes=${shapes.length}, checkpoints.size=${checkpoints.size}`
	)
	return shapes
}

// --- Helpers ---

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
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

function parseTlShapes(value: unknown[]): TLShape[] {
	return value.filter(
		(s): s is TLShape => isPlainObject(s) && typeof s.id === 'string' && typeof s.type === 'string'
	)
}

function errorResponse(err: unknown, summary?: string): CallToolResult {
	const message = err instanceof Error ? err.message : String(err)
	return {
		content: [{ type: 'text', text: `Error: ${message}\n${summary ?? ''}` }],
		isError: true,
	}
}

// --- read_me ---

server.registerTool(
	'read_me',
	{
		description: 'Get the tldraw shape format reference. Call this FIRST before creating diagrams.',
		annotations: {
			readOnlyHint: true,
		},
	},
	async (): Promise<CallToolResult> => ({
		content: [{ type: 'text', text: READ_ME_CONTENT }],
	})
)

// --- create_shapes ---

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
			console.error(
				`[tldraw-mcp] create_shapes called: new_blank_canvas=${new_blank_canvas}, activeCheckpointId=${activeCheckpointId}, checkpoints.size=${checkpoints.size}`
			)
			const newBlankCanvas = parseBooleanFlag(new_blank_canvas, false)
			const focusedShapes = parseFocusedShapesInput(shapesJson)
			const newRecords = focusedShapes.map((s: FocusedShape) =>
				convertFocusedShapeToTldrawRecord(s)
			)

			// Merge with active checkpoint (or start fresh)
			const hadActiveCheckpoint = activeCheckpointId !== null
			const baseShapes = newBlankCanvas ? [] : getActiveShapes()
			console.error(
				`[tldraw-mcp] create_shapes: baseShapes=${baseShapes.length}, newRecords=${newRecords.length}, newBlankCanvas=${newBlankCanvas}, hadActiveCheckpoint=${hadActiveCheckpoint}`
			)
			const mergedById = new Map<string, TLShape>()
			for (const s of baseShapes) mergedById.set(s.id, structuredClone(s))
			for (const s of newRecords) mergedById.set(s.id, structuredClone(s))
			const resultShapes = [...mergedById.values()]

			// Persist checkpoint
			const checkpointId = generateCheckpointId()
			saveCheckpoint(checkpointId, resultShapes)
			activeCheckpointId = checkpointId

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

const updateShapesInputSchema = z.object({
	updatesJson: z
		.string()
		.describe('JSON array string of shape updates. Must be a valid JSON array string.'),
})

type UpdateShapesInput = z.infer<typeof updateShapesInputSchema>

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
			const baseShapes = getActiveShapes()
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

			// Persist checkpoint
			const checkpointId = generateCheckpointId()
			saveCheckpoint(checkpointId, resultShapes)
			activeCheckpointId = checkpointId

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

const deleteShapesInputSchema = z.object({
	shapeIdsJson: z
		.string()
		.describe(
			'JSON array string of shape ids to delete. Must be a valid JSON array string of shape ids.'
		),
})

type DeleteShapesInput = z.infer<typeof deleteShapesInputSchema>

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
			const baseShapes = getActiveShapes()
			const idsToDelete = new Set(shapeIds.map((id) => normalizeShapeId(id)))
			const resultShapes = baseShapes.filter((s) => !idsToDelete.has(s.id))
			const deletedCount = baseShapes.length - resultShapes.length

			// Persist checkpoint
			const checkpointId = generateCheckpointId()
			saveCheckpoint(checkpointId, resultShapes)
			activeCheckpointId = checkpointId

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

server.registerTool(
	'read_checkpoint',
	{
		title: 'Read Checkpoint',
		description: 'App-only: read shapes from a checkpoint by ID.',
		inputSchema: z.object({ checkpointId: z.string().min(1) }),
		_meta: { ui: { visibility: ['app'] } },
	},
	async ({ checkpointId }: { checkpointId: string }): Promise<CallToolResult> => {
		const shapes = checkpoints.get(checkpointId)
		return {
			content: [{ type: 'text', text: shapes ? `${shapes.length} shape(s).` : 'Not found.' }],
			structuredContent: { shapes: shapes ?? [] },
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
				`[tldraw-mcp] save_checkpoint called: checkpointId=${checkpointId}, prev activeCheckpointId=${activeCheckpointId}`
			)
			const raw = parseJsonArray(shapesJson, 'shapesJson')
			const shapes = parseTlShapes(raw)
			saveCheckpoint(checkpointId, shapes)
			// Also update activeCheckpointId so the next tool call reads the latest user-edited state
			activeCheckpointId = checkpointId
			console.error(
				`[tldraw-mcp] save_checkpoint done: activeCheckpointId=${activeCheckpointId}, shapes=${shapes.length}`
			)
			return {
				content: [{ type: 'text', text: `Saved ${shapes.length} shape(s).` }],
			}
		} catch (err) {
			return errorResponse(err)
		}
	}
)

// --- canvas resource ---

registerAppResource(
	server,
	CANVAS_RESOURCE_URI,
	CANVAS_RESOURCE_URI,
	{ mimeType: RESOURCE_MIME_TYPE },
	async (): Promise<ReadResourceResult> => {
		const html = await loadCachedCanvasWidgetHtml()
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
								],
								connectDomains: ['https://cdn.tldraw.com'],
							},
						},
					},
				},
			],
		}
	}
)
