import { DEFAULT_THUMBNAIL_HEIGHT, DEFAULT_THUMBNAIL_WIDTH } from '@tldraw/dotcom-shared'
import { IRequest } from 'itty-router'
import {
	MCP_GLOBAL_BROWSER_RUN_RATE_LIMIT,
	MCP_PER_BOARD_RATE_LIMIT,
	MCP_PER_IP_RATE_LIMIT,
	MCP_RATE_LIMIT_WINDOW_MS,
} from '../../config'
import { Environment } from '../../types'
import { arrayBufferToBase64, base64ToArrayBuffer } from '../../utils/base64'
import { sha256 } from '../../utils/hash'
import {
	BOARD_EMPTY_MESSAGE,
	BOARD_INFO_TOOL_NAME,
	BOARD_NOT_FOUND_MESSAGE,
	CLUSTER_INFO_TOOL_NAME,
	CLUSTER_SCREENSHOT_TOOL_NAME,
	MCP_SERVER_INFO,
	MCP_SERVER_INSTRUCTIONS,
	PAGE_INFO_TOOL_NAME,
	PageSelector,
	ResolvedPageOk,
	ShapeMeasurement,
	ToolResult,
	describePageSelector,
	getBoardInfo,
	getClusterInfo,
	getPageInfo,
	getToolDefinitions,
	parseBoardInfoInput,
	parseClusterInfoInput,
	parseClusterScreenshotInput,
	parsePageInfoInput,
	pickClusterShapes,
	resolvePage,
	toolError,
	toolPageResult,
} from './boardTools'
import {
	ResolveThumbnailBoardResult,
	ResolvedThumbnailBoard,
	captureThumbnailScreenshot,
	loadBoardSnapshot,
	measurePageShapes,
	putThumbnailPng,
	resolveThumbnailBoard,
	writeScreenshotTelemetry,
} from './thumbnailRender'
import {
	browserRunDurationOf,
	classifyScreenshotFailure,
	describeThumbnailFailure,
	reportThumbnailError,
} from './thumbnailShared'

// What it takes to run the board tools on Cloudflare: board resolution against Postgres and R2,
// Browser Rendering, the `mcp/` PNG cache, rate limits, telemetry, and the HTTP shell around the
// JSON-RPC dispatch.
//
// The model-facing tools themselves live in boardTools.ts. That pure boundary lets the private eval
// harness serve the exact same tool descriptions, parsing, clustering, and errors from local board
// fixtures without needing a database or Browser Rendering.

// The two protocol revisions this server speaks, newest first, as `server/discover` reports them.
//
// 2026-07-28 is the *modern* era: no handshake and no session, every request carrying its own
// protocol version, and the routing-relevant body fields mirrored into HTTP headers. 2025-11-25 is
// the *legacy* era, which opens with an `initialize` handshake instead. We serve both for now.
//
// 2025-11-25 is the oldest version this server implements. a client asking for older versions
// will be met with this version.
const MCP_PROTOCOL_VERSION_MODERN = '2026-07-28'
const MCP_PROTOCOL_VERSION_LEGACY = '2025-11-25'
const SUPPORTED_PROTOCOL_VERSIONS = [MCP_PROTOCOL_VERSION_MODERN, MCP_PROTOCOL_VERSION_LEGACY]

type ProtocolEra = 'modern' | 'legacy'

// -32700/-32601/-32602 are plain JSON-RPC.
// -32020 and up are reserved by the MCP spec
const PARSE_ERROR = -32700
const METHOD_NOT_FOUND = -32601
const INVALID_PARAMS = -32602
const HEADER_MISMATCH = -32020
const UNSUPPORTED_PROTOCOL_VERSION = -32022

// `_meta` keys the modern era uses for per-request version and identity.
const META_PROTOCOL_VERSION = 'io.modelcontextprotocol/protocolVersion'
const META_SERVER_INFO = 'io.modelcontextprotocol/serverInfo'

// Modern `tools/list` is cacheable. This list is the same for every caller, so it's public — if the
// tool set ever varies by caller, `cacheScope` has to drop to 'private'.
const TOOLS_LIST_TTL_MS = 3_600_000
const TOOLS_LIST_CACHE_SCOPE = 'public'

