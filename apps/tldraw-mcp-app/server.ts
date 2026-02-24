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
	getAllCanvasSnapshots,
	getCanvasSnapshot,
	replaceCanvasSnapshot,
	updateCanvasShapes,
} from './src/canvas-state.js'
import {
	parseBooleanFlag,
	parseFocusedShapesInput,
	parseFocusedShapeUpdatesInput,
	parseJsonArray,
	parseShapeIdsInput,
} from './src/parse-json.js'
import { loadCachedCanvasWidgetHtml } from './src/tools/loadCachedCanvasWidgetHtml.js'
import { READ_ME_CONTENT } from './src/tools/read-me.js'

export const server = new McpServer({
	name: 'tldraw',
	version: '1.0.0',
})

const CANVAS_RESOURCE_URI = 'ui://show-canvas/mcp-app.html'

function snapshotResponse(summary: string, snapshot = getCanvasSnapshot()): CallToolResult {
	return {
		content: [
			{ type: 'text', text: summary },
			{ type: 'text', text: JSON.stringify(snapshot.focusedShapes, null, 2) },
		],
		structuredContent: snapshot,
	}
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
			'Creates shapes from a JSON string (FocusedShape[]). Optional new_blank_canvas=true starts from a blank canvas instead of a derived canvas.',
		inputSchema: createShapesInputSchema,
		_meta: { ui: { resourceUri: CANVAS_RESOURCE_URI } },
	},
	async ({ shapesJson, new_blank_canvas }: CreateShapesInput): Promise<CallToolResult> => {
		try {
			const useNewBlankCanvas = parseBooleanFlag(new_blank_canvas, false)
			const parsedShapes = parseFocusedShapesInput(shapesJson)
			const { snapshot, created } = createCanvasShapes(parsedShapes, {
				newBlankCanvas: useNewBlankCanvas,
			})
			return snapshotResponse(
				useNewBlankCanvas
					? `Created ${created.length} shape(s) on a new blank canvas.`
					: `Created ${created.length} shape(s) on a new derived canvas.`,
				snapshot
			)
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
			const parsedUpdates = parseFocusedShapeUpdatesInput(updatesJson)
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
			const parsedShapeIds = parseShapeIdsInput(shapeIdsJson)
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

// --- get_canvas_state ---

const getCanvasStateInputSchema = z.object({})

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

// --- get_all_canvas_snapshots ---

server.registerTool(
	'get_all_canvas_snapshots',
	{
		title: 'Get All Canvas Snapshots',
		description: 'Returns snapshots for every canvas.',
		inputSchema: z.object({}),
		_meta: { ui: { visibility: ['app'] } },
	},
	async (): Promise<CallToolResult> => {
		try {
			const snapshots = getAllCanvasSnapshots()
			return {
				content: [
					{
						type: 'text',
						text: `Retrieved ${snapshots.length} canvas snapshot(s).`,
					},
				],
				structuredContent: { snapshots },
			}
		} catch (err) {
			return errorResponse(err)
		}
	}
)

// --- sync_canvas_state ---

const syncCanvasInputSchema = z.object({
	shapesJson: z.string().describe('JSON array of full tldraw shape records'),
	canvasId: z.string().min(1),
})

type SyncCanvasInput = z.infer<typeof syncCanvasInputSchema>

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
