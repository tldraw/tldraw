import {
	registerAppResource,
	registerAppTool,
	RESOURCE_MIME_TYPE,
} from '@modelcontextprotocol/ext-apps/server'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult, ReadResourceResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import {
	createCanvasShapes,
	deleteCanvasShapes,
	getCanvasSnapshot,
	prepareCanvasForView,
	replaceCanvasSnapshot,
	updateCanvasShapes,
} from './src/canvas-state.js'
import {
	FocusedShapeSchema,
	FocusedShapeUpdateSchema,
	type FocusedShape,
	type FocusedShapeUpdate,
} from './src/focused-shape.js'
import { loadCachedCanvasWidgetHtml } from './src/tools/create-view'
import { READ_ME_CONTENT } from './src/tools/read-me.js'

export const server = new McpServer({
	name: 'tldraw',
	version: '1.0.0',
})

/** When a user asks for anything to be added to an existing canvas, make sure to always call new_canvas first to copy that canvas.*/

const CANVAS_RESOURCE_URI = 'ui://show-canvas/mcp-app.html'
const createShapesInputSchema = z.object({
	shapes: z.union([z.string(), z.array(z.unknown())]),
})
const streamShapesInputSchema = z.object({
	shapesJson: z
		.string()
		.describe('JSON array string of FocusedShape[] for progressive partial-input streaming.'),
})
const updateShapesInputSchema = z.object({
	updates: z.union([z.string(), z.array(z.unknown())]),
})
const deleteShapesInputSchema = z.object({
	shapeIds: z.union([z.string(), z.array(z.string())]),
})
const getCanvasStateInputSchema = z.object({})
const syncCanvasInputSchema = z.object({
	shapesJson: z.string().describe('JSON array of full tldraw shape records'),
	canvasId: z.string().min(1),
})

type CreateShapesInput = z.infer<typeof createShapesInputSchema>
type StreamShapesInput = z.infer<typeof streamShapesInputSchema>
type UpdateShapesInput = z.infer<typeof updateShapesInputSchema>
type DeleteShapesInput = z.infer<typeof deleteShapesInputSchema>
type SyncCanvasInput = z.infer<typeof syncCanvasInputSchema>

function snapshotResponse(summary: string, snapshot = getCanvasSnapshot()): CallToolResult {
	return {
		content: [
			{ type: 'text', text: summary },
			{ type: 'text', text: JSON.stringify(snapshot, null, 2) },
		],
		structuredContent: snapshot,
	}
}

function errorResponse(err: unknown): CallToolResult {
	const message = err instanceof Error ? err.message : String(err)
	return {
		content: [{ type: 'text', text: `Error: ${message}` }],
		isError: true,
	}
}

function parseJsonArray(json: string, fieldName: string): unknown[] {
	const parsed = JSON.parse(json)
	if (!Array.isArray(parsed)) throw new Error(`${fieldName} must be a JSON array`)
	return parsed
}

function parseFocusedShapesInput(value: CreateShapesInput['shapes']): FocusedShape[] {
	const parsed = Array.isArray(value) ? value : parseJsonArray(value, 'shapes')
	const normalized: FocusedShape[] = []
	for (const input of parsed) {
		const result = FocusedShapeSchema.safeParse(input)
		if (!result.success) {
			throw new Error(result.error.issues[0]?.message ?? 'Invalid shape in shapes')
		}
		normalized.push(result.data)
	}
	return normalized
}

function parseFocusedShapeUpdatesInput(value: UpdateShapesInput['updates']): FocusedShapeUpdate[] {
	const parsed = Array.isArray(value) ? value : parseJsonArray(value, 'updates')
	const normalized: FocusedShapeUpdate[] = []
	for (const input of parsed) {
		const result = FocusedShapeUpdateSchema.safeParse(input)
		if (!result.success) {
			throw new Error(result.error.issues[0]?.message ?? 'Invalid shape update in updates')
		}
		normalized.push(result.data)
	}
	return normalized
}

function parseShapeIdsInput(value: DeleteShapesInput['shapeIds']): string[] {
	if (Array.isArray(value)) return value
	const parsed = parseJsonArray(value, 'shapeIds')
	return parsed.filter((id): id is string => typeof id === 'string')
}

server.registerTool(
	'read_me',
	{
		description: 'Get the tldraw shape format reference. Call this FIRST before creating diagrams.',
	},
	async (): Promise<CallToolResult> => ({
		content: [{ type: 'text', text: READ_ME_CONTENT }],
	})
)

