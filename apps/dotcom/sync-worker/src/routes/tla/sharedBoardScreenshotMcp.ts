import {
	DEFAULT_THUMBNAIL_HEIGHT,
	DEFAULT_THUMBNAIL_WIDTH,
	ShapeCluster,
} from '@tldraw/dotcom-shared'
import { IRequest } from 'itty-router'
import {
	MCP_GLOBAL_BROWSER_RUN_RATE_LIMIT,
	MCP_PER_BOARD_RATE_LIMIT,
	MCP_PER_USER_RATE_LIMIT,
	MCP_RATE_LIMIT_WINDOW_MS,
} from '../../config'
import { Environment, envFlagWord } from '../../types'
import { writeDataPoint } from '../../utils/analytics'
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
	ToolResult,
	buildClusterIndex,
	clusterPage,
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
	toolError as modelToolError,
	toolPageResult,
} from './boardTools'
import { McpAuthRefusal, authenticateMcpRequest } from './mcpAuth'
import { readPageClusters, writePageClusterIndex } from './mcpClusterIndex'
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
	ThumbnailErrorSurface,
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
//
// Authentication and the feature flag gate live in mcpAuth.ts, applied to the whole endpoint before
// any of this runs; the verified `userId` it returns is threaded through every tool below, keying
// the per-user rate limits and the per-user board access check.

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

// The MCP rate limit budgets themselves live in config.ts (MCP_PER_USER_RATE_LIMIT and friends),
// with the comment that maps each isolate-local fallback to its deployed Cloudflare binding. They
// are applied here rather than in the shared render core so a new surface built on those helpers
// cannot pick one up by accident.
const GLOBAL_BROWSER_RATE_LIMIT_KEY = 'global'
const RATE_LIMIT_FALLBACK = new Map<string, { count: number; resetAt: number }>()

/**
 * The one per-caller budget, shared by every tool that can spend Browser Run.
 *
 * One key rather than three. The tools used to hold `user-cluster:`, `user-info:` and `user-shot:`
 * buckets — and the first two were crossed besides, `get_page_info` counting against the cluster
 * bucket and `get_cluster_info` against the info one — so the real per-caller ceiling was three times
 * the single number config.ts documents and the refusal messages quote. Merging them is what makes
 * that number true, and it is the reading every comment in this file already assumed.
 *
 * The `mcp-shared-board-screenshot:` prefix that `isRateLimited` adds is what the deployed bindings
 * count against; this key sits under it, so this rename costs every caller one reset window.
 */
function perUserRateLimitKey(userId: string) {
	return `user:${userId}`
}

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
		// Typed as unknown because it is whatever the client put in the request body; the telemetry
		// writer narrows it rather than trusting it.
		clientInfo?: {
			name?: unknown
			version?: unknown
		}
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

// --- MCP protocol telemetry ---

// Known MCP client families, matched as case-insensitive substrings against the User-Agent header
// and the clientInfo.name from initialize. Bounded on purpose: raw agent strings are
// unbounded-cardinality, so anything unrecognized lands in `other`, and the initialize event keeps a
// truncated raw name for spotting families worth adding here. Order matters where strings overlap —
// a Claude UA also says Mozilla, so `mozilla` sits last.
const MCP_CLIENT_FAMILIES: ReadonlyArray<readonly [needle: string, family: string]> = [
	['claude', 'claude'],
	['anthropic', 'claude'],
	['chatgpt', 'openai'],
	['openai', 'openai'],
	['cursor', 'cursor'],
	['python', 'python'],
	['httpx', 'python'],
	['aiohttp', 'python'],
	['node', 'node'],
	['undici', 'node'],
	['curl', 'curl'],
	['mozilla', 'browser'],
]

// Takes unknown because one caller passes a header and the other passes a field parsed straight out
// of the request body, which is whatever the client chose to send.
export function normalizeMcpClient(value: unknown): string {
	if (typeof value !== 'string' || value === '') return 'none'
	const lower = value.toLowerCase()
	for (const [needle, family] of MCP_CLIENT_FAMILIES) {
		if (lower.includes(needle)) return family
	}
	return 'other'
}

