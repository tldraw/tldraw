import { registerAppTool } from '@modelcontextprotocol/ext-apps/server'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { computeExecKey } from '../shared/exec-key'
import { CANVAS_RESOURCE_URI } from '../shared/types'
import type { ExecJobResult, MCP_APP_HOST_NAMES, ServerDeps } from '../shared/types'
import { generateCanvasId, isHostCodeEditor, writeToolAnalytics } from '../shared/utils'

// Bounded wait for the spawned widget to pull the job, execute, and submit.
// The widget rendezvouses through the BASE canvas's DO (it reads the base
// canvasId from its own tool args), so a result inside this window returns
// synchronously. On timeout the tool answers honestly: the fork already
// exists server-side seeded from the base, so nothing is lost — the model
// reads the outcome with get_canvas.
const EXEC_WAIT_MS = 6_000
// Code-editor hosts (Cursor, VS Code) boot the widget cold but deliver
// results inline reliably; give them a longer window.
const EXEC_WAIT_LONG_MS = 10_000

function isLongWaitHost(hostName: MCP_APP_HOST_NAMES): boolean {
	return isHostCodeEditor(hostName)
}

function continueInstructions(canvasId: string): string {
	return `Canvas ID: ${canvasId} — pass this canvasId to exec to keep building on this state, or pass any earlier canvasId to branch from that version instead. The original canvases are never modified.`
}

