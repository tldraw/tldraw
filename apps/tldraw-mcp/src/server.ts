/** MCP server factory — registers all action-based tools via MCP Apps extension. */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import {
	RESOURCE_MIME_TYPE,
	registerAppResource,
	registerAppTool,
} from '@modelcontextprotocol/ext-apps/server'
import { z } from 'zod'
import { convertTldrawRecordToFocusedShape, FocusedShapeSchema } from './focused-shape.js'
import { getAllBindings, getAllShapes, getShapeCount, getTitle, setTitle } from './store.js'
import {
	executeAlignShapes,
	executeClearCanvas,
	executeCreateShapes,
	executeDeleteShapes,
	executeDistributeShapes,
	executeDrawPen,
	executeGroupShapes,
	executeLabelShape,
	executeMoveShapes,
	executeResizeShapes,
	executeRotateShapes,
	executeUngroupShapes,
	executeUpdateShapes,
} from './tools/actions.js'
import { executeLoadCheckpoint, executeSaveCheckpoint } from './tools/checkpoint.js'
import { buildTextSummary, loadWidgetHtmlRaw } from './tools/create-view.js'
import { executeExport } from './tools/export.js'
import { lintCanvas } from './tools/lint.js'
import { READ_ME_CONTENT } from './tools/read-me.js'
import { TEMPLATE_NAMES, TEMPLATES } from './tools/templates.js'

const RESOURCE_URI = 'ui://tldraw/mcp-app.html'

/** Build a brief text-only tool response with just the action summary and shape count. */
function briefResponse(summary: string) {
	const count = getShapeCount()
	return {
		content: [{ type: 'text' as const, text: `${summary} (${count} shape(s) on canvas)` }],
	}
}

/** Build a full text-only tool response with a summary of every shape on the canvas. */
function textResponse(actionSummary: string) {
	const shapes = getAllShapes()
	const title = getTitle()
	const textSummary = buildTextSummary(shapes, title)

	return {
		content: [
			{
				type: 'text' as const,
				text: `${actionSummary}\n\n${textSummary}`,
			},
		],
	}
}

/** Build a tool response with text + structuredContent for the widget iframe. */
function viewResponse(actionSummary: string) {
	const shapes = getAllShapes()
	const bindings = getAllBindings()
	const title = getTitle()
	const textSummary = buildTextSummary(shapes, title)

	// Run lint checks and append warnings
	const lints = lintCanvas()
	let lintText = ''
	if (lints.length > 0) {
		lintText =
			'\n\nLayout issues:\n' +
			lints.map((l) => `- ${l.severity}: ${l.message}`).join('\n')
	}

	return {
		content: [
			{
				type: 'text' as const,
				text: `${actionSummary}\n\n${textSummary}${lintText}`,
			},
		],
		structuredContent: {
			shapes,
			bindings,
			title,
		},
	}
}

function errorResponse(err: unknown) {
	const message = err instanceof Error ? err.message : String(err)
	return {
		content: [{ type: 'text' as const, text: `Error: ${message}` }],
		isError: true,
	}
}

const uiMeta = { _meta: { ui: { resourceUri: RESOURCE_URI } } }

