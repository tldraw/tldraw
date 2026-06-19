import { registerAppResource, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult, ReadResourceResult } from '@modelcontextprotocol/sdk/types.js'
import { getAgentByName } from 'agents'
import { z } from 'zod'
import type { PendingRequests } from './shared/pending-requests'
import { CANVAS_RESOURCE_URI, ROUTING_DO_NAME_ARG } from './shared/types'
import type {
	ForwardOp,
	ForwardResult,
	ForwardTarget,
	RegisterToolsOptions,
	ServerDeps,
} from './shared/types'
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

// --- App-only operation cores ---
//
// These run against the *canonical* DO — the one holding this session's pending
// exec promise and SQLite state. They are invoked either directly (the widget's
// call landed on the canonical DO) or via `handleForwardedCall` RPC (it landed
// elsewhere and was forwarded here). They deliberately return plain data, not
// `CallToolResult` shapes, so the local and forwarded paths produce identical
// tool responses.

export interface AppToolContext {
	deps: ServerDeps
	pendingRequests: PendingRequests
	execChannelCanvasIds: Map<string, string>
	log(...args: unknown[]): void
}

export function runExecCallback(
	ctx: AppToolContext,
	payload: {
		channel: string
		result?: { success: boolean; result?: unknown; error?: string }
		error?: string
	}
): { handled: boolean; canvasId: string | null } {
	const { channel, result, error } = payload
	const resolve = (ch: string) =>
		error ? ctx.pendingRequests.reject(ch, error) : ctx.pendingRequests.resolve(ch, result)

	let resolveChannel = channel
	let handled = resolve(channel)

	if (!handled) {
		// Streaming edge: the widget may derive its channel from tool args whose
		// canvasId hasn't fully streamed yet, producing a channel that differs from
		// the server's (e.g. 'exec' vs 'exec:<id>'). If exactly one exec is pending,
		// resolve it — there's no ambiguity with a single in-flight exec. With two or
		// more pending, the exact match above is required to avoid cross-resolving.
		const execChannels = ctx.pendingRequests
			.channels()
			.filter((c) => c === 'exec' || c.startsWith('exec:'))
		if (execChannels.length === 1) {
			resolveChannel = execChannels[0]
			handled = resolve(resolveChannel)
		}
	}

	const canvasId = ctx.execChannelCanvasIds.get(resolveChannel) ?? null
	ctx.execChannelCanvasIds.delete(resolveChannel)
	return { handled, canvasId }
}

export function runGetCanvasState(
	ctx: AppToolContext,
	payload: { canvasId: string }
): { checkpointId?: string; shapes: unknown[]; assets: unknown[]; bindings: unknown[] } {
	const checkpointId = ctx.deps.getCanvasCheckpointId(payload.canvasId)
	if (!checkpointId) return { shapes: [], assets: [], bindings: [] }
	const checkpoint = ctx.deps.loadCheckpoint(checkpointId)
	if (!checkpoint) return { shapes: [], assets: [], bindings: [] }
	return {
		checkpointId,
		shapes: parseTlShapes(checkpoint.shapes),
		assets: checkpoint.assets,
		bindings: checkpoint.bindings,
	}
}

export function runReadCheckpoint(
	ctx: AppToolContext,
	payload: { checkpointId: string }
): {
	found: boolean
	sessionId: string
	shapes: unknown[]
	assets: unknown[]
	bindings: unknown[]
} {
	const sessionId = ctx.deps.getSessionId()
	const checkpoint = ctx.deps.loadCheckpoint(payload.checkpointId)
	if (!checkpoint) return { found: false, sessionId, shapes: [], assets: [], bindings: [] }
	return {
		found: true,
		sessionId,
		shapes: parseTlShapes(checkpoint.shapes),
		assets: checkpoint.assets,
		bindings: checkpoint.bindings,
	}
}

export function runSaveCheckpoint(
	ctx: AppToolContext,
	payload: {
		checkpointId: string
		shapesJson: string
		assetsJson?: string
		bindingsJson?: string
		canvasId?: string
	}
): { checkpointId: string; sessionId: string; shapesCount: number; assetsCount: number } {
	const raw = parseArrayJson(payload.shapesJson, 'shapesJson')
	const shapes = parseTlShapes(raw)
	const assets = payload.assetsJson ? parseArrayJson(payload.assetsJson, 'assetsJson') : []
	const bindings = payload.bindingsJson ? parseArrayJson(payload.bindingsJson, 'bindingsJson') : []
	ctx.deps.saveCheckpoint(payload.checkpointId, shapes, assets, bindings)
	ctx.deps.setActiveCheckpointId(payload.checkpointId)
	if (payload.canvasId) ctx.deps.setCanvasCheckpointId(payload.canvasId, payload.checkpointId)
	return {
		checkpointId: payload.checkpointId,
		sessionId: ctx.deps.getSessionId(),
		shapesCount: shapes.length,
		assetsCount: assets.length,
	}
}

