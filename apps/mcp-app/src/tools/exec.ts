import { registerAppTool } from '@modelcontextprotocol/ext-apps/server'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { computeExecKey } from '../shared/exec-key'
import type { PendingRequests } from '../shared/pending-requests'
import { CANVAS_RESOURCE_URI } from '../shared/types'
import type { ExecResultPayload, MCP_APP_HOST_NAMES } from '../shared/types'
import { generateCanvasId, isHostCodeEditor, writeToolAnalytics } from '../shared/utils'

// Bounded wait for the widget's exec result. The widget runs the code and
// pushes the resulting canvas state to the model context independently of this
// wait, so a missed, slow, or misrouted result must never hang the tool: after
// the window we return a graceful "still executing" result. When the result
// arrives in time the model gets the full synchronous return value.
const EXEC_CALLBACK_WAIT_MS = 4_000
// Code-editor hosts (Cursor, VS Code) can deliver the result inline but boot
// the widget cold on the first call, so give them a longer window.
const EXEC_CALLBACK_WAIT_LONG_MS = 8_000

function isLongWaitHost(hostName: MCP_APP_HOST_NAMES): boolean {
	return isHostCodeEditor(hostName)
}

export function registerExecTool(
	server: McpServer,
	opts: {
		analytics?: AnalyticsEngineDataset
		log(...args: unknown[]): void
		pendingRequests: PendingRequests
		getMcpSessionId(): string
		getClientHostName(): MCP_APP_HOST_NAMES | undefined
		waitExecResult(
			execKey: string,
			timeoutMs: number,
			notBefore: number
		): Promise<ExecResultPayload | null>
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

			const hostName = opts.getClientHostName()
			const waitMs =
				hostName && isLongWaitHost(hostName) ? EXEC_CALLBACK_WAIT_LONG_MS : EXEC_CALLBACK_WAIT_MS

			// Key on the model-supplied canvasId (not the generated fallback): it's
			// the value the widget also has, and it makes same-code-different-canvas
			// invocations derive different keys so results can't be swapped.
			const execKey = await computeExecKey(code, inputCanvasId)
			const startedAt = Date.now()
			opts.log(
				`[tldraw-mcp] exec start: canvasId=${canvasId}, existing=${Boolean(inputCanvasId)}, host=${hostName ?? 'unknown'}, waitMs=${waitMs}, execKey=${execKey}, mcpSessionId=${opts.getMcpSessionId()}, startedAt=${startedAt}`
			)

			// The widget's result can come back two ways, raced with one shared window:
			// - the in-memory pending request, when the host routes `_exec_callback`
			//   over this same session (Cursor, VS Code)
			// - the exec:<execKey> rendezvous DO, when the callback lands on a
			//   different session DO (Claude, ChatGPT) and gets forwarded
			let localWait: Promise<unknown> | null = null
			try {
				localWait = opts.pendingRequests.create('exec', waitMs)
			} catch {
				// Another exec on this session is already waiting; rely on the rendezvous.
				localWait = null
			}

			// Defense in depth against a rendezvous-key collision (identical `code`
			// from a different invocation hashing to the same exec:<execKey> DO): if
			// the delivered payload names a canvasId and it isn't the one this
			// invocation is editing, it belongs to someone else — drop it to null so
			// the legitimate result can still win the race (or we degrade gracefully).
			const validate = (payload: ExecResultPayload | null): ExecResultPayload | null => {
				if (payload && payload.canvasId && payload.canvasId !== canvasId) {
					opts.log(
						`[tldraw-mcp] exec result rejected: canvasId mismatch (expected=${canvasId}, got=${payload.canvasId}, execKey=${execKey})`
					)
					return null
				}
				return payload
			}

			const sources: Array<Promise<ExecResultPayload | null>> = []
			if (localWait) {
				sources.push(
					localWait.then((value) => validate(value as ExecResultPayload)).catch(() => null)
				)
			}
			sources.push(
				opts
					.waitExecResult(execKey, waitMs, startedAt)
					.then(validate)
					.catch(() => null)
			)

			const result = await new Promise<ExecResultPayload | null>((resolve) => {
				let remaining = sources.length
				let settled = false
				for (const source of sources) {
					void source.then((value) => {
						remaining--
						if (settled) return
						if (value) {
							settled = true
							resolve(value)
						} else if (remaining === 0) {
							settled = true
							resolve(null)
						}
					})
				}
			})

			// Drop whichever waiter didn't win so the channel is free for the next exec.
			opts.pendingRequests.cancel('exec')

			if (result === null) {
				// No result arrived within the bounded window. This is NOT a failure:
				// the widget still runs the code and pushes the resulting canvas state
				// to the model context on its own, so return a graceful (non-error)
				// message instead of hanging the tool.
				opts.log(
					`[tldraw-mcp] exec result not received within ${waitMs}ms (graceful): canvasId=${canvasId}, execKey=${execKey}, mcpSessionId=${opts.getMcpSessionId()}, elapsed=${Date.now() - startedAt}ms`
				)
				// structuredContent.canvasId reaches the widget via the host's
				// tool-result event — the reliable channel for teaching the widget its
				// server-assigned canvasId regardless of host session routing.
				return {
					content: [
						{
							type: 'text',
							text:
								`Canvas ${canvasId} is rendering and your code is executing. The resulting canvas state will be attached to the conversation shortly (it may already be present).\n\n` +
								`Canvas ID: ${canvasId} — pass this canvasId to edit the same canvas again. If the expected shapes don't appear in the next canvas-state update, re-run exec with a corrected script.`,
						},
					],
					structuredContent: { canvasId },
				}
			}

			if (!result.success) {
				opts.log(
					`[tldraw-mcp] exec failed via callback after ${Date.now() - startedAt}ms: ${result.error}`
				)
				return {
					content: [
						{
							type: 'text',
							text: `Runtime error executing code on canvas. The code was NOT applied successfully. Fix the error and try again.\n\nCanvas ID: ${canvasId} — to retry on this canvas, pass this canvasId.\n\nError: ${result.error}`,
						},
					],
					structuredContent: { canvasId },
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

			opts.log(
				`[tldraw-mcp] exec succeeded via callback after ${Date.now() - startedAt}ms, canvasId=${canvasId}`
			)
			return {
				content: [{ type: 'text', text: lines.join('\n') }],
				structuredContent: { canvasId },
			}
		}
	)
}