// The MCP rate limit budgets themselves live in config.ts (MCP_PER_IP_RATE_LIMIT and friends), with
// the comment that maps each isolate-local fallback to its deployed Cloudflare binding. They are
// applied here rather than in the shared render core so a new surface built on those helpers cannot
// pick one up by accident.
const GLOBAL_BROWSER_RATE_LIMIT_KEY = 'global'
const RATE_LIMIT_FALLBACK = new Map<string, { count: number; resetAt: number }>()

async function isGlobalBrowserRunRateLimited(env: Environment): Promise<boolean> {
	return isRateLimited(env.MCP_SERVER_BROWSER_RATE_LIMITER, GLOBAL_BROWSER_RATE_LIMIT_KEY, {
		fallbackLimit: MCP_GLOBAL_BROWSER_RUN_RATE_LIMIT,
	})
}

async function isRateLimited(
	limiter: RateLimit | undefined,
	key: string,
	{ fallbackLimit }: { fallbackLimit: number }
): Promise<boolean> {
	// The mcp- prefix is load-bearing: it is what the deployed Cloudflare rate limit bindings have
	// counted against, so changing it resets every configured bucket.
	const rateLimitKey = `mcp-shared-board-screenshot:${key}`
	if (limiter) {
		const { success } = await limiter.limit({ key: rateLimitKey })
		return !success
	}

	// Isolate-local fallback for local dev and tests; deployments configure the Cloudflare rate
	// limit bindings in wrangler.toml.
	const now = Date.now()
	const existing = RATE_LIMIT_FALLBACK.get(rateLimitKey)
	if (!existing || existing.resetAt <= now) {
		RATE_LIMIT_FALLBACK.set(rateLimitKey, { count: 1, resetAt: now + MCP_RATE_LIMIT_WINDOW_MS })
		return false
	}
	existing.count++
	return existing.count > fallbackLimit
}

// The isolate-local fallback map is module state that persists across a test file's cases. Tests that
// exercise the MCP tools must reset it between cases, or accumulated counts (especially on the shared
// `global` key) would trip the low limits and rate-limit later cases' happy paths.
export function resetRateLimitFallbackForTests() {
	RATE_LIMIT_FALLBACK.clear()
}

type JsonRpcId = string | number | null

interface JsonRpcRequest {
	jsonrpc?: string
	id?: JsonRpcId
	method?: string
	params?: {
		name?: string
		arguments?: unknown
		/** Legacy `initialize` only: the version the client is asking to speak. */
		protocolVersion?: string
		/** Modern only: per-request version, client identity and capabilities. */
		_meta?: Record<string, unknown>
	}
}

// Runtime kill switch for the whole MCP server, read per request so flipping MCP_SCREENSHOT_ENABLED
// takes effect on the next request rather than the next build. An unset var means enabled, so
// environments that never configure it (previews, local dev, tests) keep working; a var that is set
// must say 'true', so a stray value disables rather than silently leaving the endpoint up.
export function isMcpScreenshotEnabled(env: Environment) {
	const value = env.MCP_SCREENSHOT_ENABLED?.trim().toLowerCase()
	return value === undefined || value === '' || value === 'true'
}

