import { DEFAULT_THUMBNAIL_HEIGHT, DEFAULT_THUMBNAIL_WIDTH } from '@tldraw/dotcom-shared'
import { IRequest } from 'itty-router'
import {
	MCP_GLOBAL_BROWSER_RUN_RATE_LIMIT,
	MCP_PER_BOARD_RATE_LIMIT,
	MCP_PER_USER_RATE_LIMIT,
	MCP_RATE_LIMIT_WINDOW_MS,
} from '../../config'
import { Environment, envFlagWord } from '../../types'
import { arrayBufferToBase64 } from '../../utils/base64'
import { sha256 } from '../../utils/hash'
import { hasReadAccessToFile } from '../../utils/tla/getAuth'
import { getDocumentNameFromSnapshot } from '../getDocumentNameFromSnapshot'
import { authenticateMcpRequest } from './mcpAuth'
import {
	ResolveThumbnailBoardResult,
	ResolvedThumbnailBoard,
	captureThumbnailScreenshot,
	enumerateBoardPages,
	loadBoardSnapshot,
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

// The MCP protocol surface over the shared render-and-cache core in thumbnailRender.ts: JSON-RPC
// plumbing, tool definitions, input parsing, and the MCP tools' own per-user/per-board rate limits
// and `mcp/` cache keys. Authentication and the feature flag gate live in mcpAuth.ts, applied to the
// whole endpoint before any of this runs.

const SCREENSHOT_TOOL_NAME = 'get_shared_board_screenshot'
const BOARD_INFO_TOOL_NAME = 'get_board_info'

// The versions this server will speak, newest first.
//
// `2024-11-05` is deliberately absent, and dropping it is what made authentication possible: MCP had
// no authorization flow until `2025-03-26`, so a client holding this server to that version has no
// conformant way to obtain the token every request now needs. Advertising it would leave those
// clients unable to authenticate but convinced the server was working as specified.
const MCP_PROTOCOL_VERSION = '2025-06-18'
const SUPPORTED_MCP_PROTOCOL_VERSIONS = [MCP_PROTOCOL_VERSION, '2025-03-26']
// What to assume when a request carries no MCP-Protocol-Version header. The spec names this exact
// fallback: the header was introduced in 2025-06-18, so its absence means an earlier client rather
// than a malformed request.
const ASSUMED_MCP_PROTOCOL_VERSION = '2025-03-26'

// One message for every way a board can fail to resolve, used by both tools. Deliberately silent on
// which: a board id is something the caller types, so an error that told "this exists but is not
// yours" apart from "this does not exist" would let anyone test file ids for existence. It also
// cannot name what would fix it, since the caller may simply be signed in as the wrong account.
const BOARD_NOT_FOUND =
	'No board was found with this id, or this account does not have access to it. Boards you own, boards shared with you via link, and published boards are supported.'

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
		protocolVersion?: unknown
	}
}

export interface SharedBoardScreenshotInput {
	boardId: string
	// 0-based page ordinal to screenshot. Defaults to 0 (the first page).
	page: number
	theme: 'light' | 'dark'
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

	if (request.method !== 'POST') {
		return new Response('MCP screenshot server expects POST', { status: 405 })
	}

	// Every request, `initialize` included: MCP's authorization flow expects the unauthenticated call
	// to answer 401 with a pointer to the metadata, which is how a client discovers it needs to sign
	// the user in at all. There is no anonymous tier here — this endpoint used to serve any caller
	// naming a public board, and requiring a token retires that deliberately.
	const auth = await authenticateMcpRequest(request, env)
	if (!auth.ok) return auth.response

	const protocolVersionError = checkRequestProtocolVersion(request)
	if (protocolVersionError) return protocolVersionError

	const rpcRequest = await readJsonRpcRequest(request)
	if (!rpcRequest) {
		return jsonRpcError(null, -32700, 'Parse error')
	}

	if (rpcRequest.id === undefined) {
		return new Response(null, { status: 202 })
	}