export function registerExecTool(
	server: McpServer,
	deps: ServerDeps,
	opts: {
		analytics?: AnalyticsEngineDataset
		log(...args: unknown[]): void
		getClientHostName(): MCP_APP_HOST_NAMES | undefined
	}
) {
	registerAppTool(
		server,
		'exec',
		{
			title: 'Execute Code',
			description: `Execute JavaScript code on a tldraw canvas. The code runs with access to the live \`editor\` instance, helper functions, and normal js. Use the \`search\` tool first to discover available Editor methods and shape types.

Every exec produces a NEW canvas and returns its canvasId. Omit \`canvasId\` to start from a blank canvas. Pass any \`canvasId\` from an earlier result to build on that canvas's latest state (including edits the user made by hand) — the original canvas is never modified, so every canvasId in the conversation remains a valid base to branch from.

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
						'Canvas to build on. Omit to start from a blank canvas. Pass a canvasId from any previous exec result to start from that state; the result is a new canvas and the original is unchanged.'
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
			canvasId: baseCanvasId,
		}: {
			code: string
			canvasId?: string
		}): Promise<CallToolResult> => {
			writeToolAnalytics(opts.analytics, 'exec', code)

			const hostName = opts.getClientHostName()
			const execId = crypto.randomUUID()
			// Job matching key: pairs each spawned widget with its own invocation
			// when several execs are in flight on one base. Identical code on the
			// same base makes the jobs interchangeable, which is harmless.
			const codeHash = await computeExecKey(code)
			const newCanvasId = generateCanvasId()

			// --- Brand-new canvas: no shared secret exists between this handler
			// and the freshly spawned widget until the tool result delivers the
			// canvasId, so the first draw is explicitly async. The job is queued
			// on the NEW canvas's DO; the widget learns the id from
			// ontoolresult.structuredContent, pulls, executes, and commits.
			if (!baseCanvasId) {
				const stub = deps.getCanvasStub(newCanvasId)
				await stub.seedCanvas({
					shapesJson: '[]',
					assetsJson: '[]',
					bindingsJson: '[]',
					contextJson: null,
					parentCanvasId: null,
					lineageId: newCanvasId,
				})
				await stub.enqueueExecJob({
					execId,
					code,
					codeHash,
					targetCanvasId: newCanvasId,
					legacyExecKey: await computeExecKey(code),
				})
				opts.log(
					`[tldraw-mcp] exec new canvas: canvasId=${newCanvasId}, execId=${execId}, host=${hostName ?? 'unknown'}`
				)
				return {
					content: [
						{
							type: 'text',
							text:
								`Canvas ${newCanvasId} created. The view is rendering and your code is executing — the resulting canvas state will be attached to the conversation shortly. Call get_canvas({ canvasId: "${newCanvasId}" }) if you need to confirm the result before continuing.\n\n` +
								continueInstructions(newCanvasId),
						},
					],
					structuredContent: { canvasId: newCanvasId },
				}
			}

			// --- Build on an existing canvas: fork-by-default. Resolve the base's
			// latest state, seed the new canvas from it (the fork exists even if
			// execution never happens), queue the job on the BASE DO where the
			// spawned widget can find it, and wait for a synchronous result.
			const baseStub = deps.getCanvasStub(baseCanvasId)
			let base = await baseStub.getCanvasState()

			if (!base) {
				// Lazy, best-effort migration: pre-redesign canvases lived in
				// session-keyed checkpoint tables. That lookup only works when this
				// conversation still routes to the session DO that stored them.
				const checkpointId = deps.getCanvasCheckpointId(baseCanvasId)
				const checkpoint = checkpointId ? deps.loadCheckpoint(checkpointId) : null
				if (checkpoint) {
					await baseStub.seedCanvas({
						shapesJson: JSON.stringify(checkpoint.shapes),
						assetsJson: JSON.stringify(checkpoint.assets),
						bindingsJson: JSON.stringify(checkpoint.bindings),
						contextJson: null,
						parentCanvasId: null,
						lineageId: baseCanvasId,
					})
					base = await baseStub.getCanvasState()
				}
			}

			if (!base) {
				return {
					content: [
						{
							type: 'text',
							text: `Canvas ${baseCanvasId} was not found — it may have expired or the id may be wrong. Pass a canvasId from an earlier exec result in this conversation, or omit canvasId to start a new blank canvas.`,
						},
					],
					isError: true,
				}
			}

			await deps.getCanvasStub(newCanvasId).seedCanvas({
				shapesJson: base.shapesJson,
				assetsJson: base.assetsJson,
				bindingsJson: base.bindingsJson,
				contextJson: base.contextJson,
				parentCanvasId: baseCanvasId,
				lineageId: base.lineageId ?? baseCanvasId,
			})
			await baseStub.enqueueExecJob({
				execId,
				code,
				codeHash,
				targetCanvasId: newCanvasId,
				// Old cached widget builds report results via the _exec_callback
				// shim, addressed by this key.
				legacyExecKey: await computeExecKey(code, baseCanvasId),
			})

			const waitMs = hostName && isLongWaitHost(hostName) ? EXEC_WAIT_LONG_MS : EXEC_WAIT_MS
			const startedAt = Date.now()
			opts.log(
				`[tldraw-mcp] exec fork: base=${baseCanvasId}, new=${newCanvasId}, execId=${execId}, host=${hostName ?? 'unknown'}, waitMs=${waitMs}`
			)

			const result: ExecJobResult | null = await baseStub.waitExecJob({ execId, timeoutMs: waitMs })

			if (result === null) {
				// Not a failure: the fork exists seeded from the base, and the
				// widget commits the executed state when it finishes booting.
				opts.log(
					`[tldraw-mcp] exec result not received within ${waitMs}ms (graceful): base=${baseCanvasId}, new=${newCanvasId}, elapsed=${Date.now() - startedAt}ms`
				)
				return {
					content: [
						{
							type: 'text',
							text:
								`Canvas ${newCanvasId} was created from ${baseCanvasId} and your code is still executing in the rendering view. The resulting canvas state will be attached shortly — call get_canvas({ canvasId: "${newCanvasId}" }) to confirm the result. If the code never applies (status "expired"), re-run exec against ${baseCanvasId}.\n\n` +
								continueInstructions(newCanvasId),
						},
					],
					structuredContent: { canvasId: newCanvasId },
				}
			}

			if (!result.success) {
				opts.log(`[tldraw-mcp] exec failed after ${Date.now() - startedAt}ms: ${result.error}`)
				return {
					content: [
						{
							type: 'text',
							text: `Runtime error executing code. The code was NOT applied: canvas ${newCanvasId} contains the unmodified state of ${baseCanvasId}. Fix the error and re-run exec against ${baseCanvasId} (or ${newCanvasId} — they are identical).\n\nError: ${result.error}`,
						},
					],
					structuredContent: { canvasId: newCanvasId },
					isError: true,
				}
			}

			const resultStr =
				result.result !== undefined ? JSON.stringify(result.result, null, 2) : undefined
			const lines = [
				resultStr
					? `Code executed successfully. Return value:\n${resultStr}`
					: 'Code executed successfully.',
				`\n${continueInstructions(newCanvasId)}`,
			]

			opts.log(
				`[tldraw-mcp] exec succeeded after ${Date.now() - startedAt}ms, base=${baseCanvasId}, new=${newCanvasId}`
			)
			return {
				content: [{ type: 'text', text: lines.join('\n') }],
				structuredContent: { canvasId: newCanvasId },
			}
		}
	)
}