// One datapoint per tools/call dispatch, whatever the tool did: the render path's
// mcp_shared_board_screenshot event only fires when a screenshot is attempted, so without this the
// info tools (and every early failure) are invisible. Written at the dispatcher rather than inside
// the tools, so a new tool cannot ship unmetered.
function writeMcpToolCallTelemetry(
	env: Environment,
	request: Request,
	data: { tool: string; durationMs: number; reason?: string }
) {
	writeDataPoint(undefined, env.MEASURE, env, 'mcp_server_tool_call', {
		blobs: [
			`tool:${data.tool}`,
			`outcome:${data.reason ? 'error' : 'ok'}`,
			`reason:${data.reason ?? 'none'}`,
			`client:${normalizeMcpClient(request.headers.get('user-agent'))}`,
		],
		doubles: [data.durationMs],
	})
}

// One datapoint per refused request, which nothing else records: `mcp_server_tool_call` is written by
// the tools/call dispatcher, and an unauthenticated or unauthorized request never reaches it. During a
// flag-gated rollout this is the number that matters most — how many callers are being turned away,
// and whether it is "not signed in" or "signed in and not on the list", which call for entirely
// different responses.
//
// Reason and client are both closed vocabularies (see McpAuthRefusal and MCP_CLIENT_FAMILIES). No
// token, subject, client id or board identity goes near this, in keeping with every other event here.
function writeMcpAuthRefusalTelemetry(env: Environment, request: Request, reason: McpAuthRefusal) {
	writeDataPoint(undefined, env.MEASURE, env, 'mcp_server_auth_refusal', {
		blobs: [`reason:${reason}`, `client:${normalizeMcpClient(request.headers.get('user-agent'))}`],
	})
}

// initialize is the one request where the calling application names itself, so it gets its own
// event. The raw name is kept (truncated) alongside the normalized family: initializes are rare
// enough that the cardinality is affordable, and it is how new families get discovered. The UA
// family rides along as a cross-check for hosts whose header and clientInfo disagree.
function writeMcpInitializeTelemetry(
	env: Environment,
	request: Request,
	clientInfo: { name?: unknown; version?: unknown } | undefined
) {
	const name = clientInfo?.name
	writeDataPoint(undefined, env.MEASURE, env, 'mcp_server_initialize', {
		blobs: [
			`client:${normalizeMcpClient(name)}`,
			`raw:${typeof name === 'string' ? name.slice(0, 64) : 'none'}`,
			`ua:${normalizeMcpClient(request.headers.get('user-agent'))}`,
		],
	})
}

// A Map rather than an object literal, because the key comes straight off the wire: a plain object
// would resolve inherited names too, so `tools/call` for `constructor` or `toString` would find one
// of Object's own methods and call it as a tool instead of reporting an unknown tool.
const TOOL_HANDLERS = new Map<
	string,
	(
		argumentsValue: unknown,
		request: Request,
		env: Environment,
		userId: string,
		ctx?: ExecutionContext
	) => Promise<ToolCallResult>
