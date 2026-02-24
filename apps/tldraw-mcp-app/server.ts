import {
	registerAppResource,
	registerAppTool,
	RESOURCE_MIME_TYPE,
} from '@modelcontextprotocol/ext-apps/server'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult, ReadResourceResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { convertFocusedShapeToTldrawRecord, type FocusedShape } from './src/focused-shape.js'
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

// Lightweight cache so new widget instances can hydrate from the previous canvas.
// This is NOT authoritative state — the editor in the widget is the source of truth.
let cachedShapes: unknown[] = []

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
			'Creates shapes from a JSON string (FocusedShape[]). Optional new_blank_canvas=true starts from a blank canvas.',
		inputSchema: createShapesInputSchema,
		_meta: { ui: { resourceUri: CANVAS_RESOURCE_URI } },
	},
	async ({ shapesJson, new_blank_canvas }: CreateShapesInput): Promise<CallToolResult> => {
		try {
			const newBlankCanvas = parseBooleanFlag(new_blank_canvas, false)
			const focusedShapes = parseFocusedShapesInput(shapesJson)
			const tldrawRecords = focusedShapes.map((s: FocusedShape) =>
				convertFocusedShapeToTldrawRecord(s)
			)
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
					action: 'create' as const,
					newBlankCanvas,
					focusedShapes,
					tldrawRecords,
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
			return {
				content: [
					{
						type: 'text',
						text: `Updated ${updates.length} shape(s).`,
					},
				],
				structuredContent: {
					action: 'update' as const,
					updates,
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
			return {
				content: [
					{
						type: 'text',
						text: `Deleted ${shapeIds.length} shape(s).`,
					},
				],
				structuredContent: {
					action: 'delete' as const,
					shapeIds,
				},
			}
		} catch (err) {
			return errorResponse(err)
		}
	}
)

// --- push_canvas_state (app-only) ---

server.registerTool(
	'push_canvas_state',
	{
		title: 'Push Canvas State',
		description: 'App-only: cache the current editor shapes on the server.',
		inputSchema: z.object({
			shapesJson: z.string().describe('JSON array of full tldraw shape records'),
		}),
		_meta: { ui: { visibility: ['app'] } },
	},
	async ({ shapesJson }: { shapesJson: string }): Promise<CallToolResult> => {
		try {
			cachedShapes = parseJsonArray(shapesJson, 'shapesJson')
			return {
				content: [{ type: 'text', text: `Cached ${cachedShapes.length} shape(s).` }],
			}
		} catch (err) {
			return errorResponse(err)
		}
	}
)

// --- get_canvas_state (app-only) ---

server.registerTool(
	'get_canvas_state',
	{
		title: 'Get Canvas State',
		description: 'App-only: return cached shapes so a new widget can hydrate.',
		inputSchema: z.object({}),
		_meta: { ui: { visibility: ['app'] } },
	},
	async (): Promise<CallToolResult> => {
		return {
			content: [{ type: 'text', text: `${cachedShapes.length} cached shape(s).` }],
			structuredContent: { shapes: cachedShapes },
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