	switch (rpcRequest.method) {
		case 'initialize':
			return jsonRpcResult(rpcRequest.id, {
				// Echo the client's version when we speak it, so a client on an older-but-supported
				// version is not forced to downgrade its expectations of us or reconnect.
				protocolVersion: negotiateProtocolVersion(rpcRequest.params?.protocolVersion),
				capabilities: { tools: {} },
				serverInfo: {
					name: 'tldraw-shared-board-screenshot',
					title: 'tldraw board screenshots',
					version: '3.0.0',
				},
				instructions:
					'MCP server for tldraw.com boards you have access to. get_board_info lists a board’s pages; get_shared_board_screenshot returns a PNG for one page. Accepts published tldraw.com/p/:slug boards, link-shared tldraw.com/f/:slug files, and your own private boards, rendered through a signed, tldraw-owned render job.',
			})
		case 'ping':
			return jsonRpcResult(rpcRequest.id, {})
		case 'tools/list':
			return jsonRpcResult(rpcRequest.id, {
				tools: [getBoardInfoToolDefinition(), getSharedBoardScreenshotToolDefinition()],
			})
		case 'tools/call':
			switch (rpcRequest.params?.name) {
				case BOARD_INFO_TOOL_NAME:
					return jsonRpcResult(
						rpcRequest.id,
						await callBoardInfoTool(rpcRequest.params.arguments, request, env, auth.userId, ctx)
					)
				case SCREENSHOT_TOOL_NAME:
					return jsonRpcResult(
						rpcRequest.id,
						await callSharedBoardScreenshotTool(
							rpcRequest.params.arguments,
							request,
							env,
							auth.userId,
							ctx
						)
					)
				default:
					return jsonRpcError(rpcRequest.id, -32602, `Unknown tool: ${rpcRequest.params?.name}`)
			}
		default:
			return jsonRpcError(rpcRequest.id, -32601, `Method not found: ${rpcRequest.method}`)
	}
}

// Answers `initialize` with the client's requested version when we speak it, and with our newest
// otherwise — which is what the spec asks for, leaving the client to decide whether it can proceed.
function negotiateProtocolVersion(requested: unknown): string {
	return typeof requested === 'string' && SUPPORTED_MCP_PROTOCOL_VERSIONS.includes(requested)
		? requested
		: MCP_PROTOCOL_VERSION
}

// From 2025-06-18 a client states the negotiated version on every subsequent request, and a server
// that cannot speak it must refuse rather than guess. Rejected at the transport layer with a plain
// 400, not a JSON-RPC error, because the disagreement is about the envelope rather than the call.
function checkRequestProtocolVersion(request: Request): Response | null {
	const version = request.headers.get('mcp-protocol-version') ?? ASSUMED_MCP_PROTOCOL_VERSION
	if (SUPPORTED_MCP_PROTOCOL_VERSIONS.includes(version)) return null
	return Response.json(
		{
			error: 'unsupported_protocol_version',
			error_description: `Unsupported MCP-Protocol-Version: ${version}. Supported: ${SUPPORTED_MCP_PROTOCOL_VERSIONS.join(', ')}.`,
		},
		{ status: 400 }
	)
}

export function parseSharedBoardScreenshotInput(input: unknown): SharedBoardScreenshotInput {
	const value = requireArgumentsObject(input)
	return {
		boardId: parseBoardId(value.boardId),
		page: parsePageOrdinal(value.page),
		theme: parseTheme(value.theme),
	}
}

export function parseBoardInfoInput(input: unknown): { boardId: string } {
	const value = requireArgumentsObject(input)
	return { boardId: parseBoardId(value.boardId) }
}

function requireArgumentsObject(input: unknown): Record<string, unknown> {
	if (!input || typeof input !== 'object') {
		throw new Error('Tool arguments must be an object')
	}
	return input as Record<string, unknown>
}

function parseBoardId(value: unknown): string {
	if (typeof value !== 'string' || value.length === 0) {
		throw new Error('boardId is required')
	}
	if (value.includes('/')) {
		throw new Error('boardId must be a board id, not a URL')
	}
	return value
}

// Omitting the theme means light, but an unrecognized one is rejected rather than quietly treated
// as light: a caller asking for `blue` gets a wrong-but-plausible image back and no signal that the
// argument was ignored.
function parseTheme(value: unknown): 'light' | 'dark' {
	if (value === undefined || value === null) return 'light'
	if (value !== 'light' && value !== 'dark') {
		throw new Error(`theme must be 'light' or 'dark'`)
	}
	return value
}

