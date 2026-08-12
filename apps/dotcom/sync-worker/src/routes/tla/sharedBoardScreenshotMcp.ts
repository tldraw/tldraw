import { DEFAULT_THUMBNAIL_HEIGHT, DEFAULT_THUMBNAIL_WIDTH } from '@tldraw/dotcom-shared'
import { IRequest } from 'itty-router'
import {
	MCP_GLOBAL_BROWSER_RUN_RATE_LIMIT,
	MCP_PER_BOARD_RATE_LIMIT,
	MCP_PER_USER_RATE_LIMIT,
	MCP_RATE_LIMIT_WINDOW_MS,
} from '../../config'
import { Environment, envFlagWord } from '../../types'
import { arrayBufferToBase64, base64ToArrayBuffer } from '../../utils/base64'
import { sha256 } from '../../utils/hash'
import { hasReadAccessToFile } from '../../utils/tla/getAuth'
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
import { authenticateMcpRequest } from './mcpAuth'
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
	classifyScreenshotFailure,
	describeThumbnailFailure,
	reportThumbnailError,
} from './thumbnailShared'

// What it takes to run the board tools on Cloudflare: authentication, board resolution against
// Postgres and R2, Browser Rendering, the `mcp/` PNG cache, rate limits, telemetry, and the HTTP
// shell around JSON-RPC dispatch.
//
// The model-facing tools themselves live in boardTools.ts. That pure boundary lets the private eval
// harness serve the exact same tool descriptions, parsing, clustering, and errors from local board
// fixtures without needing a database or Browser Rendering.

// The versions this server will speak, newest first — one per era.
//
// `2026-07-28` is the *modern* era: no handshake and no session, every request carrying its own
// version, and the routing-relevant body fields mirrored into HTTP headers. `2025-11-25` is the
// *legacy* era, which opens with an `initialize` handshake. The spec sanctions one endpoint serving
// both, and most deployed clients are still legacy, so this one does.
//
// `2024-11-05` is absent, and dropping it is what made authentication possible: MCP had no
// authorization flow until `2025-03-26`, so a client holding this server to that version has no
// conformant way to obtain the token every request now needs.
//
// `2025-06-18` and `2025-03-26` are absent too, which keeps the matrix to one revision per era.
// `initialize` offers `2025-11-25` to a client that asks for either, and the spec's own mechanism
// takes it from there: the client adopts the offered version or disconnects. That costs clients
// which can authenticate but cannot follow an offered version — the reason to weigh this against
// how many still sit on those revisions.
const MCP_PROTOCOL_VERSION_MODERN = '2026-07-28'
const MCP_PROTOCOL_VERSION_LEGACY = '2025-11-25'
const SUPPORTED_MCP_PROTOCOL_VERSIONS = [MCP_PROTOCOL_VERSION_MODERN, MCP_PROTOCOL_VERSION_LEGACY]

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

// Modern `tools/list` is cacheable. The list is the same for every caller — authentication decides
// whether you may call a tool, not which tools exist — so it's public. If that stops being true,
// `cacheScope` has to drop to 'private'.
const TOOLS_LIST_TTL_MS = 3_600_000
const TOOLS_LIST_CACHE_SCOPE = 'public'

// One message for every way a board can fail to resolve, used by every tool. Deliberately silent on
// which: a board id is something the caller types, so an error that told "this exists but is not
// yours" apart from "this does not exist" would let anyone test file ids for existence. It also
// cannot name what would fix it, since the caller may simply be signed in as the wrong account.
// The MCP rate limit budgets themselves live in config.ts (MCP_PER_USER_RATE_LIMIT and friends),
// with the comment that maps each isolate-local fallback to its deployed Cloudflare binding. They
// are applied here rather than in the shared render core so a new surface built on those helpers
// cannot pick one up by accident.
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
		protocolVersion?: unknown
		/** Modern only: per-request version, client identity and capabilities. */
		_meta?: Record<string, unknown>
	}
}

