import { registerAppTool } from '@modelcontextprotocol/ext-apps/server'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import type { PendingRequests } from '../shared/pending-requests'
import { CANVAS_RESOURCE_URI } from '../shared/types'
import { generateCanvasId } from '../shared/utils'

const EXEC_CALLBACK_TIMEOUT_MS = 30_000

export function registerExecTool(
	server: McpServer,
	opts: {
		analytics?: AnalyticsEngineDataset
		log(...args: unknown[]): void
		pendingRequests: PendingRequests
		setCurrentExecCanvasId(id: string): void
	}
) {
	registerAppTool(
		server,
		'exec',
		{
			title: 'Execute Code',
			description: `Execute JavaScript code on a tldraw canvas. The code runs in the widget with access to the live \`editor\` instance, helper functions, and normal js. Use the \`search\` tool first to discover available Editor methods and shape types.

Each canvas has a unique \`canvasId\`. Omit \`canvasId\` to create a new blank canvas. To edit an existing canvas, pass the \`canvasId\` that was returned by a previous exec call.

Shapes and text grow depending on the amount of text they have. Use clever scripting to ensure there are no unintended overlaps.

Examples:
- Create a rectangle: editor.createShape({ _type: 'rectangle', shapeId: 'box1', x: 200, y: 120, w: 320, h: 180, text: 'Hello' })
- Connect shapes with an arrow: editor.createShape({ _type: 'arrow', shapeId: 'a1', fromId: 'box1', toId: 'box2', x1: 0, y1: 0, x2: 100, y2: 0 })
- Select and zoom: editor.select('box1'); editor.zoomToSelection()
- Read shapes: return editor.getCurrentPageShapes()
- Distribute evenly: editor.distributeShapes(editor.getSelectedShapeIds(), 'horizontal')
- Box around shapes: boxShapes(['box1', 'box2'], { text: 'Group label', color: 'blue' })
- Stack shapes dynamically: editor.createShape({ _type: 'rectangle', shapeId: 'a', x: 0, y: 0, w: 300, h: 200, text: 'First box\\nwith wrapping text' }); const bounds = editor.getShapePageBounds('a'); editor.createShape({ _type: 'rectangle', shapeId: 'b', x: 0, y: bounds.maxY + 20, w: 300, h: 200, text: 'Below first' })`,
			inputSchema: z.object({
				code: z
					.string()
					.describe(
						'JavaScript code to execute. Has access to `editor` (tldraw Editor instance) and helper functions.'
					),
				canvasId: z
					.string()
					.optional()
					.describe(
						'Canvas ID to edit. Omit to create a new blank canvas. Pass a canvasId from a previous exec result to continue editing that canvas.'
					),
			}),
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: false,
				openWorldHint: false,
			},
			_meta: { ui: { resourceUri: CANVAS_RESOURCE_URI } },
		},
		async ({
			code: _code,
			canvasId: inputCanvasId,
		}: {
			code: string
			canvasId?: string
		}): Promise<CallToolResult> => {
			opts.analytics?.writeDataPoint({
				blobs: ['tool_called', 'exec'],
			})

			const canvasId = inputCanvasId || generateCanvasId()
			opts.setCurrentExecCanvasId(canvasId)

			opts.log(`[tldraw-mcp] exec called: canvasId=${canvasId}, existing=${Boolean(inputCanvasId)}`)

			try {
				const result = (await opts.pendingRequests.create('exec', EXEC_CALLBACK_TIMEOUT_MS)) as {
					success: boolean
					result?: unknown
					error?: string
				}

				if (!result.success) {
					opts.log(`[tldraw-mcp] exec failed: ${result.error}`)
					return {
						content: [
							{
								type: 'text',
								text: `Runtime error executing code on canvas. The code was NOT applied successfully. Fix the error and try again.\n\nCanvas ID: ${canvasId} — to retry on this canvas, pass this canvasId.\n\nError: ${result.error}`,
							},
						],
						isError: true,
					}
				}

				const resultStr =
					result.result !== undefined ? JSON.stringify(result.result, null, 2) : undefined
				const lines = [
					resultStr
						? `Code executed successfully on canvas. Return value:\n${resultStr}`
						: 'Code executed successfully on canvas.',
					`\nCanvas ID: ${canvasId} — to edit this canvas again, pass this as the canvasId parameter.`,
				]

				opts.log(`[tldraw-mcp] exec succeeded, canvasId=${canvasId}`)
				return { content: [{ type: 'text', text: lines.join('\n') }] }
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err)
				opts.log(`[tldraw-mcp] exec error: ${message}`)
				return {
					content: [
						{
							type: 'text',
							text: `Exec failed: ${message}`,
						},
					],
					isError: true,
				}
			}
		}
	)
}
