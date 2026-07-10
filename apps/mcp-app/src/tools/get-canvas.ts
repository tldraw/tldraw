import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import type { ServerDeps } from '../shared/types'

/**
 * Read the authoritative state of any canvas by id: shapes (focused format
 * when a widget has rendered the canvas, raw records otherwise), plus the
 * status of any recent exec job. This is the recovery path when an exec
 * result said "still executing", and the read path for hosts that render no
 * widgets at all.
 */
export function registerGetCanvasTool(server: McpServer, deps: ServerDeps) {
	server.registerTool(
		'get_canvas',
		{
			title: 'Get Canvas',
			description:
				'Read the current state of a canvas by canvasId, including any edits the user made by hand. Also reports whether code from a recent exec call is still executing, has applied, or expired unapplied.',
			inputSchema: z.object({
				canvasId: z.string().min(1).describe('A canvasId returned by a previous exec call.'),
			}),
			annotations: {
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false,
			},
		},
		async ({ canvasId }: { canvasId: string }): Promise<CallToolResult> => {
			const stub = deps.getCanvasStub(canvasId)
			const state = await stub.getCanvasState()
			if (!state) {
				return {
					content: [
						{
							type: 'text',
							text: `Canvas ${canvasId} was not found — it may have expired or the id may be wrong.`,
						},
					],
					isError: true,
				}
			}

			const jobs = await stub.getExecJobSummaries()
			const shapes = JSON.parse(state.shapesJson) as unknown[]
			const assets = JSON.parse(state.assetsJson) as unknown[]

			const lines = [`Canvas ${canvasId}: ${shapes.length} shape(s), ${assets.length} asset(s).`]
			if (state.parentCanvasId) {
				lines.push(`Created from canvas ${state.parentCanvasId}.`)
			}
			const active = jobs.find((j) => j.status === 'queued' || j.status === 'dispatched')
			const expired = jobs.find((j) => j.status === 'expired')
			if (active) {
				lines.push(
					'Code from a recent exec call is still executing — the state below may not include it yet.'
				)
			} else if (expired) {
				lines.push(
					'A recent exec expired before it could run (no view rendered in time). The state below does not include that code — re-run exec if it should apply.'
				)
			}

			// Prefer the focused-format context a widget computed; fall back to
			// raw records for canvases no widget has rendered yet.
			let contextShapes: unknown = null
			if (state.contextJson) {
				try {
					const parsed = JSON.parse(state.contextJson)
					if (parsed && Array.isArray(parsed.shapes)) contextShapes = parsed.shapes
				} catch {
					// fall through to raw records
				}
			}

			return {
				content: [{ type: 'text', text: lines.join('\n') }],
				structuredContent: {
					canvasId,
					seq: state.seq,
					parentCanvasId: state.parentCanvasId,
					shapes: contextShapes ?? shapes,
				},
			}
		}
	)
}
