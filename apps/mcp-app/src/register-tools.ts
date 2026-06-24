import { registerAppResource, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult, ReadResourceResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { CANVAS_RESOURCE_URI } from './shared/types'
import type { RegisterToolsOptions, ServerDeps } from './shared/types'
import { errorResponse, parseTlShapes } from './shared/utils'
import { registerExecTool } from './tools/exec'
import { registerSearchTool } from './tools/search'

/**
 * Shared tool/resource registration logic for the MCP worker runtime.
 *
 * Tools:
 * - search: Query the Editor API spec (server-side)
 * - exec: Execute JS against the live editor in the widget
 * - read_checkpoint: Read checkpoint data (app-only)
 * - save_checkpoint: Save checkpoint data (app-only)
 * - tldraw-canvas: Interactive canvas widget resource
 */

// --- Helpers ---

function injectBootstrapData(html: string, bootstrap: Record<string, unknown>): string {
	const toBase64 =
		typeof Buffer !== 'undefined' ? (s: string) => Buffer.from(s).toString('base64') : btoa
	const encoded = toBase64(JSON.stringify(bootstrap))
	const bootstrapScript = `<script>window.__TLDRAW_BOOTSTRAP__=JSON.parse(atob("${encoded}"))</script>`
	const lastIdx = html.lastIndexOf('</head>')
	if (lastIdx === -1) return html
	return html.slice(0, lastIdx) + bootstrapScript + html.slice(lastIdx)
}

function parseArrayJson(json: string, fieldName: string): unknown[] {
	const parsed = JSON.parse(json)
	if (!Array.isArray(parsed)) {
		throw new Error(
			`${fieldName} must be a JSON array string. Build an array first, then pass JSON.stringify(array).`
		)
	}
	return parsed
}

async function getWidgetDomain(
	hostName: string | undefined,
	isDev: boolean,
	workerOrigin?: string
): Promise<string | undefined> {
	if (isDev) return undefined
	if (hostName === 'chatgpt') return 'https://tldraw.com'
	if (hostName === 'claude' && workerOrigin) {
		const mcpUrl = new URL('/mcp', workerOrigin).toString()
		const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(mcpUrl))
		const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0'))
			.join('')
			.slice(0, 32)
		return `${hash}.claudemcpcontent.com`
	}
	return undefined
}

// --- Registration ---

