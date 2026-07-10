import { registerAppResource, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server'
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult, ReadResourceResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { CANVAS_RESOURCE_URI } from './shared/types'
import type { ExecJobResult, RegisterToolsOptions, ServerDeps } from './shared/types'
import { errorResponse, parseTlShapes } from './shared/utils'
import { registerExecTool } from './tools/exec'
import { registerGetCanvasTool } from './tools/get-canvas'
import { registerSearchTool } from './tools/search'

/**
 * Shared tool/resource registration logic for the MCP worker runtime.
 *
 * Model-visible tools:
 * - search: query the Editor API spec (server-side)
 * - exec: run JS against a canvas — every exec forks a new canvas
 * - get_canvas: read any canvas's authoritative state + exec job status
 *
 * App-only transport (the widget's host-proxied channel; all canvasId-keyed,
 * so host session routing is irrelevant by construction):
 * - _pull_job: widget claims its invocation's queued exec job
 * - _submit_result: widget reports the exec result + final canvas state
 * - _push_user_edit: widget persists the user's manual edits
 *
 * Legacy live shims (cached old widget builds keep working for months):
 * - _get_canvas_state, save_checkpoint, _exec_callback
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

	// --- exec (fork-by-default code execution) ---

	registerExecTool(server, deps, {
		analytics,
		log,
		getClientHostName: () => opts.getClientHostName(),
	})

	// --- get_canvas (authoritative read) ---

	registerGetCanvasTool(server, deps)

	// --- _pull_job (app-only: widget claims its invocation's exec job) ---

	server.registerTool(
		'_pull_job',
		{
			title: 'Pull Exec Job',
			description: 'App-only: widget pulls the queued exec job for its invocation.',
			inputSchema: z.object({
				canvasId: z.string().min(1),
				codeHash: z.string().min(1),
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
			canvasId,
			codeHash,
		}: {
			canvasId: string
			codeHash: string
		}): Promise<CallToolResult> => {
			const job = await deps.getCanvasStub(canvasId).pullExecJob({ codeHash })
			log(
				`[tldraw-mcp] _pull_job: canvasId=${canvasId}, codeHash=${codeHash}, found=${Boolean(job)}${job ? `, execId=${job.execId}, target=${job.targetCanvasId}` : ''}`
			)
			const payload = { job: job ?? null }
			return {
				content: [{ type: 'text', text: JSON.stringify(payload) }],
				structuredContent: payload,
			}
		}
	)

	// --- _submit_result (app-only: widget reports exec outcome + final state) ---

	const submitResultSchema = z.object({
		/** The canvas the job was pulled from (base canvas, or self for new). */
		canvasId: z.string().min(1),
		execId: z.string().min(1),
		result: z.object({
			success: z.boolean(),
			result: z.unknown().optional(),
			error: z.string().optional(),
		}),
		shapesJson: z.string().optional(),
		assetsJson: z.string().optional(),
		bindingsJson: z.string().optional(),
		contextJson: z.string().optional(),
		widgetVersion: z.string().optional(),
	})

	server.registerTool(
		'_submit_result',
		{
			title: 'Submit Exec Result',
			description: 'App-only: widget resolves an exec job with its result and final canvas state.',
			inputSchema: submitResultSchema,
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: false,
				openWorldHint: false,
			},
			_meta: { ui: { visibility: ['app'] } },
		},
		async (args: z.infer<typeof submitResultSchema>): Promise<CallToolResult> => {
			try {
				const outcome = await deps.getCanvasStub(args.canvasId).completeExecJob({
					execId: args.execId,
					result: args.result as ExecJobResult,
					shapesJson: args.shapesJson,
					assetsJson: args.assetsJson,
					bindingsJson: args.bindingsJson,
					contextJson: args.contextJson,
				})
				log(
					`[tldraw-mcp] _submit_result: canvasId=${args.canvasId}, execId=${args.execId}, success=${args.result.success}, handled=${outcome.handled}, widgetVersion=${args.widgetVersion ?? 'unknown'}`
				)
				return { content: [{ type: 'text', text: JSON.stringify({ ok: outcome.handled }) }] }
			} catch (err) {
				return errorResponse('_submit_result', err)
			}
		}
	)

	// --- _push_user_edit (app-only: persist the user's manual edits) ---

	const pushUserEditSchema = z.object({
		canvasId: z.string().min(1),
		shapesJson: z.string(),
		assetsJson: z.string().optional(),
		bindingsJson: z.string().optional(),
		contextJson: z.string().optional(),
		widgetVersion: z.string().optional(),
	})

	server.registerTool(
		'_push_user_edit',
		{
			title: 'Push User Edit',
			description: "App-only: widget persists the user's manual canvas edits.",
			inputSchema: pushUserEditSchema,
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: false,
				openWorldHint: false,
			},
			_meta: { ui: { visibility: ['app'] } },
		},
		async (args: z.infer<typeof pushUserEditSchema>): Promise<CallToolResult> => {
			try {
				parseTlShapes(parseArrayJson(args.shapesJson, 'shapesJson'))
				const { seq } = await deps.getCanvasStub(args.canvasId).putCanvasState({
					shapesJson: args.shapesJson,
					assetsJson: args.assetsJson,
					bindingsJson: args.bindingsJson,
					contextJson: args.contextJson,
					source: 'user',
				})
				return { content: [{ type: 'text', text: JSON.stringify({ ok: true, seq }) }] }
			} catch (err) {
				return errorResponse('_push_user_edit', err)
			}
		}
	)

	// --- _get_canvas_state (app-only: state fetch; also a legacy shim) ---
	// New widgets use this to render a canvas on remount (job already done).
	// Old cached widgets call it to hydrate before executing. Both get the
	// canvas DO's authoritative state, with the pre-redesign session-keyed
	// checkpoint tables as a lazy fallback for old canvases.

	server.registerTool(
		'_get_canvas_state',
		{
			title: 'Get Canvas State',
			description: 'App-only: get the latest state for a canvas by its canvasId.',
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
			const state = await deps.getCanvasStub(canvasId).getCanvasState()
			if (state) {
				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify({
								shapes: JSON.parse(state.shapesJson),
								assets: JSON.parse(state.assetsJson),
								bindings: JSON.parse(state.bindingsJson),
								seq: state.seq,
							}),
						},
					],
				}
			}

			// Legacy fallback: session-keyed checkpoint tables.
			const checkpointId = deps.getCanvasCheckpointId(canvasId)
			const checkpoint = checkpointId ? deps.loadCheckpoint(checkpointId) : null
			if (!checkpoint) {
				return {
					content: [
						{ type: 'text', text: JSON.stringify({ shapes: [], assets: [], bindings: [] }) },
					],
				}
			}
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							checkpointId,
							shapes: parseTlShapes(checkpoint.shapes),
							assets: checkpoint.assets,
							bindings: checkpoint.bindings,
						}),
					},
				],
			}
		}
	)

	// --- save_checkpoint (legacy live shim) ---
	// Old cached widgets save their post-exec and user-edit state here,
	// addressed at whatever canvasId they currently believe they are showing.
	// When that canvas has a recent exec job, the save is the executed state of
	// that job's FORK — redirect it to the target so fork semantics hold for
	// old widget builds too.

	server.registerTool(
		'save_checkpoint',
		{
			title: 'Save Checkpoint',
			description:
				'App-only: save shapes to a canvas (from user edits). shapesJson and assetsJson must be JSON array strings.',
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
				const shapes = parseTlShapes(parseArrayJson(shapesJson, 'shapesJson'))
				if (!canvasId) {
					// A legacy widget that never learned a canvasId has nowhere
					// durable to save; acknowledge without persisting (matches the
					// old session-keyed behavior, which was already unreachable from
					// other sessions).
					return {
						content: [{ type: 'text', text: `Saved ${shapes.length} shape(s).` }],
						structuredContent: { sessionId: deps.getSessionId(), shapesCount: shapes.length },
					}
				}

				const stub = deps.getCanvasStub(canvasId)
				const recent = await stub.getRecentJobTarget()
				if (recent) {
					const completed = await stub.completeExecJob({
						execId: recent.execId,
						result: { success: true },
						shapesJson,
						assetsJson,
						bindingsJson,
					})
					if (completed.handled) {
						log(
							`[tldraw-mcp] save_checkpoint (legacy) redirected to fork target: base=${canvasId}, target=${recent.targetCanvasId}`
						)
						return {
							content: [{ type: 'text', text: `Saved ${shapes.length} shape(s).` }],
							structuredContent: { sessionId: deps.getSessionId(), shapesCount: shapes.length },
						}
					}
					// Job already settled: this is a follow-up save (e.g. user edits
					// after exec) — persist onto the fork target.
					await deps.getCanvasStub(recent.targetCanvasId).putCanvasState({
						shapesJson,
						assetsJson,
						bindingsJson,
						source: 'legacy',
					})
					return {
						content: [{ type: 'text', text: `Saved ${shapes.length} shape(s).` }],
						structuredContent: { sessionId: deps.getSessionId(), shapesCount: shapes.length },
					}
				}

				await stub.putCanvasState({ shapesJson, assetsJson, bindingsJson, source: 'legacy' })
				return {
					content: [{ type: 'text', text: `Saved ${shapes.length} shape(s).` }],
					structuredContent: { sessionId: deps.getSessionId(), shapesCount: shapes.length },
				}
			} catch (err) {
				return errorResponse('save_checkpoint', err)
			}
		}
	)

	// --- _exec_callback (legacy live shim) ---
	// Old cached widgets resolve exec results here, keyed by the legacy
	// sha256(canvasId+code) execKey. Route by the canvasId in the payload to
	// the base canvas DO and complete the matching job; the widget's follow-up
	// save_checkpoint delivers the state.

	const execCallbackSchema = z.object({
		channel: z.string(),
		execKey: z.string().optional(),
		result: z
			.object({
				success: z.boolean(),
				result: z.unknown().optional(),
				error: z.string().optional(),
				canvasId: z.string().optional(),
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
			execKey,
			result,
			error,
		}: z.infer<typeof execCallbackSchema>): Promise<CallToolResult> => {
			const canvasId = result?.canvasId
			if (!execKey || !canvasId) {
				// New-canvas legacy callbacks carry no canvasId and are unroutable;
				// the widget's save_checkpoint (after it learns the id from the
				// tool result) delivers the state instead.
				return { content: [{ type: 'text', text: JSON.stringify({ ok: false }) }] }
			}
			const payload: ExecJobResult = error
				? { success: false, error }
				: { success: result?.success ?? false, result: result?.result, error: result?.error }
			const outcome = await deps
				.getCanvasStub(canvasId)
				.completeExecJobByLegacyKey({ legacyExecKey: execKey, result: payload })
			log(
				`[tldraw-mcp] _exec_callback (legacy): canvasId=${canvasId}, execKey=${execKey}, handled=${outcome.handled}`
			)
			return { content: [{ type: 'text', text: JSON.stringify({ ok: outcome.handled }) }] }
		}
	)

	// --- canvas resource ---

	const readCanvasResource = async (uri: string): Promise<ReadResourceResult> => {
		analytics?.writeDataPoint({
			blobs: ['resource_called', 'tldraw-canvas'],
		})
		let html = await deps.loadWidgetHtml()

		const hostName = opts.getClientHostName()

		// Deploy-stable data only: hosts cache this HTML durably, so nothing
		// per-session or per-invocation may be baked in.
		const bootstrap: Record<string, unknown> = {
			isDev: opts.isDev,
			workerOrigin: opts.workerOrigin,
			methodMap: await deps.loadMethodMap(),
		}

		html = injectBootstrapData(html, bootstrap)

		const domain = await getWidgetDomain(hostName, opts.isDev, opts.workerOrigin)

		log(`[tldraw-mcp] Serving resource "${uri}" to "${hostName}" with domain: ${domain}`)

		return {
			contents: [
				{
					uri,
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
								connectDomains: ['https://cdn.tldraw.com', ...(opts.extraConnectDomains ?? [])],
							},
							permissions: { clipboardWrite: {} },
							...(domain ? { domain } : {}),
						},
					},
				},
			],
		}
	}

	registerAppResource(
		server,
		'tldraw-canvas',
		CANVAS_RESOURCE_URI,
		{
			title: 'tldraw Canvas',
			description: 'Interactive tldraw canvas.',
			mimeType: RESOURCE_MIME_TYPE,
		},
		async (): Promise<ReadResourceResult> => readCanvasResource(CANVAS_RESOURCE_URI)
	)

	// Hosts cache the widget resource URI durably
	// (across connector re-adds and new chats), so a host may keep requesting a
	// URI variant this server no longer advertises. Serve the widget for any
	// ui://show-canvas/… URI instead of returning "resource not found" (-32602),
	// which breaks widget rendering.
	server.registerResource(
		'tldraw-canvas-compat',
		new ResourceTemplate('ui://show-canvas/{version}/mcp-app.html', { list: undefined }),
		{
			title: 'tldraw Canvas',
			description: 'Interactive tldraw canvas (cached-URI compatibility).',
			mimeType: RESOURCE_MIME_TYPE,
		},
		async (uri): Promise<ReadResourceResult> => readCanvasResource(uri.href)
	)
}
