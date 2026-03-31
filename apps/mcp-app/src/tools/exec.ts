import { registerAppTool } from '@modelcontextprotocol/ext-apps/server'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { CANVAS_RESOURCE_URI } from '../shared/types'

export function registerExecTool(
	server: McpServer,
	opts: { analytics?: AnalyticsEngineDataset; log(...args: unknown[]): void }
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
		async ({ code }: { code: string }): Promise<CallToolResult> => {
			opts.analytics?.writeDataPoint({
				blobs: ['tool_called', 'exec'],
			})
			opts.log('[tldraw-mcp] exec called')

			return {
				content: [{ type: 'text', text: 'Code executed on canvas.' }],
				structuredContent: {
					action: 'exec' as const,
					code,
				},
			}
		}
	)
}
