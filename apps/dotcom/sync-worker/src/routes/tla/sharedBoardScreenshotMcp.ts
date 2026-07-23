import { DEFAULT_THUMBNAIL_HEIGHT, DEFAULT_THUMBNAIL_WIDTH } from '@tldraw/dotcom-shared'
import { IRequest } from 'itty-router'
import { Environment } from '../../types'
import { arrayBufferToBase64 } from '../../utils/base64'
import { getDocumentNameFromSnapshot } from '../getDocumentNameFromSnapshot'
import {
	GLOBAL_BROWSER_RATE_LIMIT_KEY,
	GLOBAL_BROWSER_RUN_RATE_LIMIT,
	ResolveThumbnailBoardResult,
	ResolvedThumbnailBoard,
	captureThumbnailScreenshot,
	enumerateBoardPages,
	isRateLimited,
	loadBoardSnapshot,
	putThumbnailPng,
	resolveThumbnailBoard,
	writeScreenshotTelemetry,
} from './thumbnailRender'
import {
	classifyScreenshotFailure,
	describeThumbnailFailure,
	reportThumbnailError,
	sha256,
} from './thumbnailShared'

// The MCP protocol surface over the shared render-and-cache core in thumbnailRender.ts: JSON-RPC
// plumbing, tool definitions, input parsing, and the MCP tools' own per-IP/per-board rate limits
// and `mcp/` cache keys.

const SCREENSHOT_TOOL_NAME = 'get_shared_board_screenshot'
const BOARD_INFO_TOOL_NAME = 'get_board_info'
const MCP_PROTOCOL_VERSION = '2024-11-05'

// Per-IP and per-board limits protect the endpoint and individual boards; the global limit in
// thumbnailRender.ts caps total Browser Rendering spend across all callers. The Cloudflare bindings
// in wrangler.toml enforce these in deployments; the isolate-local fallback only covers local dev
// and tests.
const PER_IP_RATE_LIMIT = 2
const PER_BOARD_RATE_LIMIT = 2

type JsonRpcId = string | number | null

interface JsonRpcRequest {
	jsonrpc?: string
	id?: JsonRpcId
	method?: string
	params?: {
		name?: string
		arguments?: unknown
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

	if (request.method !== 'POST') {
		return new Response('MCP screenshot server expects POST', { status: 405 })
	}

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
				protocolVersion: MCP_PROTOCOL_VERSION,
				capabilities: { tools: {} },
				serverInfo: {
					name: 'tldraw-shared-board-screenshot',
					title: 'tldraw shared board screenshots',
					version: '2.0.0',
				},
				instructions:
					'MCP server for public tldraw.com boards. get_board_info lists a board’s pages; get_shared_board_screenshot returns a PNG for one page. Accepts published tldraw.com/p/:slug boards and anonymously-shared tldraw.com/f/:slug files, rendered through a signed, tldraw-owned render job.',
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
						await callBoardInfoTool(rpcRequest.params.arguments, request, env, ctx)
					)
				case SCREENSHOT_TOOL_NAME:
					return jsonRpcResult(
						rpcRequest.id,
						await callSharedBoardScreenshotTool(rpcRequest.params.arguments, request, env, ctx)
					)
				default:
					return jsonRpcError(rpcRequest.id, -32602, `Unknown tool: ${rpcRequest.params?.name}`)
			}
		default:
			return jsonRpcError(rpcRequest.id, -32601, `Method not found: ${rpcRequest.method}`)
	}
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