export function registerTools(
	server: McpServer,
	deps: ServerDeps,
	opts: RegisterToolsOptions
): void {
	const log = opts.log ?? ((...args: unknown[]) => console.error(...args))
	const analytics = opts.analytics

	// --- search (server-side spec query) ---

	registerSearchTool(server, {
		analytics,
		log,
		loader: opts.searchWorkerLoader,
		loadSpec: deps.loadEditorApiSpec,
	})

	// --- exec (client-side code execution) ---

	let currentExecCanvasId: string | null = null

	registerExecTool(server, {
		analytics,
		log,
		pendingRequests: opts.pendingRequests,
		setCurrentExecCanvasId: (id) => {
			currentExecCanvasId = id
		},
	})

	// --- _exec_callback (app-only: widget resolves pending exec via callServerTool) ---

	const execCallbackSchema = z.object({
		channel: z.string(),
		result: z
			.object({
				success: z.boolean(),
				result: z.unknown().optional(),
				error: z.string().optional(),
			})
			.optional(),
		error: z.string().optional(),
	})

	server.registerTool(
		'_exec_callback',
		{
			title: 'Exec Callback',
			description: 'App-only: widget calls this to resolve a pending exec request.',
			inputSchema: execCallbackSchema,
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: false,
				openWorldHint: false,
			},
			_meta: { ui: { visibility: ['app'] } },
		},
		async ({
			channel,
			result,
			error,
		}: z.infer<typeof execCallbackSchema>): Promise<CallToolResult> => {
			const handled = error
				? opts.pendingRequests.reject(channel, error)
				: opts.pendingRequests.resolve(channel, result)

			if (!handled) {
				log(`[tldraw-mcp] Ignoring exec callback for non-pending channel "${channel}"`)
				return { content: [{ type: 'text', text: JSON.stringify({ ok: false }) }] }
			}

			const canvasId = currentExecCanvasId
			currentExecCanvasId = null
			return { content: [{ type: 'text', text: JSON.stringify({ ok: true, canvasId }) }] }
		}
	)

	// --- _get_canvas_state (app-only: widget fetches fork data by canvasId) ---

	server.registerTool(
		'_get_canvas_state',
		{
			title: 'Get Canvas State',
			description: 'App-only: get the latest checkpoint for a canvas by its canvasId.',
			inputSchema: z.object({ canvasId: z.string().min(1) }),
			annotations: {
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false,
			},
			_meta: { ui: { visibility: ['app'] } },
		},
		async ({ canvasId }: { canvasId: string }): Promise<CallToolResult> => {
			const checkpointId = deps.getCanvasCheckpointId(canvasId)
			if (!checkpointId) {
				return {
					content: [
						{ type: 'text', text: JSON.stringify({ shapes: [], assets: [], bindings: [] }) },
					],
				}
			}
			const checkpoint = deps.loadCheckpoint(checkpointId)
			if (!checkpoint) {
				return {
					content: [
						{ type: 'text', text: JSON.stringify({ shapes: [], assets: [], bindings: [] }) },
					],
				}
			}
			const shapes = parseTlShapes(checkpoint.shapes)
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							checkpointId,
							shapes,
							assets: checkpoint.assets,
							bindings: checkpoint.bindings,
						}),
					},
				],
			}
		}
	)

	// --- read_checkpoint (app-only) ---

	server.registerTool(
		'read_checkpoint',
		{
			title: 'Read Checkpoint',
			description: 'App-only: read shapes from a checkpoint by ID.',
			inputSchema: z.object({ checkpointId: z.string().min(1) }),
			annotations: {
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false,
			},
			_meta: { ui: { visibility: ['app'] } },
		},
		async ({ checkpointId }: { checkpointId: string }): Promise<CallToolResult> => {
			const checkpoint = deps.loadCheckpoint(checkpointId)
			if (!checkpoint) {
				return {
					content: [{ type: 'text', text: 'Not found.' }],
					structuredContent: {
						sessionId: deps.getSessionId(),
						shapes: [],
						assets: [],
						bindings: [],
					},
				}
			}

			const shapes = parseTlShapes(checkpoint.shapes)
			const assets = checkpoint.assets
			const bindings = checkpoint.bindings

			return {
				content: [{ type: 'text', text: `${shapes.length} shape(s), ${assets.length} asset(s).` }],
				structuredContent: {
					sessionId: deps.getSessionId(),
					shapes,
					assets,
					bindings,
				},
			}
		}
	)

	// --- save_checkpoint (app-only) ---

	server.registerTool(
		'save_checkpoint',
		{
			title: 'Save Checkpoint',
			description:
				'App-only: save shapes to a checkpoint (from user edits). shapesJson and assetsJson must be JSON array strings.',
			inputSchema: z.object({
				checkpointId: z.string().min(1),
				shapesJson: z.string(),
				assetsJson: z.string().optional(),
				bindingsJson: z.string().optional(),
				canvasId: z.string().optional(),
			}),
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: false,
				openWorldHint: false,
			},
			_meta: { ui: { visibility: ['app'] } },
		},
		async ({
			checkpointId,
			shapesJson,
			assetsJson,
			bindingsJson,
			canvasId,
		}: {
			checkpointId: string
			shapesJson: string
			assetsJson?: string
			bindingsJson?: string
			canvasId?: string
		}): Promise<CallToolResult> => {
			try {
				log(
					`[tldraw-mcp] save_checkpoint called: checkpointId=${checkpointId}, canvasId=${canvasId ?? 'none'}, prev activeCheckpointId=${deps.getActiveCheckpointId()}`
				)
				const raw = parseArrayJson(shapesJson, 'shapesJson')
				const shapes = parseTlShapes(raw)
				const assets = assetsJson ? parseArrayJson(assetsJson, 'assetsJson') : []
				const bindings = bindingsJson ? parseArrayJson(bindingsJson, 'bindingsJson') : []
				deps.saveCheckpoint(checkpointId, shapes, assets, bindings)
				deps.setActiveCheckpointId(checkpointId)
				if (canvasId) {
					deps.setCanvasCheckpointId(canvasId, checkpointId)
				}
				log(
					`[tldraw-mcp] save_checkpoint done: activeCheckpointId=${deps.getActiveCheckpointId()}, canvasId=${canvasId ?? 'none'}, shapes=${shapes.length}, assets=${assets.length}`
				)
				return {
					content: [
						{ type: 'text', text: `Saved ${shapes.length} shape(s), ${assets.length} asset(s).` },
					],
					structuredContent: {
						checkpointId,
						sessionId: deps.getSessionId(),
						shapesCount: shapes.length,
						assetsCount: assets.length,
					},
				}
			} catch (err) {
				return errorResponse('save_checkpoint', err)
			}
		}
	)

	// --- canvas resource ---

	registerAppResource(
		server,
		'tldraw-canvas',
		CANVAS_RESOURCE_URI,
		{
			title: 'tldraw Canvas',
			description: 'Interactive tldraw canvas.',
			mimeType: RESOURCE_MIME_TYPE,
		},
		async (): Promise<ReadResourceResult> => {
			analytics?.writeDataPoint({
				blobs: ['resource_called', 'tldraw-canvas'],
			})
			let html = await deps.loadWidgetHtml()

			const sid = deps.getSessionId()
			const hostName = opts.getClientHostName()

			const bootstrap: Record<string, unknown> = {
				sessionId: sid,
				isDev: opts.isDev,
				workerOrigin: opts.workerOrigin,
				mcpSessionId: deps.getMcpSessionId(),
				methodMap: await deps.loadMethodMap(),
			}

			html = injectBootstrapData(html, bootstrap)

			const domain = await getWidgetDomain(hostName, opts.isDev, opts.workerOrigin)

			log(`[tldraw-mcp] Serving resource to "${hostName}" with domain: ${domain}`)

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
										...(opts.extraResourceDomains ?? []),
										'blob:',
									],
									connectDomains: opts.extraConnectDomains ?? [],
								},
								permissions: { clipboardWrite: {} },
								...(domain ? { domain } : {}),
							},
						},
					},
				],
			}
		}
	)
}