export async function sharedBoardScreenshotMcp(
	request: IRequest,
	env: Environment,
	ctx?: ExecutionContext
): Promise<Response> {
	// Checked before anything else, including the method check, so a disabled server looks like it
	// isn't there at all rather than like a route that exists but rejects everything.
	if (!isMcpScreenshotEnabled(env)) {
		return new Response('Not Found', { status: 404 })
	}

	// new MCP spec (2026-07-28 onwards) no longer allows get or delete requests
	if (request.method !== 'POST') {
		return new Response('MCP screenshot server expects POST', { status: 405 })
	}

	const rpcRequest = await readJsonRpcRequest(request)
	if (!rpcRequest) {
		return jsonRpcError(null, PARSE_ERROR, 'Parse error', { status: 400 })
	}

	// No id means a notification: acknowledged, never answered.
	if (rpcRequest.id === undefined) {
		return new Response(null, { status: 202 })
	}

	// `initialize` is legacy-only and carries the client's version in its params, not a header.
	if (rpcRequest.method === 'initialize') {
		return jsonRpcResult(rpcRequest.id, {
			// Answering with our legacy version regardless is how the handshake declines a version.
			protocolVersion: MCP_PROTOCOL_VERSION_LEGACY,
			capabilities: { tools: {} },
			serverInfo: MCP_SERVER_INFO,
			instructions: MCP_SERVER_INSTRUCTIONS,
		})
	}

	const requestedVersion = getRequestedProtocolVersion(request, rpcRequest)
	const era = getProtocolEra(requestedVersion)

	if (era === 'modern') {
		const mismatch = checkModernHeaders(request, rpcRequest)
		if (mismatch) return mismatch
	}

	// Answered under any version, including ones we don't serve — it's how a client finds one we share.
	if (rpcRequest.method === 'server/discover') {
		return jsonRpcResult(rpcRequest.id, {
			resultType: 'complete',
			supportedVersions: SUPPORTED_PROTOCOL_VERSIONS,
			capabilities: { tools: {} },
			instructions: MCP_SERVER_INSTRUCTIONS,
			ttlMs: TOOLS_LIST_TTL_MS,
			cacheScope: TOOLS_LIST_CACHE_SCOPE,
			_meta: { [META_SERVER_INFO]: MCP_SERVER_INFO },
		})
	}

	if (!era) {
		return jsonRpcError(
			rpcRequest.id,
			UNSUPPORTED_PROTOCOL_VERSION,
			`Unsupported protocol version: ${requestedVersion}`,
			{
				status: 400,
				data: { supported: SUPPORTED_PROTOCOL_VERSIONS, requested: requestedVersion },
			}
		)
	}

	switch (rpcRequest.method) {
		case 'ping':
			// Removed in 2026-07-28, so modern callers fall through to method-not-found.
			if (era === 'modern') break
			return jsonRpcResult(rpcRequest.id, {})
		case 'tools/list':
			return jsonRpcResult(
				rpcRequest.id,
				withResultEnvelope(
					{
						tools: getToolDefinitions(),
						...(era === 'modern'
							? { ttlMs: TOOLS_LIST_TTL_MS, cacheScope: TOOLS_LIST_CACHE_SCOPE }
							: {}),
					},
					era
				)
			)
		case 'tools/call': {
			const result = await callToolByName(rpcRequest, request, env, ctx)
			if (!result) {
				return jsonRpcError(
					rpcRequest.id,
					INVALID_PARAMS,
					`Unknown tool: ${rpcRequest.params?.name}`
				)
			}
			return jsonRpcResult(rpcRequest.id, withResultEnvelope(result, era))
		}
	}

	// Modern callers get a 404, which tells them the endpoint is live but lacks the method. Legacy
	// has no such rule, so those callers keep getting the JSON-RPC error on a 200.
	return jsonRpcError(rpcRequest.id, METHOD_NOT_FOUND, `Method not found: ${rpcRequest.method}`, {
		status: era === 'modern' ? 404 : 200,
	})
}

async function callToolByName(
	rpcRequest: JsonRpcRequest,
	request: Request,
	env: Environment,
	ctx?: ExecutionContext
) {
	switch (rpcRequest.params?.name) {
		case BOARD_INFO_TOOL_NAME:
			return callBoardInfoTool(rpcRequest.params.arguments, request, env, ctx)
		case PAGE_INFO_TOOL_NAME:
			return callPageInfoTool(rpcRequest.params.arguments, request, env, ctx)
		case CLUSTER_INFO_TOOL_NAME:
			return callClusterInfoTool(rpcRequest.params.arguments, request, env, ctx)
		case CLUSTER_SCREENSHOT_TOOL_NAME:
			return callClusterScreenshotTool(rpcRequest.params.arguments, request, env, ctx)
		default:
			return null
	}
}

/** Which era a request is speaking, or null for a version we don't implement. */
function getProtocolEra(version: string | undefined): ProtocolEra | null {
	// No version means legacy: clients are meant to send it and plenty don't, and the request is
	// identical either way.
	if (version === undefined) return 'legacy'
	if (version === MCP_PROTOCOL_VERSION_MODERN) return 'modern'
	if (version === MCP_PROTOCOL_VERSION_LEGACY) return 'legacy'
	return null
}

function getRequestedProtocolVersion(request: Request, rpcRequest: JsonRpcRequest) {
	const header = request.headers.get('mcp-protocol-version')
	if (header !== null) return header
	const meta = rpcRequest.params?._meta?.[META_PROTOCOL_VERSION]
	return typeof meta === 'string' ? meta : undefined
}