// A board id is tried as a shared file id first (the /f/:slug namespace, where the slug is the
// file id) and as a published-board slug (/p/:slug) second, so callers never need to know which
// kind of board they hold. A shared file that resolves as empty is still the caller's board, so it
// does not fall through to the published lookup and get misreported as not found.
export async function resolveSharedBoardById(
	env: Environment,
	boardId: string
): Promise<ResolveThumbnailBoardResult> {
	const shared = await resolveThumbnailBoard(env, 'shared_file', boardId)
	if (shared.ok || shared.reason === 'board_empty') return shared
	return resolveThumbnailBoard(env, 'published', boardId)
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
	ctx?: ExecutionContext
) {
	const clientIp = getClientIp(request)
	let input: { boardId: string }
	try {
		input = parseBoardInfoInput(argumentsValue)
	} catch (error) {
		return toolError(error instanceof Error ? error.message : String(error))
	}

	// get_board_info spends no Browser Run, so it gets its own per-IP budget rather than sharing the
	// screenshot one — otherwise the usual "list once, then screenshot pages" flow would exhaust the
	// per-IP limit on the very first (free) call.
	if (
		await isRateLimited(env.MCP_SCREENSHOT_RATE_LIMITER, `ip-info:${clientIp ?? 'unknown'}`, {
			fallbackLimit: PER_IP_RATE_LIMIT,
		})
	) {
		return toolError(
			`Rate limited. Requests are limited to about ${PER_IP_RATE_LIMIT} per minute per IP.`
		)
	}

	try {
		const resolved = await resolveSharedBoardById(env, input.boardId)
		if (!resolved.ok) {
			return toolError(
				resolved.reason === 'board_empty'
					? 'This board has no saved content yet.'
					: 'No public board was found with this id. Only published boards and files shared via link are supported.'
			)
		}

		const snapshot = await loadBoardSnapshot(env, resolved.board)
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
			extras: { boardId: input.boardId },
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
	ctx?: ExecutionContext
) {
	const clientIp = getClientIp(request)
	const ipHash = clientIp ? await sha256(clientIp) : 'unknown'
	let input: SharedBoardScreenshotInput
	try {
		input = parseSharedBoardScreenshotInput(argumentsValue)
	} catch (error) {
		// Telemetry gets a bounded reason code; the caller gets the specific validation message.
		writeScreenshotTelemetry(env, {
			source: 'mcp',
			boardHash: 'unresolved',
			ipHash,
			cacheStatus: 'miss',
			failureReason: 'invalid_input',
		})
		return toolError(error instanceof Error ? error.message : String(error))
	}

	const boardHash = await sha256(input.boardId)
	const telemetry = (data: {
		cacheStatus: 'hit' | 'miss'
		browserRunDurationMs?: number
		failureReason?: string
		rateLimitAllowed?: boolean
	}) => {
		writeScreenshotTelemetry(env, { source: 'mcp', boardHash, ipHash, ...data })
	}

	// Screenshots have their own per-IP budget (separate from get_board_info), sized to the ~2/min
	// Browser Run cap: this is the throttle that actually bounds Browser Run spend per client.
	if (
		await isRateLimited(env.MCP_SCREENSHOT_RATE_LIMITER, `ip-shot:${clientIp ?? 'unknown'}`, {
			fallbackLimit: PER_IP_RATE_LIMIT,
		})
	) {
		telemetry({ cacheStatus: 'miss', rateLimitAllowed: false, failureReason: 'rate_limited_ip' })
		return toolError(
			`Rate limited. Shared board screenshots are limited to about ${PER_IP_RATE_LIMIT} requests per minute per IP.`
		)
	}

	try {
		const resolved = await resolveSharedBoardById(env, input.boardId)
		if (!resolved.ok) {
			if (resolved.reason === 'board_empty') {
				telemetry({ cacheStatus: 'miss', failureReason: 'board_empty' })
				return toolError('This board has no saved content to screenshot yet.')
			}
			telemetry({ cacheStatus: 'miss', failureReason: 'not_found' })
			return toolError(
				'No public board was found with this id. Only published boards and files shared via link can be screenshotted.'
			)
		}
		const board = resolved.board
		if (!env.THUMBNAILS) {
			throw new Error('THUMBNAILS bucket is not configured')
		}

		// The cache key is derived from the requested ordinal alone, so a cache hit skips loading the
		// board snapshot entirely; the page name rides in the cached object's metadata.
		const cacheKey = getThumbnailPageCacheKey(board, input.theme, input.page)
		const cached = await env.THUMBNAILS.get(cacheKey)
		if (cached) {
			telemetry({ cacheStatus: 'hit' })
			return toolPageResult(
				decodeThumbnailPageName(cached.customMetadata?.pageName),
				arrayBufferToBase64(await cached.arrayBuffer())
			)
		}

		// Cache miss: load the snapshot to resolve the ordinal to a real page (id + name) and validate
		// the range.
		const snapshot = await loadBoardSnapshot(env, board)
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
			await isRateLimited(env.MCP_SCREENSHOT_RATE_LIMITER, `board:${input.boardId}`, {
				fallbackLimit: PER_BOARD_RATE_LIMIT,
			})
		) {
			telemetry({
				cacheStatus: 'miss',
				rateLimitAllowed: false,
				failureReason: 'rate_limited_board',
			})
			return toolError('Rate limited. This board is being screenshotted too frequently.')
		}
		if (
			await isRateLimited(env.MCP_SCREENSHOT_BROWSER_RATE_LIMITER, GLOBAL_BROWSER_RATE_LIMIT_KEY, {
				fallbackLimit: GLOBAL_BROWSER_RUN_RATE_LIMIT,
			})
		) {
			telemetry({
				cacheStatus: 'miss',
				rateLimitAllowed: false,
				failureReason: 'rate_limited_global',
			})
			return toolError('Rate limited. Screenshot capacity is busy, try again in a minute.')
		}

		const render = await captureThumbnailScreenshot(env, board, {
			pageId: targetPage.id,
			theme: input.theme,
			width: DEFAULT_THUMBNAIL_WIDTH,
			height: DEFAULT_THUMBNAIL_HEIGHT,
		})

		// The render is already paid for in Browser Run capacity and the PNG in hand is exactly what the
		// caller asked for, so a failed cache write must not throw it away — that would turn a working
		// screenshot into a tool error and burn the caller's rate-limit budget for nothing. Report it
		// instead: the caller can't act on it, but a cache that stops absorbing writes means every
		// subsequent call re-renders, which we do need to see. The page name is URI-encoded into the
		// object metadata (R2 custom metadata is not reliably unicode-safe).
		try {
			await putThumbnailPng(env.THUMBNAILS, cacheKey, render.base64, board.version, {
				pageName: encodeURIComponent(targetPage.name),
			})
		} catch (error) {
			reportThumbnailError(error, {
				ctx,
				env,
				request,
				surface: 'mcp_screenshot_cache_write',
				extras: { boardId: input.boardId, page: input.page, theme: input.theme },
			})
		}

		telemetry({ cacheStatus: 'miss', browserRunDurationMs: render.durationMs })
		return toolPageResult(targetPage.name, render.base64)
	} catch (error) {
		// One bounded reason code drives both the telemetry blob (so unbounded error strings never
		// inflate that dimension's cardinality) and the caller's message (so internal Postgres/R2
		// detail never reaches this anonymous, unauthenticated endpoint). Sentry gets the unbounded
		// original: this is the surface that actually spends Browser Run, so a Quick Action failing or
		// the render page erroring out is the thing we most need the stack for.
		reportThumbnailError(error, {
			ctx,
			env,
			request,
			surface: 'mcp_screenshot',
			extras: { boardId: input.boardId, page: input.page, theme: input.theme },
		})
		const failureReason = classifyScreenshotFailure(error)
		telemetry({ cacheStatus: 'miss', failureReason })
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
			'Return metadata for a public tldraw.com board: its name, page count, and the name, 0-based index, and hasContent flag for each page. Call this first to discover pages, then pass a page index to get_shared_board_screenshot. Accepts the id of a published board (the :slug in tldraw.com/p/:slug) or an anonymously-shared file (the :slug in tldraw.com/f/:slug).',
		inputSchema: {
			type: 'object',
			additionalProperties: false,
			properties: {
				boardId: {
					type: 'string',
					description:
						'The id of a public tldraw.com board: the :slug of a published board URL (https://www.tldraw.com/p/:slug) or of an anonymously-shared file URL (https://www.tldraw.com/f/:slug).',
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
			`Return a ${DEFAULT_THUMBNAIL_WIDTH}x${DEFAULT_THUMBNAIL_HEIGHT} content-fit PNG screenshot of a single page of a public tldraw.com board, preceded by the page name. Each call renders exactly one page; use get_board_info to list a board's pages, then pass the page's index. ` +
			'Accepts the id of a published board (the :slug in tldraw.com/p/:slug) or an anonymously-shared file (the :slug in tldraw.com/f/:slug), and renders through a signed tldraw-owned render job.',
		inputSchema: {
			type: 'object',
			additionalProperties: false,
			properties: {
				boardId: {
					type: 'string',
					description:
						'The id of a public tldraw.com board: the :slug of a published board URL (https://www.tldraw.com/p/:slug) or of an anonymously-shared file URL (https://www.tldraw.com/f/:slug).',
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

function jsonRpcError(id: JsonRpcId, code: number, message: string) {
	return Response.json({
		jsonrpc: '2.0',
		id,
		error: { code, message },
	})
}
