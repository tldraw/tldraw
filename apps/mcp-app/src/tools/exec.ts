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
			description:
				'Execute JavaScript code on the tldraw canvas. The code runs in the widget with access to the live `editor` instance (tldraw Editor) and helper functions: toRichText, renderPlaintextFromRichText, createShapeId, createBindingId, Box, Vec, Mat, clamp, degreesToRadians, radiansToDegrees, getDefaultColorTheme, getArrowBindings, fitFrameToContent, createArrowBetweenShapes. Use the `search` tool first to discover available Editor methods.',
			inputSchema: z.object({
				code: z
					.string()
					.describe(
						'JavaScript code to execute. Has access to `editor` (tldraw Editor instance) and helper functions. Can be async.'
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