// Runtime kill switch for the whole MCP server, read per request so flipping MCP_SCREENSHOT_ENABLED
// takes effect on the next request rather than the next build. An unset var means enabled, so
// environments that never configure it (previews, local dev, tests) keep working; a var that is set
// must say 'true', so a stray value disables rather than silently leaving the endpoint up.
export function isMcpScreenshotEnabled(env: Environment) {
	const word = envFlagWord(env.MCP_SCREENSHOT_ENABLED)
	return word === undefined || word === 'true'
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

	// Every request, `initialize` and `server/discover` included: MCP's authorization flow expects the
	// unauthenticated call to answer 401 with a pointer to the metadata, which is how a client
	// discovers it needs to sign the user in at all. There is no anonymous tier here — this endpoint
	// used to serve any caller naming a public board, and requiring a token retires that deliberately.
	// That covers discovery too: the 401 tells a client more than an unauthenticated capability list
	// would, and exempting it would reopen the anonymous tier for one method.
	const auth = await authenticateMcpRequest(request, env)
	if (!auth.ok) return auth.response

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
			// Always the legacy version: it is the only one this handshake can produce, since a client
			// that speaks modern doesn't call `initialize` at all. A client asking for anything else is
			// offered this and decides whether it can follow.
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
			supportedVersions: SUPPORTED_MCP_PROTOCOL_VERSIONS,
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
				data: { supported: SUPPORTED_MCP_PROTOCOL_VERSIONS, requested: requestedVersion },
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
			const result = await callToolByName(rpcRequest, request, env, auth.userId, ctx)
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
	userId: string,
	ctx?: ExecutionContext
) {
	switch (rpcRequest.params?.name) {
		case BOARD_INFO_TOOL_NAME:
			return callBoardInfoTool(rpcRequest.params.arguments, request, env, userId, ctx)
		case PAGE_INFO_TOOL_NAME:
			return callPageInfoTool(rpcRequest.params.arguments, request, env, userId, ctx)
		case CLUSTER_INFO_TOOL_NAME:
			return callClusterInfoTool(rpcRequest.params.arguments, request, env, userId, ctx)
		case CLUSTER_SCREENSHOT_TOOL_NAME:
			return callClusterScreenshotTool(rpcRequest.params.arguments, request, env, userId, ctx)
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

/**
 * Resolves a board id **for one user**, which is the whole point of authenticating this server: the
 * gate is "can this caller see this board" rather than "is this board public", so a user's own
 * private files are reachable and a board nobody shared with them is not.
 *
 * A board id is tried as a file id first (the /f/:slug namespace, where the slug is the file id) and
 * as a published-board slug (/p/:slug) second, so callers never need to know which kind of board they
 * hold. A file that resolves as empty is still the caller's board, so it does not fall through to the
 * published lookup and get misreported as not found.
 *
 * The file branch resolves under `render` rather than `public` once the access check passes — that is
 * what lets it reach an unshared board, and it is why the render helpers mint a recorded two-factor
 * token for this surface. Published boards stay `public`: the published slug is the whole capability,
 * and no user check narrows or widens it.
 *
 * Both failures answer the same `not_found`, deliberately. Distinguishing "no such board" from "you
 * cannot see it" would make this an existence oracle for file ids, which a caller supplies directly.
 */
export async function resolveSharedBoardForUser(
	env: Environment,
	boardId: string,
	userId: string
): Promise<ResolveThumbnailBoardResult> {
	if (await hasReadAccessToFile(env, userId, boardId)) {
		const file = await resolveThumbnailBoard(env, 'shared_file', boardId, { access: 'render' })
		if (file.ok || file.reason === 'board_empty') return file
	}
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
	userId: string,
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
		const loaded = await loadBoardForTool(env, input.boardId, userId)
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
	userId: string,
	ctx?: ExecutionContext
) {
	let input: { boardId: string; page: PageSelector }
	try {
		input = parsePageInfoInput(argumentsValue)
	} catch (error) {
		return toolError(error instanceof Error ? error.message : String(error))
	}

	if (
		await isRateLimited(env.MCP_SCREENSHOT_RATE_LIMITER, `user-cluster:${userId}`, {
			fallbackLimit: MCP_PER_USER_RATE_LIMIT,
		})
	) {
		return toolError(
			`Rate limited. Requests are limited to about ${MCP_PER_USER_RATE_LIMIT} per minute per account.`
		)
	}

	const telemetry = await mcpTelemetryWriter(env, userId)
	try {
		const resolved = await resolveBoardPage(env, input.boardId, input.page, userId)
		if (!resolved.ok) {
			telemetry({ cacheStatus: 'none', failureReason: resolved.reason })
			return resolved.result
		}

		const measurements = await measureFor(env, resolved)
		telemetry({ cacheStatus: 'none' })
		return getPageInfo(resolved.page, measurements)
	} catch (error) {
		// Unlike get_board_info, this tool can fail mid-measure, so its failures belong on the same
		// request ledger as the screenshot tool's: one bounded reason code for the blob and the
		// caller, the unbounded original for Sentry. The measure session itself reports separately.
		reportThumbnailError(error, {
			ctx,
			env,
			request,
			surface: 'mcp_board_info',
			extras: { boardId: input.boardId },
		})
		const failureReason = classifyScreenshotFailure(error)
		telemetry({ cacheStatus: 'none', failureReason })
		return toolError(`Could not read page info: ${describeThumbnailFailure(failureReason)}.`)
	}
}

type LoadedBoard =
	| { ok: true; board: ResolvedThumbnailBoard; snapshot: import('@tldraw/sync-core').RoomSnapshot }
	| { ok: false; reason: 'not_found' | 'board_empty'; result: ToolResult }

async function loadBoardForTool(
	env: Environment,
	boardId: string,
	userId: string
): Promise<LoadedBoard> {
	const resolved = await resolveSharedBoardForUser(env, boardId, userId)
	if (!resolved.ok) {
		return {
			ok: false,
			reason: resolved.reason,
			result: toolError(
				resolved.reason === 'board_empty' ? BOARD_EMPTY_MESSAGE : BOARD_NOT_FOUND_MESSAGE
			),
		}
	}

	const snapshot = await loadBoardSnapshot(env, resolved.board, { access: resolved.board.access })
	if (!snapshot) {
		return { ok: false, reason: 'board_empty', result: toolError(BOARD_EMPTY_MESSAGE) }
	}
	return { ok: true, board: resolved.board, snapshot }
}

type ResolvedBoardPage =
	| { ok: true; board: ResolvedThumbnailBoard; page: ResolvedPageOk }
	| {
			ok: false
			reason: 'not_found' | 'board_empty' | 'no_pages' | 'page_out_of_range'
			result: ToolResult
	  }

async function resolveBoardPage(
	env: Environment,
	boardId: string,
	page: PageSelector,
	userId: string
): Promise<ResolvedBoardPage> {
	const loaded = await loadBoardForTool(env, boardId, userId)
	if (!loaded.ok) return loaded

	const pageResult = resolvePage(loaded.snapshot, page)
	if (!pageResult.ok) return pageResult
	return { ok: true, board: loaded.board, page: pageResult }
}

// One datapoint shape for every MCP tool: `source: 'mcp'` plus the caller. Hashed rather than raw,
// so the dataset holds an account that spend or abuse can be traced back to without carrying user
// ids around — it replaced the hashed client IP the screenshot tool used before authentication was
// required, which was weak in both directions: evaded by a proxy pool and shared across a NAT.
async function mcpTelemetryWriter(env: Environment, userId: string) {
	const callerHash = await sha256(userId)
	return (data: {
		// `none` = the request never consulted the PNG cache: all info-tool rows, and screenshot
		// requests refused before the cache read. Keeping those out of hit/miss is what lets a
		// hit-rate-by-source panel read cache health rather than refusal volume.
		cacheStatus: 'hit' | 'miss' | 'none'
		failureReason?: string
		rateLimitAllowed?: boolean
	}) => {
		writeScreenshotTelemetry(env, { source: 'mcp', callerHash, ...data })
	}
}

function measureFor(
	env: Environment,
	resolved: Extract<ResolvedBoardPage, { ok: true }>
): Promise<Record<string, ShapeMeasurement>> {
	return measurePageShapes(env, resolved.board, resolved.page.pageId, { surface: 'mcp' })
}

async function callClusterInfoTool(
	argumentsValue: unknown,
	request: Request,
	env: Environment,
	userId: string,
	ctx?: ExecutionContext
) {
	let input: { boardId: string; page: PageSelector; clusterId: string }
	try {
		input = parseClusterInfoInput(argumentsValue)
	} catch (error) {
		return toolError(error instanceof Error ? error.message : String(error))
	}

	if (
		await isRateLimited(env.MCP_SCREENSHOT_RATE_LIMITER, `user-info:${userId}`, {
			fallbackLimit: MCP_PER_USER_RATE_LIMIT,
		})
	) {
		return toolError(
			`Rate limited. Requests are limited to about ${MCP_PER_USER_RATE_LIMIT} per minute per account.`
		)
	}

	const telemetry = await mcpTelemetryWriter(env, userId)
	try {
		const resolved = await resolveBoardPage(env, input.boardId, input.page, userId)
		if (!resolved.ok) {
			telemetry({ cacheStatus: 'none', failureReason: resolved.reason })
			return resolved.result
		}

		const measurements = await measureFor(env, resolved)
		const result = getClusterInfo(resolved.page, measurements, input.clusterId, input.page)
		telemetry({
			cacheStatus: 'none',
			...(result.isError ? { failureReason: 'shape_not_found' } : {}),
		})
		return result
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
		const failureReason = classifyScreenshotFailure(error)
		telemetry({ cacheStatus: 'none', failureReason })
		return toolError(`Could not read cluster info: ${describeThumbnailFailure(failureReason)}.`)
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
		userId,
		extras,
		pickShapes,
	}: {
		boardId: string
		page: PageSelector
		theme: 'light' | 'dark'
		userId: string
		/** Extra Sentry context identifying which tool asked. */
		extras: Record<string, unknown>
		/**
		 * Resolves which shapes to draw. `browserRunDurationMs` is what the resolution itself spent in
		 * Browser Run (the cluster tool's measure render); that session reports itself to the spend
		 * ledger, so nothing here needs to know.
		 */
		pickShapes(
			resolved: Extract<ResolvedBoardPage, { ok: true }>
		): Promise<
			{ ok: true; shapeIds: string[] } | { ok: false; result: ReturnType<typeof toolError> }
		>
	}
) {
	const telemetry = await mcpTelemetryWriter(env, userId)
	// Whether the PNG cache was actually consulted, for the catch below: a failure before the cache
	// read says nothing about cache health and files under `cache:none`, one after it was a miss.
	let consultedCache = false

	// Checked before the cache, unlike the two below: this is the per-caller ceiling on calls, not on
	// captures, so a caller looping over cache hits is still bounded. Shares the screenshot budget
	// with the clustering tools rather than the free info budget: this spends Browser Run capacity
	// the same way.
	if (
		await isRateLimited(env.MCP_SCREENSHOT_RATE_LIMITER, `user-shot:${userId}`, {
			fallbackLimit: MCP_PER_USER_RATE_LIMIT,
		})
	) {
		telemetry({ cacheStatus: 'none', rateLimitAllowed: false, failureReason: 'rate_limited_user' })
		return toolError(
			`Rate limited. Screenshots are limited to about ${MCP_PER_USER_RATE_LIMIT} requests per minute per account.`
		)
	}

	try {
		if (!env.MCP_DATA_BUCKET) {
			throw new Error('MCP_DATA_BUCKET bucket is not configured')
		}

		// The access check runs inside the resolution here, ahead of everything below it, and that
		// ordering is load-bearing: the cache read further down is what it gates. `mcp/` keys carry no
		// viewer dimension, so a private board cached for its owner would otherwise be served to anyone
		// who named the right board id. Gating the read rather than adding a viewer to the key is also
		// the cheaper fix — a viewer dimension would multiply the object count and turn one shared
		// render into one render per caller.
		const resolved = await resolveBoardPage(env, boardId, page, userId)
		if (!resolved.ok) {
			telemetry({ cacheStatus: 'none', failureReason: resolved.reason })
			return resolved.result
		}

		const picked = await pickShapes(resolved)
		if (!picked.ok) {
			telemetry({ cacheStatus: 'none', failureReason: 'shape_not_found' })
			return picked.result
		}
		const shapeIds = picked.shapeIds

		// Keyed on the shape set, so two requests naming the same shapes share one cached PNG — they
		// render identically.
		const cacheKey = await getShapesCacheKey(resolved.board, theme, shapeIds)
		consultedCache = true
		const cached = await env.MCP_DATA_BUCKET.get(cacheKey)
		if (cached) {
			telemetry({ cacheStatus: 'hit' })
			return toolPageResult(
				decodeThumbnailPageName(cached.customMetadata?.pageName),
				arrayBufferToBase64(await cached.arrayBuffer())
			)
		}

		// Only cache misses spend Browser Rendering capacity on the capture, so the per-board and
		// global guards sit here rather than at the top of the tool call.
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
			surface: 'mcp',
			pageId: resolved.page.pageId,
			shapeIds,
			theme,
			width: DEFAULT_THUMBNAIL_WIDTH,
			height: DEFAULT_THUMBNAIL_HEIGHT,
			telemetry: { source: 'mcp' },
		})

		// The render is already paid for and the PNG in hand is what the caller asked for, so a failed
		// cache write must not throw it away — that would turn a working screenshot into a tool error
		// and burn the caller's rate-limit budget for nothing. Reported rather than raised: the caller
		// can't act on it, but a cache that stops absorbing writes means every call re-renders. The page
		// name is URI-encoded because R2 custom metadata is not reliably unicode-safe.
		try {
			await putThumbnailPng(env.MCP_DATA_BUCKET, cacheKey, render.base64, resolved.board.version, {
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

		telemetry({ cacheStatus: 'miss' })
		return toolPageResult(resolved.page.pageName, render.base64)
	} catch (error) {
		// One bounded reason code drives both the telemetry blob (so unbounded error strings never
		// inflate that dimension) and the caller's message (so internal Postgres/R2 detail never reaches
		// an outside caller, authenticated or not). Sentry gets the unbounded original; the sessions
		// this call held, failed or not, are already on the spend ledger.
		reportThumbnailError(error, {
			ctx,
			env,
			request,
			surface: 'mcp_screenshot',
			extras: { boardId, page: describePageSelector(page), theme, ...extras },
		})
		const failureReason = classifyScreenshotFailure(error)
		telemetry({ cacheStatus: consultedCache ? 'miss' : 'none', failureReason })
		return toolError(`Screenshot failed: ${describeThumbnailFailure(failureReason)}.`)
	}
}

// The one-call path: a cluster id straight to a picture, without a get_cluster_info round trip to
// pull its shape ids out first.
async function callClusterScreenshotTool(
	argumentsValue: unknown,
	request: Request,
	env: Environment,
	userId: string,
	ctx?: ExecutionContext
) {
	let input: { boardId: string; page: PageSelector; clusterIds: string[]; theme: 'light' | 'dark' }
	try {
		input = parseClusterScreenshotInput(argumentsValue)
	} catch (error) {
		// Telemetry gets a bounded reason code; the caller gets the specific validation message.
		writeScreenshotTelemetry(env, {
			source: 'mcp',
			callerHash: await sha256(userId),
			cacheStatus: 'none',
			failureReason: 'invalid_input',
		})
		return toolError(error instanceof Error ? error.message : String(error))
	}

	return renderShapeSetScreenshot(request, env, ctx, {
		boardId: input.boardId,
		page: input.page,
		theme: input.theme,
		userId,
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