// The modern transport mirrors method and tool name into headers so gateways can route without
// parsing the body. If a header and the body disagree, the spec requires rejecting the request
// rather than picking a side.
function checkModernHeaders(request: Request, rpcRequest: JsonRpcRequest): Response | null {
	const id = rpcRequest.id ?? null

	const headerVersion = request.headers.get('mcp-protocol-version')
	if (headerVersion === null) {
		return headerMismatch(id, 'MCP-Protocol-Version header is required')
	}
	const metaVersion = rpcRequest.params?._meta?.[META_PROTOCOL_VERSION]
	if (typeof metaVersion === 'string' && metaVersion !== headerVersion) {
		return headerMismatch(
			id,
			`MCP-Protocol-Version header value '${headerVersion}' does not match body value '${metaVersion}'`
		)
	}

	const headerMethod = request.headers.get('mcp-method')
	if (headerMethod === null) {
		return headerMismatch(id, 'Mcp-Method header is required')
	}
	if (headerMethod !== rpcRequest.method) {
		return headerMismatch(
			id,
			`Mcp-Method header value '${headerMethod}' does not match body value '${rpcRequest.method}'`
		)
	}

	// tools/call is the only method we implement that names a target, so the only one with Mcp-Name.
	if (rpcRequest.method === 'tools/call') {
		const headerName = request.headers.get('mcp-name')
		if (headerName === null) {
			return headerMismatch(id, 'Mcp-Name header is required for tools/call')
		}
		const decoded = decodeHeaderValue(headerName)
		if (decoded !== rpcRequest.params?.name) {
			return headerMismatch(
				id,
				`Mcp-Name header value '${decoded}' does not match body value '${rpcRequest.params?.name}'`
			)
		}
	}

	return null
}

function headerMismatch(id: JsonRpcId, message: string) {
	return jsonRpcError(id, HEADER_MISMATCH, `Header mismatch: ${message}`, { status: 400 })
}

// Tool names aren't required to be header-safe, so a client may wrap `Mcp-Name` in this base64
// sentinel. Ours are all ASCII, but the comparison still has to decode first.
function decodeHeaderValue(value: string) {
	if (!value.startsWith('=?base64?') || !value.endsWith('?=')) return value
	try {
		return new TextDecoder().decode(
			base64ToArrayBuffer(value.slice('=?base64?'.length, -'?='.length))
		)
	} catch {
		return value
	}
}

// `resultType` and `_meta` serverInfo are modern-only, so they go on here rather than in each tool.
function withResultEnvelope(result: object, era: ProtocolEra) {
	if (era !== 'modern') return result
	return {
		resultType: 'complete',
		...result,
		_meta: { [META_SERVER_INFO]: MCP_SERVER_INFO },
	}
}

export async function resolveSharedBoardById(
	env: Environment,
	boardId: string
): Promise<ResolveThumbnailBoardResult> {
	const shared = await resolveThumbnailBoard(env, 'shared_file', boardId, { access: 'public' })
	if (shared.ok || shared.reason === 'board_empty') return shared
	return resolveThumbnailBoard(env, 'published', boardId, { access: 'public' })
}

// A shape set has no bounded key the way a page ordinal does, so it is hashed. Sorted first, so the
// same shapes requested in a different order hit the same cached PNG — the render is identical.
export async function getShapesCacheKey(
	board: Pick<ResolvedThumbnailBoard, 'kind' | 'slug' | 'version'>,
	theme: 'light' | 'dark',
	shapeIds: string[]
) {
	const digest = await sha256([...shapeIds].sort().join(','))
	return `mcp/${board.kind}/${board.slug}/${board.version}/${DEFAULT_THUMBNAIL_WIDTH}x${DEFAULT_THUMBNAIL_HEIGHT}/${theme}/shapes-${digest}.png`
}

async function callBoardInfoTool(
	argumentsValue: unknown,
	request: Request,
	env: Environment,
	ctx?: ExecutionContext
) {
	let input: { boardId: string }
	try {
		input = parseBoardInfoInput(argumentsValue)
	} catch (error) {
		return toolError(error instanceof Error ? error.message : String(error))
	}

	// Not rate limited: the limiters here bound Browser Run, and this call spends none. The clustering
	// tools below do spend it — they measure the page in a render before they can group anything — so
	// they are limited even though they read as "info" calls too.

	try {
		const loaded = await loadBoardForTool(env, input.boardId)
		if (!loaded.ok) return loaded.result
		return getBoardInfo(loaded.snapshot)
	} catch (error) {
		// The caller gets a bounded description, but nothing else records it: this tool writes no
		// telemetry (it spends no Browser Run), so without a report a failing board lookup is
		// invisible to us.
		reportThumbnailError(error, {
			ctx,
			env,
			request,
			surface: 'mcp_board_info',
			extras: { boardId: input.boardId },
		})
		return toolError(
			`Could not read board info: ${describeThumbnailFailure(classifyScreenshotFailure(error))}.`
		)
	}
}