>([
	[BOARD_INFO_TOOL_NAME, callBoardInfoTool],
	[PAGE_INFO_TOOL_NAME, callPageInfoTool],
	[CLUSTER_INFO_TOOL_NAME, callClusterInfoTool],
	[CLUSTER_SCREENSHOT_TOOL_NAME, callClusterScreenshotTool],
])

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

	// Every request, `initialize` included: MCP's authorization flow expects the unauthenticated call
	// to answer 401 with a pointer to the metadata, which is how a client discovers it needs to sign
	// the user in at all. There is no anonymous tier here — this endpoint used to serve any caller
	// naming a public board, and requiring a token retires that deliberately.
	const auth = await authenticateMcpRequest(request, env)
	if (!auth.ok) {
		writeMcpAuthRefusalTelemetry(env, request, auth.reason)
		return auth.response
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
		writeMcpInitializeTelemetry(env, request, rpcRequest.params?.clientInfo)
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
			const toolName = rpcRequest.params?.name ?? ''
			const toolHandler = TOOL_HANDLERS.get(toolName)
			if (!toolHandler) {
				// The requested name is caller-controlled and unbounded, so telemetry records a bounded
				// value while the JSON-RPC error still tells the caller which name was unknown.
				writeMcpToolCallTelemetry(env, request, {
					tool: 'unknown',
					reason: 'unknown_tool',
					durationMs: 0,
				})
				return jsonRpcError(
					rpcRequest.id,
					INVALID_PARAMS,
					`Unknown tool: ${rpcRequest.params?.name}`
				)
			}

			const startedAt = Date.now()
			let called: ToolCallResult
			try {
				called = await toolHandler(rpcRequest.params?.arguments, request, env, auth.userId, ctx)
			} catch (error) {
				writeMcpToolCallTelemetry(env, request, {
					tool: toolName,
					reason: 'unhandled_error',
					durationMs: Date.now() - startedAt,
				})
				throw error
			}

			const { telemetryReason, ...result } = called
			writeMcpToolCallTelemetry(env, request, {
				tool: toolName,
				reason: telemetryReason,
				durationMs: Date.now() - startedAt,
			})
			return jsonRpcResult(rpcRequest.id, withResultEnvelope(result, era))
		}
	}

	// Modern callers get a 404, which tells them the endpoint is live but lacks the method. Legacy
	// has no such rule, so those callers keep getting the JSON-RPC error on a 200.
	return jsonRpcError(rpcRequest.id, METHOD_NOT_FOUND, `Method not found: ${rpcRequest.method}`, {
		status: era === 'modern' ? 404 : 200,
	})
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
	const readAccess = await hasReadAccessToFile(env, userId, boardId)
	if (readAccess.ok) {
		// The row the access check just read, handed on so the resolution re-applies the gate without
		// asking Postgres for a strict subset of the same columns microseconds later. See the `file`
		// option on resolveThumbnailBoard for when that is and is not appropriate.
		const file = await resolveThumbnailBoard(env, 'shared_file', boardId, {
			access: 'render',
			file: readAccess.file,
		})
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
	const parsed = parseToolInput(() => parseBoardInfoInput(argumentsValue))
	if (!parsed.ok) return parsed.result
	const input = parsed.input

	// Not rate limited: the limiters here bound Browser Run, and this call spends none. The clustering
	// tools below do spend it — they measure the page in a render before they can group anything — so
	// they are limited even though they read as "info" calls too.

	try {
		const loaded = await loadBoardForTool(env, input.boardId, userId)
		if (!loaded.ok) return loaded.result
		return getBoardInfo(loaded.snapshot)
	} catch (error) {
		// No `telemetry`: this tool spends no Browser Run and so writes nothing to the screenshot
		// ledger, which is the one that answers cache and refusal questions about renders.
		return toolFailure(error, {
			env,
			request,
			ctx,
			surface: 'mcp_board_info',
			extras: { boardId: input.boardId },
			summary: 'Could not read board info',
			// The classifier reads render failures, and this tool starts no render: it resolves the board
			// and reads its snapshot, and the lookup goes through a Postgres pool whose timeouts the
			// classifier would otherwise report as `browser_timeout`. Only the snapshot-read class can
			// honestly apply here, so everything else is recorded as what it is.
			recordAs: (reason) => (reason === 'snapshot_read_error' ? reason : 'board_lookup_error'),
		})
	}
}

async function callPageInfoTool(
	argumentsValue: unknown,
	request: Request,
	env: Environment,
	userId: string,
	ctx?: ExecutionContext
) {
	const telemetry = mcpTelemetryWriter(env)
	const parsed = parseToolInput(() => parsePageInfoInput(argumentsValue), telemetry)
	if (!parsed.ok) return parsed.result
	const input = parsed.input

	// Inside the try, so a limiter that throws — a binding erroring, not a caller over budget — becomes
	// a structured MCP error rather than an unhandled throw the dispatcher turns into an unparseable
	// 500. Same reason in every tool below.
	try {
		const refusal = await checkPerUserRateLimit(env, userId, telemetry)
		if (refusal) return refusal

		// Scoped to the requested page: get_cluster_info and get_cluster_screenshot both resolve
		// cluster ids against a single page, so listing every shape on the board here would hand out
		// ids that neither of them can look up.
		const resolved = await resolveBoardPage(env, input.boardId, input.page, userId)
		if (!resolved.ok) {
			telemetry({ cacheStatus: 'none', failureReason: resolved.reason })
			return resolved.result
		}

		const clustered = await clustersFor(resolved, { env, userId, telemetry, request, ctx })
		if (!clustered.ok) return clustered.result
		telemetry({ cacheStatus: 'none', clusterCacheStatus: clustered.clusterCacheStatus })
		return getPageInfo(resolved.page, clustered.clusters)
	} catch (error) {
		// Unlike get_board_info, this tool can fail mid-measure, so its failures belong on the same
		// request ledger as the screenshot tool's. The measure session itself reports separately.
		return toolFailure(error, {
			env,
			request,
			ctx,
			surface: 'mcp_board_info',
			extras: { boardId: input.boardId },
			summary: 'Could not read page info',
			telemetry,
		})
	}
}

