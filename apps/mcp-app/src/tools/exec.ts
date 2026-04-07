import { registerAppTool } from '@modelcontextprotocol/ext-apps/server'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import type { PendingRequests } from '../shared/pending-requests'
import { CANVAS_RESOURCE_URI } from '../shared/types'

const EXEC_CALLBACK_TIMEOUT_MS = 30_000

export function registerExecTool(
	server: McpServer,
	opts: {
		analytics?: AnalyticsEngineDataset
		log(...args: unknown[]): void
		pendingRequests: PendingRequests
	}
) {
	registerAppTool(
		server,
		'exec',
		{
			title: 'Execute Code',
			description: `Execute JavaScript code on a tldraw canvas. The code runs in the widget with access to the live \`editor\` instance, helper functions, and normal js. Use the \`search\` tool first to discover available Editor methods and shape types. The canvas forks the previous one in this conversation, if any. Otherwise, it starts from a blank canvas.

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
			}),
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: false,
				openWorldHint: false,
			},
			_meta: { ui: { resourceUri: CANVAS_RESOURCE_URI } },
		},
		async ({ code: _code }: { code: string }): Promise<CallToolResult> => {
			opts.analytics?.writeDataPoint({
				blobs: ['tool_called', 'exec'],
			})
			opts.log('[tldraw-mcp] exec called, waiting for widget callback...')

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
								text: `Runtime error executing code on canvas. The code was NOT applied successfully. Fix the error and try again.\n\nError: ${result.error}`,
							},
						],
						isError: true,
					}
				}

				const resultStr =
					result.result !== undefined ? JSON.stringify(result.result, null, 2) : undefined
				const text = resultStr
					? `Code executed successfully on canvas. Return value:\n${resultStr}`
					: 'Code executed successfully on canvas.'

				opts.log(`[tldraw-mcp] exec succeeded`)
				return { content: [{ type: 'text', text }] }
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