async function callPageInfoTool(
	argumentsValue: unknown,
	request: Request,
	env: Environment,
	ctx?: ExecutionContext
) {
	const clientIp = getClientIp(request)
	let input: { boardId: string; page: PageSelector }
	try {
		input = parsePageInfoInput(argumentsValue)
	} catch (error) {
		return toolError(error instanceof Error ? error.message : String(error))
	}

	if (
		await isRateLimited(env.MCP_SCREENSHOT_RATE_LIMITER, `ip-cluster:${clientIp ?? 'unknown'}`, {
			fallbackLimit: MCP_PER_IP_RATE_LIMIT,
		})
	) {
		return toolError(
			`Rate limited. Requests are limited to about ${MCP_PER_IP_RATE_LIMIT} per minute per IP.`
		)
	}

	try {
		const resolved = await resolveBoardPage(env, input.boardId, input.page)
		if (!resolved.ok) return resolved.result

		const measurements = await measureFor(env, resolved)
		return getPageInfo(resolved.page, measurements)
	} catch (error) {
		// The caller gets a bounded description, but nothing else records it: this tool writes no
		// telemetry (it spends no Browser Run), so without a report a failing board lookup is
		// invisible to us.
		reportThumbnailError(error, {
			ctx,
			env,
			request,
			surface: 'mcp_board_info',
			extras: { boardId: input.boardId },
		})
		return toolError(
			`Could not read page info: ${describeThumbnailFailure(classifyScreenshotFailure(error))}.`
		)
	}
}

type LoadedBoard =
	| { ok: true; board: ResolvedThumbnailBoard; snapshot: import('@tldraw/sync-core').RoomSnapshot }
	| { ok: false; result: ToolResult }

async function loadBoardForTool(env: Environment, boardId: string): Promise<LoadedBoard> {
	const resolved = await resolveSharedBoardById(env, boardId)
	if (!resolved.ok) {
		return {
			ok: false,
			result: toolError(
				resolved.reason === 'board_empty' ? BOARD_EMPTY_MESSAGE : BOARD_NOT_FOUND_MESSAGE
			),
		}
	}

	const snapshot = await loadBoardSnapshot(env, resolved.board, { access: 'public' })
	if (!snapshot) return { ok: false, result: toolError(BOARD_EMPTY_MESSAGE) }
	return { ok: true, board: resolved.board, snapshot }
}

type ResolvedBoardPage =
	| { ok: true; board: ResolvedThumbnailBoard; page: ResolvedPageOk }
	| { ok: false; result: ToolResult }

async function resolveBoardPage(
	env: Environment,
	boardId: string,
	page: PageSelector
): Promise<ResolvedBoardPage> {
	const loaded = await loadBoardForTool(env, boardId)
	if (!loaded.ok) return loaded

	const pageResult = resolvePage(loaded.snapshot, page)
	if (!pageResult.ok) return pageResult
	return { ok: true, board: loaded.board, page: pageResult }
}

function measureFor(
	env: Environment,
	resolved: Extract<ResolvedBoardPage, { ok: true }>
): Promise<Record<string, ShapeMeasurement>> {
	return measurePageShapes(env, resolved.board, resolved.page.pageId)
}

async function callClusterInfoTool(
	argumentsValue: unknown,
	request: Request,
	env: Environment,
	ctx?: ExecutionContext
) {
	const clientIp = getClientIp(request)
	let input: { boardId: string; page: PageSelector; clusterId: string }
	try {
		input = parseClusterInfoInput(argumentsValue)
	} catch (error) {
		return toolError(error instanceof Error ? error.message : String(error))
	}

	if (
		await isRateLimited(env.MCP_SCREENSHOT_RATE_LIMITER, `ip-info:${clientIp ?? 'unknown'}`, {
			fallbackLimit: MCP_PER_IP_RATE_LIMIT,
		})
	) {
		return toolError(
			`Rate limited. Requests are limited to about ${MCP_PER_IP_RATE_LIMIT} per minute per IP.`
		)
	}

	try {
		const resolved = await resolveBoardPage(env, input.boardId, input.page)
		if (!resolved.ok) return resolved.result

		const measurements = await measureFor(env, resolved)
		return getClusterInfo(resolved.page, measurements, input.clusterId, input.page)
	} catch (error) {
		reportThumbnailError(error, {
			ctx,
			env,
			request,
			surface: 'mcp_board_info',
			extras: {
				boardId: input.boardId,
				page: describePageSelector(input.page),
				clusterId: input.clusterId,
			},
		})
		return toolError(
			`Could not read cluster info: ${describeThumbnailFailure(classifyScreenshotFailure(error))}.`
		)
	}
}