function parsePageOrdinal(value: unknown): number {
	if (value === undefined || value === null) return 0
	if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
		throw new Error('page must be a non-negative integer (0-based page ordinal)')
	}
	return value
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
 * what lets it reach an unshared board, and it is why `captureThumbnailScreenshot` mints a recorded
 * two-factor token for this surface. Published boards stay `public`: the published slug is the whole
 * capability, and no user check narrows or widens it.
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

// One R2 cache key per page. The ordinal keys the object directly; the version and theme are in the
// path, so republishing or editing rotates every page's key.
export function getThumbnailPageCacheKey(
	board: Pick<ResolvedThumbnailBoard, 'kind' | 'slug' | 'version'>,
	theme: 'light' | 'dark',
	page: number
) {
	return `mcp/${board.kind}/${board.slug}/${board.version}/${DEFAULT_THUMBNAIL_WIDTH}x${DEFAULT_THUMBNAIL_HEIGHT}/${theme}/page-${page}.png`
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

	// Not rate limited: the limiters here bound Browser Run, and this call spends none.
	try {
		const resolved = await resolveSharedBoardForUser(env, input.boardId, userId)
		if (!resolved.ok) {
			return toolError(
				resolved.reason === 'board_empty' ? 'This board has no saved content yet.' : BOARD_NOT_FOUND
			)
		}

		// Read under the gate the board resolved under, not a fixed one, so a private file the caller
		// owns is readable and a published board is still held to the published check.
		const snapshot = await loadBoardSnapshot(env, resolved.board, {
			access: resolved.board.access,
		})
		if (!snapshot) {
			return toolError('This board has no saved content yet.')
		}
		const pages = enumerateBoardPages(snapshot)
		return toolJsonResult({
			name: getDocumentNameFromSnapshot(snapshot),
			pageCount: pages.length,
			pages: pages.map((p) => ({ index: p.index, name: p.name, hasContent: p.hasContent })),
		})
	} catch (error) {
		// The caller gets a bounded description, but nothing else records it: this tool writes no
		// telemetry (it spends no Browser Run), so without a report a failing board lookup is
		// invisible to us.
		reportThumbnailError(error, {
			ctx,
			env,
			request,
			surface: 'mcp_board_info',
		})
		return toolError(
			`Could not read board info: ${describeThumbnailFailure(classifyScreenshotFailure(error))}.`
		)
	}
}

