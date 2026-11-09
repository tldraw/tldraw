import { DEFAULT_THUMBNAIL_HEIGHT, DEFAULT_THUMBNAIL_WIDTH } from '@tldraw/dotcom-shared'
import { IRequest } from 'itty-router'
import {
	MCP_RATE_LIMIT_WINDOW_MS,
	MCP_CREATE_PER_USER_RATE_LIMIT,
	MCP_RENAME_PER_USER_RATE_LIMIT,
	MCP_SEARCH_PER_USER_RATE_LIMIT,
} from '../../config'
import { Environment, envFlagWord } from '../../types'
import { writeDataPoint } from '../../utils/analytics'
import { base64ToArrayBuffer } from '../../utils/base64'
import { getPublicOrigin } from '../../utils/getPublicOrigin'
import { sha256 } from '../../utils/hash'
import { hasReadAccessToFile } from '../../utils/tla/getAuth'
import {
	BOARD_EMPTY_MESSAGE,
	BOARD_INFO_TOOL_NAME,
	BOARD_NOT_FOUND_MESSAGE,
	CLUSTER_INFO_TOOL_NAME,
	CLUSTER_SCREENSHOT_TOOL_NAME,
	CREATE_BOARD_TOOL_NAME,
	LIST_WORKSPACES_TOOL_NAME,
	MCP_SERVER_INFO,
	getMcpServerInstructions,
	PAGE_INFO_TOOL_NAME,
	RENAME_BOARD_TOOL_NAME,
	PageClustering,
	PageSelector,
	ResolvedPageOk,
	SEARCH_BOARDS_TOOL_NAME,
	ToolResult,
	clusterPage,
	describePageSelector,
	getBoardInfo,
	getBoardSearchResults,
	getClusterInfo,
	clusteringFromMeasure,
	getCreatedBoardResult,
	getPageInfo,
	getToolDefinitions,
	getWorkspaceListResult,
	parseBoardInfoInput,
	parseClusterInfoInput,
	parseClusterScreenshotInput,
	parseCreateBoardInput,
	parseListWorkspacesInput,
	parsePageInfoInput,
	parseRenameBoardInput,
	parseSearchBoardsInput,
	pickClusterShapes,
	toolError as modelToolError,
	toolJsonResult,
	toolPageResult,
} from './boardTools'
import { createBoardForUser } from './createBoard'
import { listWorkspacesForUser } from './listWorkspaces'
import { McpAuthRefusal, authenticateMcpRequest } from './mcpAuth'
import {
	PUBLISHED_BOARD_FAILURE,
	captureInOpenTab,
	measureInOpenTab,
	readLivePage,
} from './mcpTabRender'
import { renameBoardForUser } from './renameBoard'
import { searchAccessibleBoards } from './searchBoards'
import {
	ResolveThumbnailBoardResult,
	ResolvedThumbnailBoard,
	loadBoardSnapshot,
	resolveThumbnailBoard,
	writeScreenshotTelemetry,
} from './thumbnailRender'
import {
	ThumbnailErrorSurface,
	classifyScreenshotFailure,
	describeThumbnailFailure,
	RateLimiterUnavailableError,
	reportThumbnailError,
} from './thumbnailShared'

// What it takes to run the board tools on Cloudflare: board resolution against Postgres and R2, the
// caller's open tab (mcpTabRender.ts), rate limits, telemetry, and the HTTP shell around the JSON-RPC
// dispatch.
//
// The model-facing tools themselves live in boardTools.ts. That pure boundary lets the private eval
// harness serve the exact same tool descriptions, parsing, clustering, and errors from local board
// fixtures without needing a database or a browser.
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
export const SUPPORTED_PROTOCOL_VERSIONS = [
	MCP_PROTOCOL_VERSION_MODERN,
	MCP_PROTOCOL_VERSION_LEGACY,
]

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
const RATE_LIMIT_FALLBACK = new Map<string, { count: number; resetAt: number }>()

/**
 * The `search_boards` budget's key. `isRateLimited`'s `mcp-shared-board-screenshot:` prefix is what
 * the deployed buckets count against and cannot move, so what keeps budgets apart is the binding each
 * is checked against. The `search:` segment only keeps them readable in a dump.
 */
function searchRateLimitKey(userId: string) {
	return `search:${userId}`
}

function createRateLimitKey(userId: string) {
	return `create:${userId}`
}