// Both shape-set screenshot tools do the same thing once they know which shapes to draw; they differ
// only in how they get there — one is handed the ids, the other resolves them from a cluster. That
// difference is `pickShapes`; everything downstream (rate limits, cache, capture, telemetry) is here.
async function renderShapeSetScreenshot(
	request: Request,
	env: Environment,
	ctx: ExecutionContext | undefined,
	{
		boardId,
		page,
		theme,
		extras,
		pickShapes,
	}: {
		boardId: string
		page: PageSelector
		theme: 'light' | 'dark'
		/** Extra Sentry context identifying which tool asked. */
		extras: Record<string, unknown>
		pickShapes(
			resolved: Extract<ResolvedBoardPage, { ok: true }>
		): Promise<
			{ ok: true; shapeIds: string[] } | { ok: false; result: ReturnType<typeof toolError> }
		>
	}
) {
	const clientIp = getClientIp(request)
	const ipHash = clientIp ? await sha256(clientIp) : 'unknown'
	const telemetry = (data: {
		cacheStatus: 'hit' | 'miss'
		browserRunDurationMs?: number
		failureReason?: string
		rateLimitAllowed?: boolean
	}) => {
		writeScreenshotTelemetry(env, { source: 'mcp', ipHash, ...data })
	}

	// Shares the screenshot budget with the other capture tools rather than the free info budget:
	// this spends Browser Run capacity the same way.
	if (
		await isRateLimited(env.MCP_SCREENSHOT_RATE_LIMITER, `ip-shot:${clientIp ?? 'unknown'}`, {
			fallbackLimit: MCP_PER_IP_RATE_LIMIT,
		})
	) {
		telemetry({ cacheStatus: 'miss', rateLimitAllowed: false, failureReason: 'rate_limited_ip' })
		return toolError(
			`Rate limited. Screenshots are limited to about ${MCP_PER_IP_RATE_LIMIT} requests per minute per IP.`
		)
	}

	try {
		if (!env.THUMBNAILS) {
			throw new Error('THUMBNAILS bucket is not configured')
		}

		// The cache key can't be built before resolving the board: it includes the board version, and
		// the shape set has to be resolved against the page anyway.
		const resolved = await resolveBoardPage(env, boardId, page)
		if (!resolved.ok) {
			telemetry({ cacheStatus: 'miss', failureReason: 'not_found' })
			return resolved.result
		}

		const picked = await pickShapes(resolved)
		if (!picked.ok) {
			telemetry({ cacheStatus: 'miss', failureReason: 'shape_not_found' })
			return picked.result
		}
		const shapeIds = picked.shapeIds

		// Keyed on the shape set, so a cluster screenshot and an equivalent get_shapes_screenshot of the
		// same shapes share one cached PNG — they render identically.
		const cacheKey = await getShapesCacheKey(resolved.board, theme, shapeIds)
		const cached = await env.THUMBNAILS.get(cacheKey)
		if (cached) {
			telemetry({ cacheStatus: 'hit' })
			return toolPageResult(
				decodeThumbnailPageName(cached.customMetadata?.pageName),
				arrayBufferToBase64(await cached.arrayBuffer())
			)
		}

		// Only cache misses spend Browser Rendering capacity, so the per-board and global guards sit
		// here rather than at the top of the tool call.
		if (
			await isRateLimited(env.MCP_SERVER_BOARD_RATE_LIMITER, `board:${boardId}`, {
				fallbackLimit: MCP_PER_BOARD_RATE_LIMIT,
			})
		) {
			telemetry({
				cacheStatus: 'miss',
				rateLimitAllowed: false,
				failureReason: 'rate_limited_board',
			})
			return toolError('Rate limited. This board is being screenshotted too frequently.')
		}
		if (await isGlobalBrowserRunRateLimited(env)) {
			telemetry({
				cacheStatus: 'miss',
				rateLimitAllowed: false,
				failureReason: 'rate_limited_global',
			})
			return toolError('Rate limited. Screenshot capacity is busy, try again in a minute.')
		}

		const render = await captureThumbnailScreenshot(env, resolved.board, {
			pageId: resolved.page.pageId,
			shapeIds,
			theme,
			width: DEFAULT_THUMBNAIL_WIDTH,
			height: DEFAULT_THUMBNAIL_HEIGHT,
		})

		// The PNG already cost Browser Run capacity and is exactly what was asked for, so a failed cache
		// write is reported but never turns a good render into an error.
		try {
			await putThumbnailPng(env.THUMBNAILS, cacheKey, render.base64, resolved.board.version, {
				pageName: encodeURIComponent(resolved.page.pageName),
			})
		} catch (error) {
			reportThumbnailError(error, {
				ctx,
				env,
				request,
				surface: 'mcp_screenshot_cache_write',
				extras: { boardId, page: describePageSelector(page), theme, ...extras },
			})
		}

		telemetry({ cacheStatus: 'miss', browserRunDurationMs: render.durationMs })
		return toolPageResult(resolved.page.pageName, render.base64)
	} catch (error) {
		reportThumbnailError(error, {
			ctx,
			env,
			request,
			surface: 'mcp_screenshot',
			extras: { boardId, page: describePageSelector(page), theme, ...extras },
		})
		const failureReason = classifyScreenshotFailure(error)
		// A capture that failed still held a browser, so its duration belongs on the datapoint the same
		// as a successful one's. Undefined when the failure came before the capture and spent nothing —
		// which for these tools includes a failed measure render, not just a failed screenshot.
		telemetry({
			cacheStatus: 'miss',
			failureReason,
			browserRunDurationMs: browserRunDurationOf(error),
		})
		return toolError(`Screenshot failed: ${describeThumbnailFailure(failureReason)}.`)
	}
}