/**
 * Run a forwarded app-only operation against the local (canonical) DO state.
 * Called by the worker's `handleForwardedCall` RPC method. This is the bottom of
 * a *single* forwarding hop — it never forwards again — and never throws:
 * business errors come back as `{ ok: false, data: { error } }`.
 */
export function dispatchForwardedCall(
	ctx: AppToolContext,
	op: ForwardOp,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	payload: any
): ForwardResult {
	try {
		switch (op) {
			case 'exec_callback': {
				const { handled, canvasId } = runExecCallback(ctx, payload)
				return { ok: handled, data: { canvasId } }
			}
			case 'get_canvas_state':
				return { ok: true, data: runGetCanvasState(ctx, payload) }
			case 'read_checkpoint':
				return { ok: true, data: runReadCheckpoint(ctx, payload) }
			case 'save_checkpoint':
				return { ok: true, data: runSaveCheckpoint(ctx, payload) }
		}
	} catch (err) {
		return { ok: false, data: { error: err instanceof Error ? err.message : String(err) } }
	}
}

/**
 * Decide whether to handle an app-only call locally or forward it to the
 * canonical session DO. Forwards only when we have a DO namespace, the widget
 * supplied a routing key (`__doName`), and that key differs from this DO's own
 * name. Any forward failure (e.g. a transient RPC error) degrades to local
 * handling so it never crashes the call. One hop only — the canonical DO runs
 * the operation locally and never re-forwards.
 */