// The documented telemetry codes a board/page resolution can fail with — the bounded vocabulary in
// browser-run-thumbnails.md. Carried on the failure shapes below alongside the caller-facing result,
// so the request-level `mcp_shared_board_screenshot` event can record which failure this was without
// re-deriving it from the message. Main's `withTelemetryReason` carries the same code on the result
// for the per-call `mcp_server_tool_call` event; the two events want it in different places.
// boardTools' own `no_pages` and `page_out_of_range` are resolution states, not telemetry codes:
// resolveBoardPage maps them onto `board_empty` and `page_not_found` before anything is recorded, so
// they never reach a datapoint and are absent here.
type BoardToolFailureReason = 'not_found' | 'board_empty' | 'page_not_found'

type LoadedBoard =
	| {
			ok: true
			board: ResolvedThumbnailBoard
			snapshot: import('@tldraw/sync-core').RoomSnapshot
			snapshotVersion: string
	  }
	| { ok: false; reason: BoardToolFailureReason; result: ToolCallResult }

async function loadBoardForTool(
	env: Environment,
	boardId: string,
	userId: string
): Promise<LoadedBoard> {
	const resolved = await resolveSharedBoardForUser(env, boardId, userId)
	if (!resolved.ok) {
		return {
			ok: false,
			reason: resolved.reason === 'board_empty' ? 'board_empty' : 'not_found',
			result: toolError(
				resolved.reason === 'board_empty' ? BOARD_EMPTY_MESSAGE : BOARD_NOT_FOUND_MESSAGE,
				resolved.reason === 'board_empty' ? 'board_empty' : 'not_found'
			),
		}
	}

	// Read under the gate the board resolved under, not a fixed one, so a private file the caller
	// owns is readable and a published board is still held to the published check.
	//
	// `file` is the row the resolve above already gated on, handed back so this read re-applies the
	// gate without asking Postgres the same question a second time — otherwise every tool call dials
	// twice for one row, on top of the access check's own dial. Safe precisely here, for the same
	// reason it is in the OG queue: the two are microseconds apart inside one function, where the
	// re-read would return the row we already hold. It is not a general licence — the render page's
	// own read (getThumbnailSnapshot) deliberately re-reads, because it is a separate request, and
	// that re-read is what makes an un-share land inside the render token's window.
	const snapshot = await loadBoardSnapshot(env, resolved.board, {
		access: resolved.board.access,
		file: resolved.board.file,
	})
	if (!snapshot) {
		return {
			ok: false,
			reason: 'board_empty',
			result: toolError(BOARD_EMPTY_MESSAGE, 'board_empty'),
		}
	}
	// The board version is resolved before this read, so it can move independently of the snapshot:
	// publishing updates lastPublished before its outbox writes R2, and a shared file can change
	// between HEAD and GET. Key the cluster index to the bytes we actually read so neither gap can
	// store an old measurement under new content.
	const snapshotVersion = await sha256(JSON.stringify(snapshot))
	return { ok: true, board: resolved.board, snapshot, snapshotVersion }
}

type ResolvedBoardPage =
	| {
			ok: true
			board: ResolvedThumbnailBoard
			page: ResolvedPageOk
			snapshotVersion: string
	  }
	| { ok: false; reason: BoardToolFailureReason; result: ToolCallResult }