export function createServer(): McpServer {
	const server = new McpServer({
		name: 'tldraw-mcp',
		version: '1.0.0',
	})

	// ─── HTML resource (fetched by host, rendered in iframe) ───────────────
	registerAppResource(
		server,
		'tldraw MCP App',
		RESOURCE_URI,
		{ description: 'Interactive tldraw canvas for diagram rendering' },
		async () => ({
			contents: [
				{
					uri: RESOURCE_URI,
					mimeType: RESOURCE_MIME_TYPE,
					text: loadWidgetHtmlRaw(),
				},
			],
		})
	)

	// ─── read_me (plain tool, no UI) ──────────────────────────────────────
	server.tool(
		'read_me',
		'Get the tldraw shape format reference. Call this FIRST before creating any diagrams to understand the FocusedShape format and available action tools.',
		{},
		async () => ({
			content: [{ type: 'text', text: READ_ME_CONTENT }],
		})
	)

	// ─── create_view (THE ONLY UI tool — renders the diagram) ─────────────
	registerAppTool(
		server,
		'create_view',
		{
			description:
				'Render the current canvas as an inline diagram. Pass shapes to create/add, or omit to render existing state. Use action to control behavior: "create" (default) clears canvas first, "add" appends to existing, "clear" clears and renders empty.',
			inputSchema: {
				shapes: z
					.string()
					.optional()
					.describe(
						'Optional JSON array of FocusedShape objects. If omitted, renders the current canvas state.'
					),
				title: z.string().optional().describe('Optional diagram title'),
				action: z
					.enum(['create', 'add', 'clear'])
					.optional()
					.describe(
						'Action mode: "create" (default) clears canvas then creates shapes, "add" appends shapes to existing canvas, "clear" clears canvas and renders empty.'
					),
			},
			...uiMeta,
		},
		async ({ shapes, title, action }) => {
			try {
				const mode = action ?? 'create'

				if (mode === 'clear') {
					executeClearCanvas()
					if (title !== undefined) {
						setTitle(title)
					}
					return viewResponse('Canvas cleared.')
				}

				if (mode === 'create' && shapes) {
					executeClearCanvas()
				}

				if (shapes) {
					const parsed = JSON.parse(shapes)
					if (!Array.isArray(parsed)) throw new Error('shapes must be a JSON array')
					const validated = parsed.map((s: unknown) => FocusedShapeSchema.parse(s))
					executeCreateShapes(validated, title)
				}
				return viewResponse('Diagram rendered.')
			} catch (err) {
				return errorResponse(err)
			}
		}
	)

	// ─── All mutation tools below are plain (no widget) ───────────────────

	// ─── create_shapes ────────────────────────────────────────────────────
	server.tool(
		'create_shapes',
		'Create one or more shapes on the canvas using the FocusedShape format. Each shape needs a unique shapeId and _type. Call create_view afterwards to display the result.',
		{
			shapes: z
				.string()
				.describe(
					'JSON array of FocusedShape objects. Each has _type, shapeId, position, and type-specific props.'
				),
			title: z.string().optional().describe('Optional diagram title'),
		},
		async ({ shapes, title }) => {
			try {
				const parsed = JSON.parse(shapes)
				if (!Array.isArray(parsed)) throw new Error('shapes must be a JSON array')
				const validated = parsed.map((s: unknown) => FocusedShapeSchema.parse(s))
				const summary = executeCreateShapes(validated, title)
				return briefResponse(summary)
			} catch (err) {
				return errorResponse(err)
			}
		}
	)

	// ─── delete_shapes ────────────────────────────────────────────────────
	server.tool(
		'delete_shapes',
		'Delete shapes by their IDs.',
		{
			shapeIds: z.string().describe('JSON array of shape ID strings to delete'),
		},
		async ({ shapeIds }) => {
			try {
				const parsed = JSON.parse(shapeIds)
				if (!Array.isArray(parsed)) throw new Error('shapeIds must be a JSON array')
				const summary = executeDeleteShapes(parsed)
				return briefResponse(summary)
			} catch (err) {
				return errorResponse(err)
			}
		}
	)

	// ─── move_shapes ──────────────────────────────────────────────────────
	server.tool(
		'move_shapes',
		'Move shapes to new positions.',
		{
			moves: z
				.string()
				.describe(
					'JSON array of move specs: [{ "shapeId": "id", "x": 100, "y": 200 }, ...]'
				),
		},
		async ({ moves }) => {
			try {
				const parsed = JSON.parse(moves)
				if (!Array.isArray(parsed)) throw new Error('moves must be a JSON array')
				const summary = executeMoveShapes(parsed)
				return briefResponse(summary)
			} catch (err) {
				return errorResponse(err)
			}
		}
	)

	// ─── resize_shapes ────────────────────────────────────────────────────
	server.tool(
		'resize_shapes',
		'Scale shapes relative to an origin point.',
		{
			shapeIds: z.string().describe('JSON array of shape ID strings'),
			scaleX: z.number().describe('Horizontal scale factor (1.0 = no change)'),
			scaleY: z.number().describe('Vertical scale factor (1.0 = no change)'),
			originX: z.number().describe('X coordinate of the scaling origin'),
			originY: z.number().describe('Y coordinate of the scaling origin'),
		},
		async ({ shapeIds, scaleX, scaleY, originX, originY }) => {
			try {
				const parsed = JSON.parse(shapeIds)
				if (!Array.isArray(parsed)) throw new Error('shapeIds must be a JSON array')
				const summary = executeResizeShapes(parsed, scaleX, scaleY, originX, originY)
				return briefResponse(summary)
			} catch (err) {
				return errorResponse(err)
			}
		}
	)

	// ─── rotate_shapes ────────────────────────────────────────────────────
	server.tool(
		'rotate_shapes',
		'Rotate shapes around an origin point.',
		{
			shapeIds: z.string().describe('JSON array of shape ID strings'),
			degrees: z.number().describe('Rotation angle in degrees'),
			originX: z.number().describe('X coordinate of the rotation center'),
			originY: z.number().describe('Y coordinate of the rotation center'),
		},
		async ({ shapeIds, degrees, originX, originY }) => {
			try {
				const parsed = JSON.parse(shapeIds)
				if (!Array.isArray(parsed)) throw new Error('shapeIds must be a JSON array')
				const summary = executeRotateShapes(parsed, degrees, originX, originY)
				return briefResponse(summary)
			} catch (err) {
				return errorResponse(err)
			}
		}
	)

	// ─── align_shapes ─────────────────────────────────────────────────────
	server.tool(
		'align_shapes',
		'Align shapes along an edge or center axis.',
		{
			shapeIds: z.string().describe('JSON array of shape ID strings'),
			alignment: z
				.enum(['left', 'center-horizontal', 'right', 'top', 'center-vertical', 'bottom'])
				.describe('Alignment direction'),
		},
		async ({ shapeIds, alignment }) => {
			try {
				const parsed = JSON.parse(shapeIds)
				if (!Array.isArray(parsed)) throw new Error('shapeIds must be a JSON array')
				const summary = executeAlignShapes(parsed, alignment)
				return briefResponse(summary)
			} catch (err) {
				return errorResponse(err)
			}
		}
	)

	// ─── distribute_shapes ────────────────────────────────────────────────
	server.tool(
		'distribute_shapes',
		'Distribute shapes evenly along an axis.',
		{
			shapeIds: z.string().describe('JSON array of shape ID strings'),
			direction: z
				.enum(['horizontal', 'vertical'])
				.describe('Distribution direction'),
		},
		async ({ shapeIds, direction }) => {
			try {
				const parsed = JSON.parse(shapeIds)
				if (!Array.isArray(parsed)) throw new Error('shapeIds must be a JSON array')
				const summary = executeDistributeShapes(parsed, direction)
				return briefResponse(summary)
			} catch (err) {
				return errorResponse(err)
			}
		}
	)

	// ─── label_shape ──────────────────────────────────────────────────────
	server.tool(
		'label_shape',
		'Update the text label on a shape.',
		{
			shapeId: z.string().describe('The shape ID to update'),
			text: z.string().describe('New label text'),
		},
		async ({ shapeId, text }) => {
			try {
				const summary = executeLabelShape(shapeId, text)
				return briefResponse(summary)
			} catch (err) {
				return errorResponse(err)
			}
		}
	)

	// ─── draw_pen ─────────────────────────────────────────────────────────
	server.tool(
		'draw_pen',
		'Create a freehand drawing shape from a list of points.',
		{
			shapeId: z.string().describe('Unique ID for the new draw shape'),
			points: z
				.string()
				.describe('JSON array of point objects: [{ "x": 0, "y": 0 }, ...]'),
			color: z.string().optional().describe('Color name (default: black)'),
			fill: z.string().optional().describe('Fill style (default: none)'),
			closed: z.boolean().optional().describe('Close the path (default: false)'),
			style: z
				.string()
				.optional()
				.describe('Dash style: draw, solid, dashed, dotted (default: draw)'),
		},
		async ({ shapeId, points, color, fill, closed, style }) => {
			try {
				const parsed = JSON.parse(points)
				if (!Array.isArray(parsed)) throw new Error('points must be a JSON array')
				const summary = executeDrawPen(shapeId, parsed, color, fill, closed, style)
				return briefResponse(summary)
			} catch (err) {
				return errorResponse(err)
			}
		}
	)

	// ─── update_shapes ────────────────────────────────────────────────────
	server.tool(
		'update_shapes',
		'Update properties on existing shapes. Pass an array of partial updates — only specified properties are changed.',
		{
			updates: z
				.string()
				.describe(
					'JSON array of update objects: [{ "shapeId": "id", "color": "red", "text": "new label", ... }]. Supported properties: x, y, w, h, color, fill, dash, size, font, text, textAlign, name.'
				),
		},
		async ({ updates }) => {
			try {
				const parsed = JSON.parse(updates)
				if (!Array.isArray(parsed)) throw new Error('updates must be a JSON array')
				const summary = executeUpdateShapes(parsed)
				return briefResponse(summary)
			} catch (err) {
				return errorResponse(err)
			}
		}
	)

	// ─── group_shapes ─────────────────────────────────────────────────────
	server.tool(
		'group_shapes',
		'Group shapes into a single unit.',
		{
			shapeIds: z.string().describe('JSON array of shape IDs to group'),
			groupId: z.string().describe('ID for the new group'),
		},
		async ({ shapeIds, groupId }) => {
			try {
				const parsed = JSON.parse(shapeIds)
				if (!Array.isArray(parsed)) throw new Error('shapeIds must be a JSON array')
				const summary = executeGroupShapes(parsed, groupId)
				return briefResponse(summary)
			} catch (err) {
				return errorResponse(err)
			}
		}
	)

	// ─── ungroup_shapes ───────────────────────────────────────────────────
	server.tool(
		'ungroup_shapes',
		'Ungroup a group back into individual shapes.',
		{
			groupId: z.string().describe('Group shape ID to ungroup'),
		},
		async ({ groupId }) => {
			try {
				const summary = executeUngroupShapes(groupId)
				return briefResponse(summary)
			} catch (err) {
				return errorResponse(err)
			}
		}
	)

	// ─── clear_canvas ─────────────────────────────────────────────────────
	server.tool(
		'clear_canvas',
		'Remove all shapes and reset the canvas.',
		{},
		async () => {
			try {
				const summary = executeClearCanvas()
				return {
					content: [{ type: 'text' as const, text: summary }],
				}
			} catch (err) {
				return errorResponse(err)
			}
		}
	)

	// ─── get_canvas_state (read-only introspection) ──────────────────────
	server.tool(
		'get_canvas_state',
		'Get the current canvas state in FocusedShape format. Returns all shapes using the same vocabulary as create_shapes, enabling reasoning about what to modify.',
		{},
		async () => {
			try {
				const shapes = getAllShapes()
				const title = getTitle()
				const focusedShapes: unknown[] = []
				for (const record of shapes) {
					const simpleId = (record.id as string).replace('shape:', '')
					const focused = convertTldrawRecordToFocusedShape(record, simpleId)
					if (focused) focusedShapes.push(focused)
				}
				const lines: string[] = []
				if (title) lines.push(`Title: "${title}"`)
				lines.push(`${focusedShapes.length} shape(s) on canvas:`)
				lines.push('```json')
				lines.push(JSON.stringify(focusedShapes, null, 2))
				lines.push('```')
				return {
					content: [{ type: 'text' as const, text: lines.join('\n') }],
				}
			} catch (err) {
				return errorResponse(err)
			}
		}
	)

	// ─── save_checkpoint ──────────────────────────────────────────────────
	server.tool(
		'save_checkpoint',
		'Save the current diagram state as a named checkpoint for later restoration.',
		{
			id: z.string().describe('Unique checkpoint identifier'),
		},
		async ({ id }) => {
			const result = executeSaveCheckpoint(id)
			return {
				content: [
					{
						type: 'text' as const,
						text: `Checkpoint "${id}" saved with ${result.shapeCount} shape(s).`,
					},
				],
			}
		}
	)

	// ─── load_checkpoint ──────────────────────────────────────────────────
	server.tool(
		'load_checkpoint',
		'Load a previously saved diagram checkpoint.',
		{
			id: z.string().describe('Checkpoint identifier to load'),
		},
		async ({ id }) => {
			const result = executeLoadCheckpoint(id)
			if (!result.success) {
				return {
					content: [{ type: 'text' as const, text: `Checkpoint "${id}" not found.` }],
					isError: true,
				}
			}
			return textResponse(
				`Loaded checkpoint "${id}" with ${result.shapeCount} shape(s).${result.title ? ` Title: "${result.title}"` : ''}`
			)
		}
	)

	// ─── use_template ─────────────────────────────────────────────────────
	server.tool(
		'use_template',
		'Generate a diagram from a predefined template layout. Creates shapes on the canvas that can be refined with update_shapes, move_shapes, etc. Call create_view afterwards to display the result.',
		{
			template: z
				.enum(TEMPLATE_NAMES)
				.describe(
					'Template name: flowchart-lr, flowchart-tb, org-chart, architecture, mind-map, sequence'
				),
			labels: z
				.string()
				.describe('JSON array of label strings — one per node/actor in the template'),
			title: z.string().optional().describe('Optional diagram title'),
		},
		async ({ template, labels, title }) => {
			try {
				const generator = TEMPLATES[template]
				if (!generator) throw new Error(`Unknown template: ${template}`)
				const parsedLabels = JSON.parse(labels)
				if (!Array.isArray(parsedLabels)) throw new Error('labels must be a JSON array')
				const shapes = generator(parsedLabels)
				executeCreateShapes(shapes, title)
				return briefResponse(`Generated "${template}" template with ${parsedLabels.length} label(s).`)
			} catch (err) {
				return errorResponse(err)
			}
		}
	)

	// ─── export_diagram (plain tool, no UI) ───────────────────────────────
	server.tool(
		'export_diagram',
		'Export the current diagram as JSON. Use "tldr" format for importing into tldraw.com.',
		{
			format: z
				.enum(['json', 'tldr'])
				.optional()
				.describe('Export format: json (raw shapes) or tldr (tldraw file format). Default: json'),
		},
		async ({ format }) => {
			const result = executeExport(format ?? 'json')
			if (result.shapeCount === 0) {
				return {
					content: [{ type: 'text', text: 'No shapes to export. Create a diagram first.' }],
				}
			}
			return {
				content: [
					{
						type: 'text',
						text: `Exported ${result.shapeCount} shape(s) in ${result.format} format:\n\n\`\`\`json\n${JSON.stringify(result.data, null, 2)}\n\`\`\``,
					},
				],
			}
		}
	)

	return server
}