// The one-call path: a cluster id straight to a picture, without a get_cluster_info round trip to
// pull its shape ids out first.
async function callClusterScreenshotTool(
	argumentsValue: unknown,
	request: Request,
	env: Environment,
	ctx?: ExecutionContext
) {
	let input: { boardId: string; page: PageSelector; clusterIds: string[]; theme: 'light' | 'dark' }
	try {
		input = parseClusterScreenshotInput(argumentsValue)
	} catch (error) {
		writeScreenshotTelemetry(env, {
			source: 'mcp',
			ipHash: 'unknown',
			cacheStatus: 'miss',
			failureReason: 'invalid_input',
		})
		return toolError(error instanceof Error ? error.message : String(error))
	}

	return renderShapeSetScreenshot(request, env, ctx, {
		boardId: input.boardId,
		page: input.page,
		theme: input.theme,
		extras: { clusterIds: input.clusterIds.join(',') },
		pickShapes: async (resolved) => {
			const measurements = await measureFor(env, resolved)
			return pickClusterShapes(resolved.page, measurements, input.clusterIds, input.page)
		},
	})
}

function decodeThumbnailPageName(value: string | undefined): string {
	if (!value) return 'Page'
	try {
		return decodeURIComponent(value)
	} catch {
		return value
	}
}

function getClientIp(request: Request) {
	const forwardedFor = request.headers.get('x-forwarded-for')
	return request.headers.get('cf-connecting-ip') ?? forwardedFor?.split(',')[0]?.trim() ?? null
}

async function readJsonRpcRequest(request: Request): Promise<JsonRpcRequest | null> {
	try {
		const value = await request.json()
		if (!value || typeof value !== 'object') return null
		return value as JsonRpcRequest
	} catch {
		return null
	}
}

function jsonRpcResult(id: JsonRpcId, result: unknown) {
	return Response.json({
		jsonrpc: '2.0',
		id,
		result,
	})
}

// Modern errors carry a real HTTP status: 400 when the transport rejects the request, 404 for an
// unknown method. Everything else stays on 200.
function jsonRpcError(
	id: JsonRpcId,
	code: number,
	message: string,
	{ status = 200, data }: { status?: number; data?: unknown } = {}
) {
	return Response.json(
		{
			jsonrpc: '2.0',
			id,
			error: { code, message, ...(data === undefined ? {} : { data }) },
		},
		{ status }
	)
}