registerAppTool(
	server,
	'new_canvas',
	{
		title: 'New Canvas',
		description:
			'Creates a new interactive tldraw canvas for drawing and diagramming. If there is already a canvas open, it will create a copy of that canvas.',
		inputSchema: {},
		_meta: { ui: { resourceUri: CANVAS_RESOURCE_URI } },
	},
	async (): Promise<CallToolResult> => {
		const snapshot = prepareCanvasForView()
		return snapshotResponse('tldraw canvas is ready.', snapshot)
	}
)

registerAppTool(
	server,
	'stream_shapes',
	{
		title: 'Stream Shapes',
		description:
			'Creates shapes from a JSON string (FocusedShape[]). Designed for partial-input streaming previews in the canvas app.',
		inputSchema: streamShapesInputSchema,
		_meta: { ui: { resourceUri: CANVAS_RESOURCE_URI } },
	},
	async ({ shapesJson }: StreamShapesInput): Promise<CallToolResult> => {
		try {
			const parsedShapes = parseFocusedShapesInput(shapesJson)
			const { snapshot, created } = createCanvasShapes(parsedShapes)
			return snapshotResponse(
				`Stream-applied ${created.length} shape(s) on the active canvas.`,
				snapshot
			)
		} catch (err) {
			return errorResponse(err)
		}
	}
)

server.registerTool(
	'get_canvas_state',
	{
		title: 'Get Canvas State',
		description: 'Returns the latest canvas snapshot and version.',
		inputSchema: getCanvasStateInputSchema,
	},
	async (): Promise<CallToolResult> => {
		try {
			return snapshotResponse('Canvas snapshot retrieved.', getCanvasSnapshot())
		} catch (err) {
			return errorResponse(err)
		}
	}
)

server.registerTool(
	'sync_canvas_state',
	{
		title: 'Sync Canvas State',
		description: 'App-only: replace server canvas with latest editor snapshot.',
		inputSchema: syncCanvasInputSchema,
		_meta: { ui: { visibility: ['app'] } },
	},
	async ({ shapesJson, canvasId }: SyncCanvasInput): Promise<CallToolResult> => {
		try {
			const shapes = parseJsonArray(shapesJson, 'shapesJson')
			const snapshot = replaceCanvasSnapshot(shapes, canvasId)
			return snapshotResponse(`Canvas synced from app (${shapes.length} shape(s)).`, snapshot)
		} catch (err) {
			return errorResponse(err)
		}
	}
)

server.registerTool(
	'create_shapes',
	{
		title: 'Create Shapes',
		description: 'Create one or more shapes using the FocusedShape schema.',
		inputSchema: createShapesInputSchema,
	},
	async ({ shapes }: CreateShapesInput): Promise<CallToolResult> => {
		try {
			const parsedShapes = parseFocusedShapesInput(shapes)
			const { snapshot, created } = createCanvasShapes(parsedShapes)
			return snapshotResponse(
				`Created ${created.length} shape(s) on a new derived canvas.`,
				snapshot
			)
		} catch (err) {
			return errorResponse(err)
		}
	}
)

server.registerTool(
	'update_shapes',
	{
		title: 'Update Shapes',
		description:
			'Update existing shapes by id using FocusedShape partials. Changes are deep-merged then validated.',
		inputSchema: updateShapesInputSchema,
	},
	async ({ updates }: UpdateShapesInput): Promise<CallToolResult> => {
		try {
			const parsedUpdates = parseFocusedShapeUpdatesInput(updates)
			const { snapshot, updated } = updateCanvasShapes(parsedUpdates)
			return snapshotResponse(
				`Updated ${updated.length} shape(s) on a new derived canvas.`,
				snapshot
			)
		} catch (err) {
			return errorResponse(err)
		}
	}
)

server.registerTool(
	'delete_shapes',
	{
		title: 'Delete Shapes',
		description: 'Delete shapes by id.',
		inputSchema: deleteShapesInputSchema,
	},
	async ({ shapeIds }: DeleteShapesInput): Promise<CallToolResult> => {
		try {
			const parsedShapeIds = parseShapeIdsInput(shapeIds)
			const { snapshot, deleted } = deleteCanvasShapes(parsedShapeIds)
			return snapshotResponse(
				`Deleted ${deleted.length} shape(s) on a new derived canvas.`,
				snapshot
			)
		} catch (err) {
			return errorResponse(err)
		}
	}
)

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
							// todo is cdn.tldraw necessary to include here or was it halucinated?
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