async function resolveBoardPage(
	env: Environment,
	boardId: string,
	page: PageSelector,
	userId: string
): Promise<ResolvedBoardPage> {
	const loaded = await loadBoardForTool(env, boardId, userId)
	if (!loaded.ok) return loaded

	const pageResult = resolvePage(loaded.snapshot, page)
	if (!pageResult.ok) {
		const reason = pageResult.reason === 'no_pages' ? 'board_empty' : 'page_not_found'
		return {
			...pageResult,
			reason,
			result: withTelemetryReason(pageResult.result, reason),
		}
	}
	return {
		ok: true,
		board: loaded.board,
		page: pageResult,
		snapshotVersion: loaded.snapshotVersion,
	}
}

// One datapoint shape for every MCP tool: `source: 'mcp'`, plus whatever the row carries.
//
// The caller is deliberately *not* filled in here. It belongs only on rate-limited rows, so the
// handful of sites that write one hash the user id themselves — see the note on `callerHash` in
// writeScreenshotTelemetry for why the blob is scoped that narrowly. Hashing here instead would put
// a SubtleCrypto round trip on every successful tool call to produce a value the writer then throws
// away as `caller:none`.
function mcpTelemetryWriter(env: Environment) {
	return (data: {
		// `none` = the request never consulted the PNG cache: all info-tool rows, and screenshot
		// requests refused before the cache read. Keeping those out of hit/miss is what lets a
		// hit-rate-by-source panel read cache health rather than refusal volume.
		cacheStatus: 'hit' | 'miss' | 'none'
		// What the cluster index cache did, on its own dimension rather than folded into `cacheStatus`:
		// the two caches answer different questions (one saves a capture, the other saves a measure)
		// and a single blob mixing them would make either hit rate unreadable. `none` for the tools
		// and refusals that never reach the clustering step.
		clusterCacheStatus?: 'hit' | 'miss' | 'none'
		failureReason?: string
		rateLimitAllowed?: boolean
		callerHash?: string
	}) => {
		writeScreenshotTelemetry(env, { source: 'mcp', ...data })
	}
}

type McpTelemetryWriter = ReturnType<typeof mcpTelemetryWriter>

/**
 * The per-caller ceiling on calls, not on captures, so a caller looping over cache hits is still
 * bounded. Returns the refusal to hand back, or `undefined` to carry on.
 *
 * Written once rather than per tool because the message and the reason code are what config.ts's
 * documented number means to a caller, and three copies of it drifted from each other and from the
 * key they counted against — see `perUserRateLimitKey`. Refusals are recorded on the screenshot
 * ledger here too: they used to be written by the screenshot tool alone, because the info tools
 * returned before their telemetry writer existed, so a caller hitting the limit through
 * `get_page_info` was invisible on the one panel that answers "who is being turned away".
 */
async function checkPerUserRateLimit(
	env: Environment,
	userId: string,
	telemetry: McpTelemetryWriter
): Promise<ToolCallResult | undefined> {
	if (
		!(await isRateLimited(env.MCP_SCREENSHOT_RATE_LIMITER, perUserRateLimitKey(userId), {
			fallbackLimit: MCP_PER_USER_RATE_LIMIT,
		}))
	) {
		return undefined
	}
	telemetry({
		cacheStatus: 'none',
		rateLimitAllowed: false,
		failureReason: 'rate_limited_user',
		callerHash: await sha256(userId),
	})
	return toolError(
		`Rate limited. Requests are limited to about ${MCP_PER_USER_RATE_LIMIT} per minute per account.`,
		'rate_limited_user'
	)
}

type PageClustersResult =
	| { ok: true; clusters: ShapeCluster[]; clusterCacheStatus: 'hit' | 'miss' }
	| { ok: false; result: ToolCallResult }