async function routeOrLocal(
	opts: RegisterToolsOptions,
	deps: ServerDeps,
	doName: string | undefined,
	op: ForwardOp,
	payload: unknown,
	runLocal: () => ForwardResult
): Promise<ForwardResult> {
	const myName = deps.getDoName()
	if (opts.mcpObject && doName && doName !== myName) {
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const stub = await getAgentByName(opts.mcpObject as any, doName)
			return await (stub as unknown as ForwardTarget).handleForwardedCall(op, payload)
		} catch (err) {
			;(opts.log ?? console.error)(
				`[tldraw-mcp] forward ${op} -> ${doName} failed (${err}); handling locally`
			)
		}
	}
	return runLocal()
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

	// Shared context for the app-only operation cores. It is also what the
	// canonical DO uses when running a *forwarded* call, so every app-only tool
	// resolves against this exact session's pending requests + SQLite state.
	const appCtx: AppToolContext = {
		deps,
		pendingRequests: opts.pendingRequests,
		execChannelCanvasIds: opts.execChannelCanvasIds,
		log,
	}

	// --- exec (client-side code execution) ---

	registerExecTool(server, {
		analytics,
		log,
		pendingRequests: opts.pendingRequests,
		execChannelCanvasIds: opts.execChannelCanvasIds,
		getDoName: () => deps.getDoName(),
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
		// Canonical DO name the widget echoes so this callback reaches the DO that
		// holds the pending exec promise, even if the host routed it elsewhere.
		[ROUTING_DO_NAME_ARG]: z.string().optional(),
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
		async (args: z.infer<typeof execCallbackSchema>): Promise<CallToolResult> => {
			const { channel, result, error } = args
			const doName = args[ROUTING_DO_NAME_ARG]
			const { ok, data } = await routeOrLocal(
				opts,
				deps,
				doName,
				'exec_callback',
				{ channel, result, error },
				() => {
					const r = runExecCallback(appCtx, { channel, result, error })
					return { ok: r.handled, data: { canvasId: r.canvasId } }
				}
			)

			if (!ok) {
				log(`[tldraw-mcp] Ignoring exec callback for non-pending channel "${channel}"`)
				return { content: [{ type: 'text', text: JSON.stringify({ ok: false }) }] }
			}

			const canvasId = (data as { canvasId?: string | null } | undefined)?.canvasId ?? null
			return { content: [{ type: 'text', text: JSON.stringify({ ok: true, canvasId }) }] }
		}
	)

	// --- _get_canvas_state (app-only: widget fetches fork data by canvasId) ---

	const getCanvasStateSchema = z.object({
		canvasId: z.string().min(1),
		[ROUTING_DO_NAME_ARG]: z.string().optional(),
	})

	server.registerTool(
		'_get_canvas_state',
		{
			title: 'Get Canvas State',
			description: 'App-only: get the latest checkpoint for a canvas by its canvasId.',
			inputSchema: getCanvasStateSchema,
			annotations: {
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false,
			},
			_meta: { ui: { visibility: ['app'] } },
		},
		async (args: z.infer<typeof getCanvasStateSchema>): Promise<CallToolResult> => {
			const doName = args[ROUTING_DO_NAME_ARG]
			const { ok, data } = await routeOrLocal(
				opts,
				deps,
				doName,
				'get_canvas_state',
				{ canvasId: args.canvasId },
				() => ({ ok: true, data: runGetCanvasState(appCtx, { canvasId: args.canvasId }) })
			)
			const payload = ok && data ? data : { shapes: [], assets: [], bindings: [] }
			return {
				content: [{ type: 'text', text: JSON.stringify(payload) }],
			}
		}
	)

	// --- read_checkpoint (app-only) ---

	const readCheckpointSchema = z.object({
		checkpointId: z.string().min(1),
		[ROUTING_DO_NAME_ARG]: z.string().optional(),
	})

	server.registerTool(
		'read_checkpoint',
		{
			title: 'Read Checkpoint',
			description: 'App-only: read shapes from a checkpoint by ID.',
			inputSchema: readCheckpointSchema,
			annotations: {
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false,
			},
			_meta: { ui: { visibility: ['app'] } },
		},
		async (args: z.infer<typeof readCheckpointSchema>): Promise<CallToolResult> => {
			const doName = args[ROUTING_DO_NAME_ARG]
			const { ok, data } = await routeOrLocal(
				opts,
				deps,
				doName,
				'read_checkpoint',
				{ checkpointId: args.checkpointId },
				() => ({ ok: true, data: runReadCheckpoint(appCtx, { checkpointId: args.checkpointId }) })
			)
			const d = (
				ok && data
					? data
					: { found: false, sessionId: deps.getSessionId(), shapes: [], assets: [], bindings: [] }
			) as ReturnType<typeof runReadCheckpoint>

			return {
				content: [
					{
						type: 'text',
						text: d.found
							? `${d.shapes.length} shape(s), ${d.assets.length} asset(s).`
							: 'Not found.',
					},
				],
				structuredContent: {
					sessionId: d.sessionId,
					shapes: d.shapes,
					assets: d.assets,
					bindings: d.bindings,
				},
			}
		}
	)

	// --- save_checkpoint (app-only) ---

	const saveCheckpointSchema = z.object({
		checkpointId: z.string().min(1),
		shapesJson: z.string(),
		assetsJson: z.string().optional(),
		bindingsJson: z.string().optional(),
		canvasId: z.string().optional(),
		[ROUTING_DO_NAME_ARG]: z.string().optional(),
	})

	server.registerTool(
		'save_checkpoint',
		{
			title: 'Save Checkpoint',
			description:
				'App-only: save shapes to a checkpoint (from user edits). shapesJson and assetsJson must be JSON array strings.',
			inputSchema: saveCheckpointSchema,
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: false,
				openWorldHint: false,
			},
			_meta: { ui: { visibility: ['app'] } },
		},
		async (args: z.infer<typeof saveCheckpointSchema>): Promise<CallToolResult> => {
			const doName = args[ROUTING_DO_NAME_ARG]
			const { checkpointId, shapesJson, assetsJson, bindingsJson, canvasId } = args
			try {
				log(
					`[tldraw-mcp] save_checkpoint called: checkpointId=${checkpointId}, canvasId=${canvasId ?? 'none'}`
				)
				const { ok, data } = await routeOrLocal(
					opts,
					deps,
					doName,
					'save_checkpoint',
					{ checkpointId, shapesJson, assetsJson, bindingsJson, canvasId },
					() => ({
						ok: true,
						data: runSaveCheckpoint(appCtx, {
							checkpointId,
							shapesJson,
							assetsJson,
							bindingsJson,
							canvasId,
						}),
					})
				)
				if (!ok) {
					const message = (data as { error?: string } | undefined)?.error ?? 'save failed'
					return errorResponse('save_checkpoint', new Error(message))
				}
				const d = data as ReturnType<typeof runSaveCheckpoint>
				log(
					`[tldraw-mcp] save_checkpoint done: checkpointId=${d.checkpointId}, canvasId=${canvasId ?? 'none'}, shapes=${d.shapesCount}, assets=${d.assetsCount}`
				)
				return {
					content: [
						{
							type: 'text',
							text: `Saved ${d.shapesCount} shape(s), ${d.assetsCount} asset(s).`,
						},
					],
					structuredContent: d,
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
				// Full canonical DO name (e.g. `streamable-http:<id>`). The widget echoes
				// this back on every app-only call so they reach this exact DO.
				doName: deps.getDoName(),
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