function renameRateLimitKey(userId: string) {
	return `rename:${userId}`
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
		try {
			const { success } = await limiter.limit({ key: rateLimitKey })
			return !success
		} catch (error) {
			// Tagged rather than left raw, so the tools' catch blocks record a binding outage as itself
			// instead of as whatever their own failures usually are — see toolFailure.
			throw new RateLimiterUnavailableError(error)
		}
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

// Whether search_boards will match on board names. Unset means enabled, so previews, local dev and
// tests keep working, while a set value must say 'true' so a stray one turns matching off rather
// than leaving it on.
//
// It gates the one part of the search no index reaches — `name ILIKE '%term%'`, which reads every
// board in the caller's scope when a term matches nothing. Turning it off does not silently drop the
// terms: a query with them is refused, and the tool stops advertising `query` at all. Serving
// unfiltered boards to a model that asked for "roadmap" would be read as twenty matches.
export function isMcpSearchNameMatchingEnabled(env: Environment) {
	const word = envFlagWord(env.MCP_SEARCH_NAME_MATCHING_ENABLED)
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
//
// `route` separates the MCP endpoint from the board thumbnail route, which accepts the same OAuth
// tokens: without it a burst of refused thumbnail requests would read as MCP clients being turned away.
export function writeMcpAuthRefusalTelemetry(
	env: Environment,
	request: Request,
	reason: McpAuthRefusal,
	route: 'mcp' | 'thumbnail'
) {
	writeDataPoint(undefined, env.MEASURE, env, 'mcp_server_auth_refusal', {
		blobs: [
			`reason:${reason}`,
			`client:${normalizeMcpClient(request.headers.get('user-agent'))}`,
			`route:${route}`,
		],
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
	[SEARCH_BOARDS_TOOL_NAME, callSearchBoardsTool],
	[LIST_WORKSPACES_TOOL_NAME, callListWorkspacesTool],
	[CREATE_BOARD_TOOL_NAME, callCreateBoardTool],
	[RENAME_BOARD_TOOL_NAME, callRenameBoardTool],
	[BOARD_INFO_TOOL_NAME, callBoardInfoTool],
	[PAGE_INFO_TOOL_NAME, callPageInfoTool],
	[CLUSTER_INFO_TOOL_NAME, callClusterInfoTool],
	[CLUSTER_SCREENSHOT_TOOL_NAME, callClusterScreenshotTool],
])

export async function mcpServer(
	request: IRequest,
	env: Environment,
	ctx?: ExecutionContext
): Promise<Response> {
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
		writeMcpAuthRefusalTelemetry(env, request, auth.reason, 'mcp')
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
			instructions: getMcpServerInstructions(isMcpSearchNameMatchingEnabled(env)),
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
			instructions: getMcpServerInstructions(isMcpSearchNameMatchingEnabled(env)),
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
						tools: getToolDefinitions(isMcpSearchNameMatchingEnabled(env)),
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
 * The file branch resolves under `render` rather than `public` once the access check passes, which is
 * what lets it reach an unshared board. Published boards stay `public`: the published slug is the whole capability,
 * and no user check narrows or widens it.
 *
 * Both failures answer the same `not_found`, deliberately. Distinguishing "no such board" from "you
 * cannot see it" would make this an existence oracle for file ids, which a caller supplies directly.
 */
export async function resolveSharedBoardForUser(
	env: Environment,
	boardId: string,
	userId: string
): Promise<ResolvedBoardForUser> {
	const readAccess = await hasReadAccessToFile(env, userId, boardId)
	if (readAccess.ok) {
		// The row the access check just read, handed on so the resolution re-applies the gate without
		// asking Postgres for a strict subset of the same columns microseconds later. See the `file`
		// option on resolveThumbnailBoard for when that is and is not appropriate.
		const file = await resolveThumbnailBoard(env, 'shared_file', boardId, {
			access: 'render',
			file: readAccess.file,
		})
		if (file.ok) return { ...file, fileName: readAccess.file.name }
		if (file.reason === 'board_empty') return file
	}
	const published = await resolveThumbnailBoard(env, 'published', boardId, { access: 'public' })
	return published.ok ? { ...published, fileName: null } : published
}

export type ResolvedBoardForUser =
	| {
			ok: true
			board: ResolvedThumbnailBoard
			// The `file` row's name; null when served as the published copy, which carries its own.
			// See getBoardInfo.
			fileName: string | null
	  }
	| Extract<ResolveThumbnailBoardResult, { ok: false }>

async function callSearchBoardsTool(
	argumentsValue: unknown,
	request: Request,
	env: Environment,
	userId: string,
	ctx?: ExecutionContext
) {
	const parsed = parseToolInput(() =>
		parseSearchBoardsInput(argumentsValue, isMcpSearchNameMatchingEnabled(env))
	)
	if (!parsed.ok) return parsed.result
	const input = parsed.input

	// What this spends is Postgres, and paging is index-bounded (see searchBoards.ts) while matching is
	// not — a query that matches nothing still reads every board the caller can see. See "MCP tools"
	// in browser-run-thumbnails.md.
	try {
		// Inside the try for the reason spelled out on callPageInfoTool: a limiter that *throws* is a
		// binding outage, not a caller over budget, and outside the try it escapes as a 500 the client
		// cannot parse as MCP.
		const refusal = await checkSearchRateLimit(env, userId, mcpTelemetryWriter(env))
		if (refusal) return refusal

		return getBoardSearchResults(await searchAccessibleBoards(env, userId, input), input.terms)
	} catch (error) {
		// No `telemetry`: like get_board_info, this isn't on the screenshot ledger.
		return toolFailure(error, {
			env,
			request,
			ctx,
			surface: 'mcp_board_search',
			// The query is board names the caller typed, so it stays off the Sentry event too — the
			// shape of the call is what is diagnostic here, not its content.
			extras: { termCount: input.terms.length, paged: input.cursor !== null },
			summary: 'Could not search boards',
			// Every failure this can narrow is a Postgres one, and the classifier reads render
			// failures, so a pool timeout would otherwise be recorded as `browser_timeout`. A limiter
			// outage never reaches here — toolFailure keeps that reason as itself.
			recordAs: () => 'board_lookup_error',
		})
	}
}

async function callListWorkspacesTool(
	argumentsValue: unknown,
	request: Request,
	env: Environment,
	userId: string,
	ctx?: ExecutionContext
) {
	const parsed = parseToolInput(() => parseListWorkspacesInput(argumentsValue))
	if (!parsed.ok) return parsed.result

	try {
		// Shares search_boards' budget: it is the same kind of spend, a cheap, index-served Postgres read.
		const refusal = await checkSearchRateLimit(env, userId, mcpTelemetryWriter(env))
		if (refusal) return refusal

		return getWorkspaceListResult(await listWorkspacesForUser(env, userId), userId)
	} catch (error) {
		return toolFailure(error, {
			env,
			request,
			ctx,
			surface: 'mcp_workspace_list',
			extras: {},
			summary: 'Could not list workspaces',
			// A Postgres failure, like search_boards'; see the note there.
			recordAs: () => 'board_lookup_error',
		})
	}
}

async function callCreateBoardTool(
	argumentsValue: unknown,
	request: Request,
	env: Environment,
	userId: string,
	ctx?: ExecutionContext
) {
	const parsed = parseToolInput(() => parseCreateBoardInput(argumentsValue))
	if (!parsed.ok) return parsed.result
	const input = parsed.input

	try {
		const refusal = await checkCreateRateLimit(env, userId, mcpTelemetryWriter(env))
		if (refusal) return refusal

		const created = await createBoardForUser(env, userId, input, ctx)
		if (!created.ok) return withTelemetryReason(created.result, created.reason)
		return getCreatedBoardResult({
			boardId: created.boardId,
			name: input.name,
			url: `${getPublicOrigin(request as IRequest, env)}/f/${created.boardId}`,
			workspace: created.workspace,
		})
	} catch (error) {
		return toolFailure(error, {
			env,
			request,
			ctx,
			surface: 'mcp_board_create',
			// The board name is something the caller typed, so it stays off the Sentry event.
			extras: { namedWorkspace: input.workspace !== null },
			summary: 'Could not create the board',
			recordAs: () => 'board_create_error',
		})
	}
}

async function callRenameBoardTool(
	argumentsValue: unknown,
	request: Request,
	env: Environment,
	userId: string,
	ctx?: ExecutionContext
) {
	const parsed = parseToolInput(() => parseRenameBoardInput(argumentsValue))
	if (!parsed.ok) return parsed.result
	const input = parsed.input

	try {
		const refusal = await checkRenameRateLimit(env, userId, mcpTelemetryWriter(env))
		if (refusal) return refusal

		const renamed = await renameBoardForUser(env, userId, input, ctx)
		if (!renamed.ok) return withTelemetryReason(renamed.result, renamed.reason)
		return toolJsonResult({
			boardId: input.boardId,
			name: input.name,
			previousName: renamed.previousName,
			url: `${getPublicOrigin(request as IRequest, env)}/f/${input.boardId}`,
		})
	} catch (error) {
		return toolFailure(error, {
			env,
			request,
			ctx,
			surface: 'mcp_board_rename',
			// The new name is something the caller typed, so it stays off the Sentry event.
			extras: { boardId: input.boardId },
			summary: 'Could not rename the board',
			recordAs: () => 'board_rename_error',
		})
	}
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

	try {
		const loaded = await loadBoardForTool(env, input.boardId, userId)
		if (!loaded.ok) return loaded.result
		return getBoardInfo(loaded.snapshot, loaded.fileName)
	} catch (error) {
		// No `telemetry`: this tool isn't on the screenshot ledger.
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
		// Scoped to the requested page: get_cluster_info and get_cluster_screenshot both resolve
		// cluster ids against a single page, so listing every shape on the board here would hand out
		// ids that neither of them can look up.
		const resolved = await resolveBoardPage(env, input.boardId, input.page, userId, {
			request,
			ctx,
		})
		if (!resolved.ok) {
			telemetry({ failureReason: resolved.reason })
			return resolved.result
		}

		const clustered = await readClustering(resolved, { env, userId, telemetry, request, ctx })
		if (!clustered.ok) return clustered.result
		telemetry({})
		return getPageInfo(resolved.page, clustered, {
			selector: input.page,
			offset: input.cursor ?? 0,
		})
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
// re-deriving it from the message. `withTelemetryReason` carries the same code on the result for the
// per-call `mcp_server_tool_call` event; the two events want it in different places.
// boardTools' own `no_pages` and `page_out_of_range` are resolution states, not telemetry codes:
// resolveBoardPage maps them onto `board_empty` and `page_not_found` before anything is recorded, so
// they never reach a datapoint and are absent here.
type BoardToolFailureReason = 'not_found' | 'board_empty' | 'page_not_found'

type LoadedBoard =
	| {
			ok: true
			board: ResolvedThumbnailBoard
			fileName: string | null
			snapshot: import('@tldraw/sync-core').RoomSnapshot
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
	// gate without asking Postgres the same question a second time. Safe here because the two are
	// microseconds apart inside one function.
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
	return { ok: true, board: resolved.board, fileName: resolved.fileName, snapshot }
}

type ResolvedBoardPage =
	| { ok: true; fileId: string; page: ResolvedPageOk }
	| { ok: false; reason: string; result: ToolCallResult }

// The page as the room holds it now rather than as it was last persisted, since an agent has to be
// able to read what it just drew. Anything that can't be read that way, because it isn't a file the
// caller can see, goes through the same resolution get_board_info uses, so that the refusals match.
async function resolveBoardPage(
	env: Environment,
	boardId: string,
	page: PageSelector,
	userId: string,
	context: { request: Request; ctx: ExecutionContext | undefined }
): Promise<ResolvedBoardPage> {
	const access = await hasReadAccessToFile(env, userId, boardId)
	if (!access.ok) {
		const loaded = await loadBoardForTool(env, boardId, userId)
		if (!loaded.ok) return loaded
		const { reason, message } = PUBLISHED_BOARD_FAILURE
		return { ok: false, reason, result: toolError(message, reason) }
	}

	const live = await readLivePage(env, boardId, userId, page, context)
	if (!live.ok) {
		return { ok: false, reason: live.reason, result: toolError(live.message, live.reason) }
	}
	const pageResult = live.value
	if (!pageResult.ok) {
		const reason = pageResult.reason === 'no_pages' ? 'board_empty' : 'page_not_found'
		return { ok: false, reason, result: withTelemetryReason(pageResult.result, reason) }
	}
	return { ok: true, fileId: boardId, page: pageResult }
}

// One datapoint shape for every MCP tool: `source: 'mcp'`, plus whatever the row carries.
//
// `cacheStatus` is always `none`: the tools have no cache left, and the field holds its blob position.
//
// The caller is deliberately *not* filled in here. It belongs only on rate-limited rows, so the
// handful of sites that write one hash the user id themselves — see the note on `callerHash` in
// writeScreenshotTelemetry for why the blob is scoped that narrowly. Hashing here instead would put
// a SubtleCrypto round trip on every successful tool call to produce a value the writer then throws
// away as `caller:none`.
function mcpTelemetryWriter(env: Environment) {
	return (data: { failureReason?: string; rateLimitAllowed?: boolean; callerHash?: string }) => {
		writeScreenshotTelemetry(env, { source: 'mcp', cacheStatus: 'none', ...data })
	}
}

type McpTelemetryWriter = ReturnType<typeof mcpTelemetryWriter>

/**
 * The per-caller ceiling on `search_boards`.
 *
 * The refusal is written to the screenshot ledger even though a successful search is not. That
 * ledger is the one panel answering "who is being turned away", and a limit nobody can see firing is
 * no use.
 */
async function checkSearchRateLimit(
	env: Environment,
	userId: string,
	telemetry: McpTelemetryWriter
): Promise<ToolCallResult | undefined> {
	if (
		!(await isRateLimited(env.MCP_SERVER_SEARCH_RATE_LIMITER, searchRateLimitKey(userId), {
			fallbackLimit: MCP_SEARCH_PER_USER_RATE_LIMIT,
		}))
	) {
		return undefined
	}
	telemetry({
		rateLimitAllowed: false,
		failureReason: 'rate_limited_search',
		callerHash: await sha256(userId),
	})
	return toolError(
		`Rate limited. Searches are limited to about ${MCP_SEARCH_PER_USER_RATE_LIMIT} per minute per account.`,
		'rate_limited_search'
	)
}

/**
 * The per-caller ceiling on `create_board`. Its own binding because it bounds writes, which the search
 * budget isn't sized for. MAX_NUMBER_OF_FILES caps what a runaway loop can leave behind; this caps how
 * fast it gets there.
 */
async function checkCreateRateLimit(
	env: Environment,
	userId: string,
	telemetry: McpTelemetryWriter
): Promise<ToolCallResult | undefined> {
	if (
		!(await isRateLimited(env.MCP_SERVER_CREATE_RATE_LIMITER, createRateLimitKey(userId), {
			fallbackLimit: MCP_CREATE_PER_USER_RATE_LIMIT,
		}))
	) {
		return undefined
	}
	telemetry({
		rateLimitAllowed: false,
		failureReason: 'rate_limited_create',
		callerHash: await sha256(userId),
	})
	return toolError(
		`Rate limited. Board creation is limited to about ${MCP_CREATE_PER_USER_RATE_LIMIT} per minute per account.`,
		'rate_limited_create'
	)
}

async function checkRenameRateLimit(
	env: Environment,
	userId: string,
	telemetry: McpTelemetryWriter
): Promise<ToolCallResult | undefined> {
	if (
		!(await isRateLimited(env.MCP_SERVER_RENAME_RATE_LIMITER, renameRateLimitKey(userId), {
			fallbackLimit: MCP_RENAME_PER_USER_RATE_LIMIT,
		}))
	) {
		return undefined
	}
	telemetry({
		rateLimitAllowed: false,
		failureReason: 'rate_limited_rename',
		callerHash: await sha256(userId),
	})
	return toolError(
		`Rate limited. Renaming boards is limited to about ${MCP_RENAME_PER_USER_RATE_LIMIT} per minute per account.`,
		'rate_limited_rename'
	)
}

type ClusteringResult = ({ ok: true } & PageClustering) | { ok: false; result: ToolCallResult }

// How the three clustering tools get a page's clusters. Clustering needs real geometry, and the only
// way to get it is to run an editor, so this asks the caller's open tab every time. See mcpTabRender.ts
// for why a tab's answer is never kept.
async function readClustering(
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
): Promise<ClusteringResult> {
	const measured = await measureInOpenTab(env, resolved.fileId, userId, resolved.page.pageId, {
		request,
		ctx,
	})
	if (!measured.ok) {
		telemetry({ failureReason: measured.reason })
		return { ok: false, result: toolError(measured.message, measured.reason) }
	}
	const clusters = clusterPage(resolved.page, measured.value)
	return { ok: true, ...clusteringFromMeasure(clusters, measured.value) }
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
		const resolved = await resolveBoardPage(env, input.boardId, input.page, userId, {
			request,
			ctx,
		})
		if (!resolved.ok) {
			telemetry({ failureReason: resolved.reason })
			return resolved.result
		}

		const clustered = await readClustering(resolved, { env, userId, telemetry, request, ctx })
		if (!clustered.ok) return clustered.result
		const info = getClusterInfo(
			resolved.page,
			clustered,
			input.clusterIds,
			input.page,
			input.cursor
		)
		if (!info.ok) {
			telemetry({ failureReason: info.reason })
			return withTelemetryReason(info.result, info.reason)
		}
		telemetry({})
		return info.result
	} catch (error) {
		return toolFailure(error, {
			env,
			request,
			ctx,
			surface: 'mcp_board_info',
			extras: {
				boardId: input.boardId,
				page: describePageSelector(input.page),
				clusterIds: input.clusterIds.join(','),
			},
			summary: 'Could not read cluster info',
			telemetry,
		})
	}
}

// Both shape-set screenshot tools do the same thing once they know which shapes to draw; they differ
// only in how they get there — one is handed the ids, the other resolves them from a cluster. That
// difference is `pickShapes`; everything downstream (rate limits, capture, telemetry) is here.
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
		 * Resolves which shapes to draw. Owns the telemetry for its own refusals, which is why it is
		 * handed the writer: only it knows what the failure was, and a row written here as well would
		 * file one call on the ledger twice, under two different reason codes.
		 */
		pickShapes(
			resolved: Extract<ResolvedBoardPage, { ok: true }>,
			telemetry: McpTelemetryWriter
		): Promise<
			{ ok: true; shapeIds: string[] } | { ok: false; result: ReturnType<typeof toolError> }
		>
	}
) {
	const telemetry = mcpTelemetryWriter(env)

	try {
		const resolved = await resolveBoardPage(env, boardId, page, userId, { request, ctx })
		if (!resolved.ok) {
			telemetry({ failureReason: resolved.reason })
			return resolved.result
		}

		const picked = await pickShapes(resolved, telemetry)
		if (!picked.ok) return picked.result

		const image = await captureInOpenTab(
			env,
			resolved.fileId,
			userId,
			{
				pageId: resolved.page.pageId,
				shapeIds: picked.shapeIds,
				theme,
				width: DEFAULT_THUMBNAIL_WIDTH,
				height: DEFAULT_THUMBNAIL_HEIGHT,
			},
			{ request, ctx }
		)
		if (!image.ok) {
			telemetry({ failureReason: image.reason })
			return toolError(image.message, image.reason)
		}

		telemetry({})
		return toolPageResult(resolved.page.pageName, image.value)
	} catch (error) {
		return toolFailure(error, {
			env,
			request,
			ctx,
			surface: 'mcp_screenshot',
			extras: { boardId, page: describePageSelector(page), theme, ...extras },
			summary: 'Screenshot failed',
			telemetry,
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
			const clustered = await readClustering(resolved, { env, userId, telemetry, request, ctx })
			if (!clustered.ok) return { ok: false, result: clustered.result }
			const picked = pickClusterShapes(clustered.clusters, input.clusterIds, input.page)
			if (picked.ok) return picked
			// `cluster_not_found` on both events. The request ledger used to file this as
			// `failure:shape_not_found` while the per-call event filed the very same refusal as
			// `reason:cluster_not_found`, so the two dashboards disagreed about what had happened.
			telemetry({ failureReason: 'cluster_not_found' })
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
		telemetry?.({ failureReason: 'invalid_input' })
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
 * One copy rather than five. The rule it encodes is the same at every site and worth stating once:
 * the caller's message and the telemetry blob both come from a closed vocabulary, because internal
 * Postgres and R2 detail must reach neither an outside caller nor a dimension whose cardinality it
 * would blow up. Sentry gets the original, with the unbounded context. Those copies had already
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
		 * The request ledger writer. Omitted only by `search_boards` and `get_board_info`, which spend
		 * no Browser Run and so do not appear on that ledger at all.
		 */
		telemetry?: McpTelemetryWriter
		/**
		 * Narrows the classifier's verdict for a tool whose failures it can misread — search_boards and
		 * get_board_info spend no Browser Run, so a raw Postgres error the classifier would otherwise
		 * default to a render failure is corrected here, for the caller's message and telemetry alike.
		 */
		recordAs?(failureReason: string): string
	}
): ToolCallResult {
	reportThumbnailError(error, { ctx, env, request, surface, extras })
	const failureReason = classifyScreenshotFailure(error)
	// `recordAs` exists to correct the classifier's reading of a tool's *own* failures, and a limiter
	// binding outage is nobody's own: left to it, every tool would file one as the thing it usually
	// fails at — a board lookup — and send a dashboard reader to a database that is fine.
	const recorded =
		failureReason === 'rate_limiter_unavailable'
			? failureReason
			: recordAs
				? recordAs(failureReason)
				: failureReason
	telemetry?.({ failureReason: recorded })
	return toolError(`${summary}: ${describeThumbnailFailure(recorded)}.`, recorded)
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