// How the three clustering tools get a page's clusters, and the one place that decides whether that
// costs a browser session.
//
// Clustering needs real geometry, and the only way to get it is to run an editor in Browser
// Rendering — the same cost as a screenshot. But the answer only moves when the board's content
// moves, so the first tool to measure a page stores it (mcpClusterIndex.ts, keyed by the board's
// content version) and every later call for the same content is served from that. In the documented
// drill-down — get_page_info, then get_cluster_info, then get_cluster_screenshot — that is one
// measure for the first call and none for the rest, where it used to be one each.
//
// A miss falls back to measuring, so nothing here can leave a tool unable to answer: a cache that is
// empty, stale, unreadable, or was never written because get_page_info was skipped behaves exactly
// like the pipeline did before it existed.
//
// The limiters are consulted on the miss path only — checking them on a hit would meter calls that
// spend nothing. It is the global limiter and not the per-board one: that allows 2 a minute, and a
// cold drill-down can legitimately measure once and capture once against the same board, so counting
// measures there would refuse the documented flow rather than an abusive one. A measure used to check
// neither, which is what made the account-wide ceiling several times the number the global limiter
// describes.
//
// The session lands on the `browser_run_session` spend ledger inside the measure itself, so callers
// carry no duration bookkeeping.
async function clustersFor(
	resolved: Extract<ResolvedBoardPage, { ok: true }>,
	{
		env,
		userId,
		telemetry,
		request,
		ctx,
	}: {
		env: Environment
		userId: string
		telemetry: McpTelemetryWriter
		request: Request
		ctx: ExecutionContext | undefined
	}
): Promise<PageClustersResult> {
	const cacheContext = { env, request, ctx }
	const cached = await readPageClusters(
		cacheContext,
		resolved.board,
		resolved.page,
		resolved.snapshotVersion
	)
	if (cached) return { ok: true, clusters: cached, clusterCacheStatus: 'hit' }

	if (await isGlobalBrowserRunRateLimited(env)) {
		telemetry({
			cacheStatus: 'none',
			clusterCacheStatus: 'miss',
			rateLimitAllowed: false,
			failureReason: 'rate_limited_global',
			callerHash: await sha256(userId),
		})
		return {
			ok: false,
			result: toolError(
				'Rate limited. Screenshot capacity is busy, try again in a minute.',
				'rate_limited_global'
			),
		}
	}

	const measurements = await measurePageShapes(env, resolved.board, resolved.page.pageId, {
		surface: 'mcp',
	})
	const clusters = clusterPage(resolved.page, measurements)
	await writePageClusterIndex(
		cacheContext,
		resolved.board,
		resolved.page,
		buildClusterIndex(clusters),
		resolved.snapshotVersion
	)
	return { ok: true, clusters, clusterCacheStatus: 'miss' }
}