async function callSharedBoardScreenshotTool(
	argumentsValue: unknown,
	request: Request,
	env: Environment,
	userId: string,
	ctx?: ExecutionContext
) {
	// Hashed rather than raw, so the dataset holds an account that spend or abuse can be traced back
	// to without carrying user ids around. Replaces the hashed client IP this used before it required
	// authentication — IP was weak in both directions, evaded by a proxy pool and shared across a NAT.
	const callerHash = await sha256(userId)
	let input: SharedBoardScreenshotInput
	try {
		input = parseSharedBoardScreenshotInput(argumentsValue)
	} catch (error) {
		// Telemetry gets a bounded reason code; the caller gets the specific validation message.
		writeScreenshotTelemetry(env, {
			source: 'mcp',
			callerHash,
			cacheStatus: 'miss',
			failureReason: 'invalid_input',
		})
		return toolError(error instanceof Error ? error.message : String(error))
	}

	const telemetry = (data: {
		cacheStatus: 'hit' | 'miss'
		browserRunDurationMs?: number
		failureReason?: string
		rateLimitAllowed?: boolean
	}) => {
		writeScreenshotTelemetry(env, { source: 'mcp', callerHash, ...data })
	}

	// Checked before the cache, unlike the two below: this is the per-caller ceiling on calls, not on
	// captures, so a caller looping over cache hits is still bounded.
	if (
		await isRateLimited(env.MCP_SCREENSHOT_RATE_LIMITER, `user:${userId}`, {
			fallbackLimit: MCP_PER_USER_RATE_LIMIT,
		})
	) {
		telemetry({ cacheStatus: 'miss', rateLimitAllowed: false, failureReason: 'rate_limited_user' })
		return toolError(
			`Rate limited. Board screenshots are limited to about ${MCP_PER_USER_RATE_LIMIT} requests per minute per account.`
		)
	}

	try {
		// The access check runs here, ahead of everything below it, and that ordering is load-bearing:
		// the cache read further down is what it gates. `MCP_SCREENSHOTS` keys carry no viewer
		// dimension, so a private board cached for its owner would otherwise be served to anyone who
		// named the right board id. Gating the read rather than adding a viewer to the key is also the
		// cheaper fix — a viewer dimension would multiply the object count and turn one shared render
		// into one render per caller.
		const resolved = await resolveSharedBoardForUser(env, input.boardId, userId)
		if (!resolved.ok) {
			if (resolved.reason === 'board_empty') {
				telemetry({ cacheStatus: 'miss', failureReason: 'board_empty' })
				return toolError('This board has no saved content to screenshot yet.')
			}
			telemetry({ cacheStatus: 'miss', failureReason: 'not_found' })
			return toolError(BOARD_NOT_FOUND)
		}
		const board = resolved.board
		if (!env.MCP_DATA_BUCKET) {
			throw new Error('MCP_DATA_BUCKET bucket is not configured')
		}

		// The cache key is derived from the requested ordinal alone, so a cache hit skips loading the
		// board snapshot entirely; the page name rides in the cached object's metadata.
		const cacheKey = getThumbnailPageCacheKey(board, input.theme, input.page)
		const cached = await env.MCP_DATA_BUCKET.get(cacheKey)
		if (cached) {
			telemetry({ cacheStatus: 'hit' })
			return toolPageResult(
				decodeThumbnailPageName(cached.customMetadata?.pageName),
				arrayBufferToBase64(await cached.arrayBuffer())
			)
		}

		// Cache miss: load the snapshot to resolve the ordinal to a real page (id + name) and validate
		// the range.
		const snapshot = await loadBoardSnapshot(env, board, { access: board.access })
		if (!snapshot) {
			telemetry({ cacheStatus: 'miss', failureReason: 'board_empty' })
			return toolError('This board has no saved content to screenshot yet.')
		}
		const pages = enumerateBoardPages(snapshot)
		if (pages.length === 0) {
			telemetry({ cacheStatus: 'miss', failureReason: 'no_pages' })
			return toolError('This board has no pages to screenshot.')
		}
		if (input.page >= pages.length) {
			telemetry({ cacheStatus: 'miss', failureReason: 'page_out_of_range' })
			return toolError(
				`Page ${input.page} is out of range: this board has ${pages.length} page(s) (0–${pages.length - 1}). Call get_board_info to list them.`
			)
		}
		const targetPage = pages[input.page]

		// Only cache misses spend Browser Rendering capacity, so the per-board and global guards sit
		// here rather than at the top of the tool call.
		if (
			await isRateLimited(env.MCP_SERVER_BOARD_RATE_LIMITER, `board:${input.boardId}`, {
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

		const render = await captureThumbnailScreenshot(env, board, {
			surface: 'mcp',
			pageId: targetPage.id,
			theme: input.theme,
			width: DEFAULT_THUMBNAIL_WIDTH,
			height: DEFAULT_THUMBNAIL_HEIGHT,
		})

		// The render is already paid for and the PNG in hand is what the caller asked for, so a failed
		// cache write must not throw it away — that would turn a working screenshot into a tool error and
		// burn the caller's rate-limit budget for nothing. Reported rather than raised: the caller can't
		// act on it, but a cache that stops absorbing writes means every call re-renders. The page name is
		// URI-encoded because R2 custom metadata is not reliably unicode-safe.
		try {
			await putThumbnailPng(env.MCP_DATA_BUCKET, cacheKey, render.base64, board.version, {
				pageName: encodeURIComponent(targetPage.name),
			})
		} catch (error) {
			reportThumbnailError(error, {
				ctx,
				env,
				request,
				surface: 'mcp_screenshot_cache_write',
				extras: { page: input.page, theme: input.theme },
			})
		}

		telemetry({ cacheStatus: 'miss', browserRunDurationMs: render.durationMs })
		return toolPageResult(targetPage.name, render.base64)
	} catch (error) {
		// One bounded reason code drives both the telemetry blob (so unbounded error strings never inflate
		// that dimension) and the caller's message (so internal Postgres/R2 detail never reaches an
		// outside caller, authenticated or not). Sentry gets the unbounded original.
		reportThumbnailError(error, {
			ctx,
			env,
			request,
			surface: 'mcp_screenshot',
			extras: { page: input.page, theme: input.theme },
		})
		const failureReason = classifyScreenshotFailure(error)
		// A capture that failed still held a browser, so its duration belongs on the datapoint the same
		// as a successful one's. Undefined when the failure came before the capture and spent nothing.
		telemetry({
			cacheStatus: 'miss',
			failureReason,
			browserRunDurationMs: browserRunDurationOf(error),
		})
		return toolError(`Screenshot failed: ${describeThumbnailFailure(failureReason)}.`)
	}
}

function toolError(message: string) {
	return {
		content: [{ type: 'text', text: message }],
		isError: true,
	}
}

function toolPageResult(name: string, base64: string) {
	return {
		content: [
			{ type: 'text', text: name },
			{ type: 'image', data: base64, mimeType: 'image/png' },
		],
	}
}

function toolJsonResult(value: unknown) {
	return {
		content: [{ type: 'text', text: JSON.stringify(value) }],
	}
}

function decodeThumbnailPageName(value: string | undefined): string {
	if (!value) return 'Page'
	try {
		return decodeURIComponent(value)
	} catch {
		return value
	}
}

function getBoardInfoToolDefinition() {
	return {
		name: BOARD_INFO_TOOL_NAME,
		title: 'Get tldraw board info',
		description:
			'Return metadata for a tldraw.com board you have access to: its name, page count, and the name, 0-based index, and hasContent flag for each page. Call this first to discover pages, then pass a page index to get_shared_board_screenshot. Accepts the id of a file you can open (the :slug in tldraw.com/f/:slug) or of a published board (the :slug in tldraw.com/p/:slug).',
		inputSchema: {
			type: 'object',
			additionalProperties: false,
			properties: {
				boardId: {
					type: 'string',
					description:
						'The id of a tldraw.com board: the :slug of a file URL (https://www.tldraw.com/f/:slug) you own or that was shared with you, or of a published board URL (https://www.tldraw.com/p/:slug).',
				},
			},
			required: ['boardId'],
		},
		annotations: {
			readOnlyHint: true,
			idempotentHint: true,
			openWorldHint: false,
			destructiveHint: false,
		},
	}
}

function getSharedBoardScreenshotToolDefinition() {
	return {
		name: SCREENSHOT_TOOL_NAME,
		title: 'Get shared tldraw board screenshot',
		description:
			`Return a ${DEFAULT_THUMBNAIL_WIDTH}x${DEFAULT_THUMBNAIL_HEIGHT} content-fit PNG screenshot of a single page of a tldraw.com board you have access to, preceded by the page name. Each call renders exactly one page; use get_board_info to list a board's pages, then pass the page's index. ` +
			'Accepts the id of a file you can open (the :slug in tldraw.com/f/:slug) or of a published board (the :slug in tldraw.com/p/:slug), and renders through a signed tldraw-owned render job.',
		inputSchema: {
			type: 'object',
			additionalProperties: false,
			properties: {
				boardId: {
					type: 'string',
					description:
						'The id of a tldraw.com board: the :slug of a file URL (https://www.tldraw.com/f/:slug) you own or that was shared with you, or of a published board URL (https://www.tldraw.com/p/:slug).',
				},
				page: {
					type: 'number',
					description:
						'0-based index of the page to screenshot (see get_board_info). Defaults to 0, the first page.',
					default: 0,
				},
				theme: {
					type: 'string',
					enum: ['light', 'dark'],
					default: 'light',
				},
			},
			required: ['boardId'],
		},
		annotations: {
			readOnlyHint: true,
			idempotentHint: true,
			openWorldHint: false,
			destructiveHint: false,
		},
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

function jsonRpcError(id: JsonRpcId, code: number, message: string) {
	return Response.json({
		jsonrpc: '2.0',
		id,
		error: { code, message },
	})
}
