import { registerAppTool } from '@modelcontextprotocol/ext-apps/server'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import type { PendingRequests } from '../shared/pending-requests'
import { CANVAS_RESOURCE_URI } from '../shared/types'
import { generateCanvasId, writeToolAnalytics } from '../shared/utils'

// How long the exec tool waits for the widget's synchronous `_exec_callback`
// before returning a graceful "still executing" result. This is intentionally
// short: the widget runs the code and pushes the resulting canvas state to the
// model context independently of this callback, so a missed/slow/misrouted
// callback must never hang the tool. When the callback does arrive promptly
// (the common case on well-behaved hosts) the model still gets the full
// synchronous result, including any return value or runtime error.
const EXEC_CALLBACK_WAIT_MS = 4_000

export function registerExecTool(
	server: McpServer,
	opts: {
		analytics?: AnalyticsEngineDataset
		log(...args: unknown[]): void
		pendingRequests: PendingRequests
		execChannelCanvasIds: Map<string, string>
		getDoName(): string
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
			code,
			canvasId: inputCanvasId,
		}: {
			code: string
			canvasId?: string
		}): Promise<CallToolResult> => {
			writeToolAnalytics(opts.analytics, 'exec', code)

			const canvasId = inputCanvasId || generateCanvasId()
			// Channel is keyed by the *input* canvasId so concurrent execs on distinct
			// existing canvases don't collide on a single 'exec' channel. New canvases
			// (no inputCanvasId) share the 'exec' channel; the widget derives the same
			// key from the same tool arguments it receives via `ontoolinput`.
			const channel = inputCanvasId ? `exec:${inputCanvasId}` : 'exec'
			opts.execChannelCanvasIds.set(channel, canvasId)

			// The canonical DO name. Stamped into the result `_meta` so the widget can
			// (re)pin every subsequent callback to this exact DO regardless of how the
			// host routes widget-initiated calls.
			const doName = opts.getDoName()

			opts.log(
				`[tldraw-mcp] exec called: canvasId=${canvasId}, existing=${Boolean(inputCanvasId)}, channel=${channel}`
			)

			// `_meta` the widget reads from the tool result: the canonical DO name (to
			// pin future callbacks) and the canvasId (so the widget adopts the
			// server-assigned id even when the synchronous callback never resolves).
			const meta = { tldraw: { doName, canvasId } }

			let result: { success: boolean; result?: unknown; error?: string } | undefined
			try {
				result = (await opts.pendingRequests.create(channel, EXEC_CALLBACK_WAIT_MS)) as {
					success: boolean
					result?: unknown
					error?: string
				}
			} catch (err) {
				// No synchronous callback arrived within the bounded window — timeout,
				// a callback that was routed to a different DO, or a concurrent exec on
				// this channel. This is NOT a failure: the widget still runs the code and
				// pushes the resulting canvas state into the model context on its own, so
				// we return a graceful (non-error) message instead of hanging.
				opts.execChannelCanvasIds.delete(channel)
				opts.log(
					`[tldraw-mcp] exec callback not received within ${EXEC_CALLBACK_WAIT_MS}ms (graceful): ${err instanceof Error ? err.message : String(err)}`
				)
				return {
					content: [
						{
							type: 'text',
							text:
								`Canvas ${canvasId} is rendering and your code is executing. The resulting canvas state will be attached to the conversation shortly (it may already be present).\n\n` +
								`Canvas ID: ${canvasId} — pass this canvasId to edit the same canvas again. If the expected shapes don't appear in the next canvas-state update, re-run exec with a corrected script.`,
						},
					],
					_meta: meta,
				}
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
					_meta: meta,
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
			return {
				content: [{ type: 'text', text: lines.join('\n') }],
				_meta: meta,
			}
		}
	)
}