async function callClusterInfoTool(
	argumentsValue: unknown,
	request: Request,
	env: Environment,
	userId: string,
	ctx?: ExecutionContext
) {
	const telemetry = mcpTelemetryWriter(env)
	const parsed = parseToolInput(() => parseClusterInfoInput(argumentsValue), telemetry)
	if (!parsed.ok) return parsed.result
	const input = parsed.input

	try {
		const refusal = await checkPerUserRateLimit(env, userId, telemetry)
		if (refusal) return refusal

		const resolved = await resolveBoardPage(env, input.boardId, input.page, userId)
		if (!resolved.ok) {
			telemetry({ cacheStatus: 'none', failureReason: resolved.reason })
			return resolved.result
		}

		const clustered = await clustersFor(resolved, { env, userId, telemetry, request, ctx })
		if (!clustered.ok) return clustered.result
		const result = getClusterInfo(resolved.page, clustered.clusters, input.clusterId, input.page)
		if (result.isError) {
			telemetry({
				cacheStatus: 'none',
				clusterCacheStatus: clustered.clusterCacheStatus,
				failureReason: 'cluster_not_found',
			})
			return withTelemetryReason(result, 'cluster_not_found')
		}
		telemetry({ cacheStatus: 'none', clusterCacheStatus: clustered.clusterCacheStatus })
		return result
	} catch (error) {
		return toolFailure(error, {
			env,
			request,
			ctx,
			surface: 'mcp_board_info',
			extras: {
				boardId: input.boardId,
				page: describePageSelector(input.page),
				clusterId: input.clusterId,
			},
			summary: 'Could not read cluster info',
			telemetry,
		})
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
		 * Resolves which shapes to draw. Any Browser Run it spends on the way (the cluster tool's measure
		 * render) reports itself to the spend ledger, so nothing here needs to know.
		 *
		 * Owns the telemetry for its own refusals, which is why it is handed the writer: only it knows
		 * whether a failure was a missing cluster or a limiter, and a row written here as well would file
		 * one call on the ledger twice, under two different reason codes.
		 */
		pickShapes(
			resolved: Extract<ResolvedBoardPage, { ok: true }>,
			telemetry: McpTelemetryWriter
		): Promise<
			| { ok: true; shapeIds: string[]; clusterCacheStatus: 'hit' | 'miss' }
			| { ok: false; result: ReturnType<typeof toolError> }
		>
	}
) {
	const telemetry = mcpTelemetryWriter(env)
	// Whether the PNG cache was actually consulted, for the catch below: a failure before the cache
	// read says nothing about cache health and files under `cache:none`, one after it was a miss.
	let consultedCache = false
	// Set once the shapes are picked, since that is the step that either measures or reads the index.
	let clusterCacheStatus: 'hit' | 'miss' | 'none' = 'none'

	try {
		// Checked before the cache, unlike the two below: this is the per-caller ceiling on calls, not
		// on captures, so a caller looping over cache hits is still bounded. One budget shared with the
		// clustering tools — see perUserRateLimitKey.
		const refusal = await checkPerUserRateLimit(env, userId, telemetry)
		if (refusal) return refusal

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

		const picked = await pickShapes(resolved, telemetry)
		if (!picked.ok) return picked.result
		const shapeIds = picked.shapeIds
		// Carried onto every row below: whether this call had to measure is as much a part of what it
		// spent as whether it had to capture.
		clusterCacheStatus = picked.clusterCacheStatus

		// Keyed on the shape set, so two requests naming the same shapes share one cached PNG — they
		// render identically.
		const cacheKey = await getShapesCacheKey(resolved.board, theme, shapeIds)
		consultedCache = true
		const cached = await env.MCP_DATA_BUCKET.get(cacheKey)
		if (cached) {
			telemetry({ cacheStatus: 'hit', clusterCacheStatus })
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
				clusterCacheStatus,
				rateLimitAllowed: false,
				failureReason: 'rate_limited_board',
				callerHash: await sha256(userId),
			})
			return toolError(
				'Rate limited. This board is being screenshotted too frequently.',
				'rate_limited_board'
			)
		}
		if (await isGlobalBrowserRunRateLimited(env)) {
			telemetry({
				cacheStatus: 'miss',
				clusterCacheStatus,
				rateLimitAllowed: false,
				failureReason: 'rate_limited_global',
				callerHash: await sha256(userId),
			})
			return toolError(
				'Rate limited. Screenshot capacity is busy, try again in a minute.',
				'rate_limited_global'
			)
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

		telemetry({ cacheStatus: 'miss', clusterCacheStatus })
		return toolPageResult(resolved.page.pageName, render.base64)
	} catch (error) {
		// The sessions this call held, failed or not, are already on the spend ledger; what is recorded
		// here is the request's own outcome.
		return toolFailure(error, {
			env,
			request,
			ctx,
			surface: 'mcp_screenshot',
			extras: { boardId, page: describePageSelector(page), theme, ...extras },
			summary: 'Screenshot failed',
			telemetry,
			cacheStatus: consultedCache ? 'miss' : 'none',
			clusterCacheStatus,
		})
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
	const parsed = parseToolInput(
		() => parseClusterScreenshotInput(argumentsValue),
		mcpTelemetryWriter(env)
	)
	if (!parsed.ok) return parsed.result
	const input = parsed.input

	return renderShapeSetScreenshot(request, env, ctx, {
		boardId: input.boardId,
		page: input.page,
		theme: input.theme,
		userId,
		extras: { clusterIds: input.clusterIds.join(',') },
		pickShapes: async (resolved, telemetry) => {
			const clustered = await clustersFor(resolved, { env, userId, telemetry, request, ctx })
			if (!clustered.ok) return { ok: false, result: clustered.result }
			const picked = pickClusterShapes(clustered.clusters, input.clusterIds, input.page)
			if (picked.ok) return { ...picked, clusterCacheStatus: clustered.clusterCacheStatus }
			// `cluster_not_found` on both events. The request ledger used to file this as
			// `failure:shape_not_found` while the per-call event filed the very same refusal as
			// `reason:cluster_not_found`, so the two dashboards disagreed about what had happened.
			telemetry({
				cacheStatus: 'none',
				clusterCacheStatus: clustered.clusterCacheStatus,
				failureReason: 'cluster_not_found',
			})
			return { ...picked, result: withTelemetryReason(picked.result, 'cluster_not_found') }
		},
	})
}

interface ToolCallResult extends ToolResult {
	/**
	 * Machine-readable failure code for the mcp_server_tool_call datapoint, read and stripped by the
	 * tools/call dispatcher before the result is serialized — callers never see it.
	 */
	telemetryReason?: string
}

function withTelemetryReason(result: ToolResult, reason: string): ToolCallResult {
	return { ...result, telemetryReason: reason }
}

function toolError(message: string, reason: string): ToolCallResult {
	return withTelemetryReason(modelToolError(message), reason)
}

type ParsedToolInput<T> = { ok: true; input: T } | { ok: false; result: ToolCallResult }

/**
 * Parses one tool's arguments, turning a validation failure into a tool error.
 *
 * The caller gets the validator's own message verbatim — it names the field and what was wrong with
 * it, which is the one class of failure a model can actually act on — while telemetry gets the
 * bounded `invalid_input`. That split was written out at all four call sites and stated at none.
 *
 * `telemetry` is passed by every tool that appears on the request ledger, so a call rejected for bad
 * arguments is counted there like any other refusal. Only the screenshot tool used to record one,
 * which left that ledger silently under-counting the info tools — the same blind spot as auth
 * refusals, one layer in. `get_board_info` is the one tool that genuinely has no writer: it spends no
 * Browser Run and is absent from that ledger entirely.
 */
function parseToolInput<T>(parse: () => T, telemetry?: McpTelemetryWriter): ParsedToolInput<T> {
	try {
		return { ok: true, input: parse() }
	} catch (error) {
		telemetry?.({ cacheStatus: 'none', failureReason: 'invalid_input' })
		return {
			ok: false,
			result: toolError(error instanceof Error ? error.message : String(error), 'invalid_input'),
		}
	}
}

/**
 * The failure tail every tool shares: report the unbounded original to Sentry, reduce it to one
 * bounded reason code, file that on the request ledger, and answer the caller with a message that
 * names the failure class and nothing else.
 *
 * One copy rather than four. The rule it encodes is the same at every site and worth stating once:
 * the caller's message and the telemetry blob both come from a closed vocabulary, because internal
 * Postgres and R2 detail must reach neither an outside caller nor a dimension whose cardinality it
 * would blow up. Sentry gets the original, with the unbounded context. The four copies had already
 * drifted — that rationale was written out at one of them and nowhere else.
 */
function toolFailure(
	error: unknown,
	{
		env,
		request,
		ctx,
		surface,
		extras,
		summary,
		telemetry,
		cacheStatus = 'none',
		clusterCacheStatus = 'none',
		recordAs,
	}: {
		env: Environment
		request: Request
		ctx: ExecutionContext | undefined
		/** Which tool family this came from, for the Sentry event. */
		surface: ThumbnailErrorSurface
		/** Sentry-only context identifying the call. Unbounded, and never reaches a datapoint. */
		extras: Record<string, unknown>
		/** Prefixes the caller's message: `${summary}: ${failure class}.` */
		summary: string
		/**
		 * The request ledger writer. Omitted by `get_board_info` alone, which spends no Browser Run and
		 * so does not appear on that ledger at all.
		 */
		telemetry?: McpTelemetryWriter
		/** What the cache had done by the time this failed. See `consultedCache`. */
		cacheStatus?: 'hit' | 'miss' | 'none'
		/** The same, for the cluster index cache. See `clusterCacheStatus`. */
		clusterCacheStatus?: 'hit' | 'miss' | 'none'
		/**
		 * Narrows the code that gets *recorded*, leaving the caller's message on the classifier's own
		 * verdict. For the one tool whose failures the classifier can misread — see `get_board_info`.
		 */
		recordAs?(failureReason: string): string
	}
): ToolCallResult {
	reportThumbnailError(error, { ctx, env, request, surface, extras })
	const failureReason = classifyScreenshotFailure(error)
	const recorded = recordAs ? recordAs(failureReason) : failureReason
	telemetry?.({ cacheStatus, clusterCacheStatus, failureReason: recorded })
	return toolError(`${summary}: ${describeThumbnailFailure(failureReason)}.`, recorded)
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
