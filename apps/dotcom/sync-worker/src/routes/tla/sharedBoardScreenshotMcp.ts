import { MAX_THUMBNAIL_PAGES, THUMBNAIL_RENDER_PATH } from '@tldraw/dotcom-shared'
import { RoomSnapshot } from '@tldraw/sync-core'
import { IRequest } from 'itty-router'
import { getR2KeyForRoom } from '../../r2'
import { Environment } from '../../types'
import { writeDataPoint } from '../../utils/analytics'
import {
	THUMBNAIL_RENDER_TOKEN_TTL_MS,
	ThumbnailRenderJob,
	mintThumbnailRenderToken,
} from '../../utils/renderTokens'
import { getDocumentNameFromSnapshot } from '../getDocumentNameFromSnapshot'
import { getPublishedFileInfo, getPublishedRoomSnapshot } from './getPublishedFile'
import {
	getSharedFileInfo,
	getSharedFileRoomSnapshot,
	isFileAnonymouslyViewable,
} from './getSharedFile'
import { sha256 } from './thumbnailShared'

const SCREENSHOT_TOOL_NAME = 'get_shared_board_screenshot'
const BOARD_INFO_TOOL_NAME = 'get_board_info'
const MCP_PROTOCOL_VERSION = '2024-11-05'
export const DEFAULT_THUMBNAIL_WIDTH = 1200
export const DEFAULT_THUMBNAIL_HEIGHT = 630
// Bounds page navigation and the render-page settle+export wait inside the Browser Rendering
// screenshot Quick Action.
const RENDER_TIMEOUT_MS = 45_000
// The render page sets this once its exported image has painted; the screenshot Quick Action waits
// on it before capturing. A page that errors never sets it, so the capture times out (surfaced as a
// render failure) rather than screenshotting a broken page.
const RENDER_READY_SELECTOR = '[data-thumbnail-ready="true"]'

// Per-IP and per-board limits protect the endpoint and individual boards; the global limit caps
// total Browser Rendering spend across all callers. The Cloudflare bindings in wrangler.toml enforce
// these in deployments; the isolate-local fallback only covers local dev and tests.
const PER_IP_RATE_LIMIT = 20
const PER_BOARD_RATE_LIMIT = 20
// The single limiter key every Browser Run-spending surface (this tool and the OG queue consumer)
// passes, so they draw from one shared global cap instead of separate per-key buckets.
export const GLOBAL_BROWSER_RATE_LIMIT_KEY = 'global'
export const GLOBAL_BROWSER_RUN_RATE_LIMIT = 60
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_FALLBACK = new Map<string, { count: number; resetAt: number }>()

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

interface ResolvedBoard {
	kind: 'published' | 'shared_file'
	slug: string
	fileId: string
	version: string | number
}

type ResolveBoardResult =
	| { ok: true; board: ResolvedBoard }
	| { ok: false; reason: 'not_found' | 'board_empty' }

// A board page in stable board order. `index` is the 0-based ordinal callers pass to the screenshot
// tool; `id` is the internal TLPageId used to drive the render page.
interface EnumeratedPage {
	index: number
	id: string
	name: string
	hasContent: boolean
}

export async function sharedBoardScreenshotMcp(
	request: IRequest,
	env: Environment
): Promise<Response> {
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
						await callBoardInfoTool(rpcRequest.params.arguments, request, env)
					)
				case SCREENSHOT_TOOL_NAME:
					return jsonRpcResult(
						rpcRequest.id,
						await callSharedBoardScreenshotTool(rpcRequest.params.arguments, request, env)
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
		theme: value.theme === 'dark' ? 'dark' : 'light',
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

function parsePageOrdinal(value: unknown): number {
	if (value === undefined || value === null) return 0
	if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
		throw new Error('page must be a non-negative integer (0-based page ordinal)')
	}
	return value
}

// A board id is tried as a shared file id first (the /f/:slug namespace, where the slug is the
// file id) and as a published-board slug (/p/:slug) second, so callers never need to know which
// kind of board they hold. Both paths apply the same gates: shared files must currently be shared
// via link and have persisted content, published boards must be published.
export async function resolveSharedBoardById(
	env: Environment,
	boardId: string
): Promise<ResolveBoardResult> {
	const file = await getSharedFileInfo(env, boardId)
	if (file && isFileAnonymouslyViewable(file)) {
		// The persisted room's R2 etag rotates when the board content changes, so it keys the
		// thumbnail cache without a separate content-version field.
		const persisted = await env.ROOMS.head(getR2KeyForRoom({ slug: boardId, isApp: true }))
		if (persisted) {
			return {
				ok: true,
				board: { kind: 'shared_file', slug: boardId, fileId: file.id, version: persisted.etag },
			}
		}
		return { ok: false, reason: 'board_empty' }
	}

	const published = await getPublishedFileInfo(env, boardId)
	if (published?.published) {
		return {
			ok: true,
			board: {
				kind: 'published',
				slug: boardId,
				fileId: published.id,
				version: published.lastPublished,
			},
		}
	}

	return { ok: false, reason: 'not_found' }
}

async function loadBoardSnapshot(
	env: Environment,
	board: ResolvedBoard
): Promise<RoomSnapshot | null> {
	try {
		const snapshot =
			board.kind === 'published'
				? await getPublishedRoomSnapshot(env, board.slug)
				: await getSharedFileRoomSnapshot(env, board.slug)
		return snapshot ?? null
	} catch {
		return null
	}
}

// Lists a board's pages in the same order the editor shows them. tldraw page indexes are fractional
// indexes that sort lexicographically, so a plain string sort matches the editor's ordering. A page
// "has content" when at least one shape sits directly on it (nested shapes always have a top-level
// ancestor on their page, so checking direct children is sufficient).
export function enumerateBoardPages(snapshot: RoomSnapshot): EnumeratedPage[] {
	const records = snapshot.documents.map((d) => d.state) as any[]
	const pageRecords = records.filter((r) => r?.typeName === 'page')
	pageRecords.sort((a, b) => (a.index < b.index ? -1 : a.index > b.index ? 1 : 0))
	const parentIdsWithShapes = new Set(
		records.filter((r) => r?.typeName === 'shape').map((s) => s.parentId)
	)
	return pageRecords.slice(0, MAX_THUMBNAIL_PAGES).map((p, index) => ({
		index,
		id: String(p.id),
		name: typeof p.name === 'string' && p.name.length > 0 ? p.name : `Page ${index + 1}`,
		hasContent: parentIdsWithShapes.has(p.id),
	}))
}

// One R2 cache key per page. The ordinal keys the object directly; the version and theme are in the
// path, so republishing or editing rotates every page's key.
export function getThumbnailPageCacheKey(
	board: Pick<ResolvedBoard, 'kind' | 'slug' | 'version'>,
	theme: 'light' | 'dark',
	page: number
) {
	return `mcp/${board.kind}/${board.slug}/${board.version}/${DEFAULT_THUMBNAIL_WIDTH}x${DEFAULT_THUMBNAIL_HEIGHT}/${theme}/page-${page}.png`
}

export function buildThumbnailRenderUrl(renderOrigin: string, token: string) {
	const url = new URL(THUMBNAIL_RENDER_PATH, renderOrigin)
	url.searchParams.set('token', token)
	return url.toString()
}

async function callBoardInfoTool(argumentsValue: unknown, request: Request, env: Environment) {
	const clientIp = getClientIp(request)
	let input: { boardId: string }
	try {
		input = parseBoardInfoInput(argumentsValue)
	} catch (error) {
		return toolError(error instanceof Error ? error.message : String(error))
	}

	if (
		await isRateLimited(env.MCP_SCREENSHOT_RATE_LIMITER, `ip:${clientIp ?? 'unknown'}`, {
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
		return toolError(
			`Could not read board: ${error instanceof Error ? error.message : String(error)}`
		)
	}
}

async function callSharedBoardScreenshotTool(
	argumentsValue: unknown,
	request: Request,
	env: Environment
) {
	const clientIp = getClientIp(request)
	const ipHash = clientIp ? await sha256(clientIp) : 'unknown'
	let input: SharedBoardScreenshotInput
	try {
		input = parseSharedBoardScreenshotInput(argumentsValue)
	} catch (error) {
		const failureReason = error instanceof Error ? error.message : String(error)
		writeMcpScreenshotTelemetry(env, {
			boardHash: 'unresolved',
			ipHash,
			cacheStatus: 'miss',
			rateLimitAllowed: true,
			failureReason,
		})
		return toolError(failureReason)
	}

	const boardHash = await sha256(input.boardId)
	const telemetry = (data: {
		cacheStatus: 'hit' | 'miss'
		browserRunDurationMs?: number
		failureReason?: string
		rateLimitAllowed?: boolean
	}) => {
		writeMcpScreenshotTelemetry(env, { boardHash, ipHash, rateLimitAllowed: true, ...data })
	}

	if (
		await isRateLimited(env.MCP_SCREENSHOT_RATE_LIMITER, `ip:${clientIp ?? 'unknown'}`, {
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

		const job: ThumbnailRenderJob = {
			v: 1,
			kind: board.kind,
			slug: board.slug,
			fileId: board.fileId,
			version: board.version,
			camera: 'content',
			pageId: targetPage.id,
			x: 0,
			y: 0,
			z: 1,
			width: DEFAULT_THUMBNAIL_WIDTH,
			height: DEFAULT_THUMBNAIL_HEIGHT,
			theme: input.theme,
			exp: Date.now() + THUMBNAIL_RENDER_TOKEN_TTL_MS,
		}
		const token = await mintThumbnailRenderToken(env, job)
		const renderUrl = buildThumbnailRenderUrl(getRenderOrigin(env), token)
		const render = await renderThumbnailScreenshot(renderUrl, env)

		await writeThumbnailPage(
			env.THUMBNAILS,
			cacheKey,
			targetPage.name,
			render.base64,
			board.version
		)

		telemetry({ cacheStatus: 'miss', browserRunDurationMs: render.durationMs })
		return toolPageResult(targetPage.name, render.base64)
	} catch (error) {
		const failureReason = error instanceof Error ? error.message : String(error)
		telemetry({ cacheStatus: 'miss', failureReason })
		return toolError(`Screenshot failed: ${failureReason}`)
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

// Writes one rendered page to the cache, stamping the content version (so a stale version can be
// detected) and the URI-encoded page name (R2 custom metadata is not reliably unicode-safe).
async function writeThumbnailPage(
	bucket: R2Bucket,
	key: string,
	pageName: string,
	base64: string,
	version: string | number
) {
	await bucket.put(key, base64ToArrayBuffer(base64), {
		httpMetadata: { contentType: 'image/png' },
		customMetadata: {
			version: String(version),
			createdAt: String(Date.now()),
			pageName: encodeURIComponent(pageName),
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

// The thumbnail pixels come from editor.toImage on the render page: the page exports the target page
// itself and displays it as a full-viewport image, and the Browser Rendering `/screenshot` Quick
// Action (called straight through the BROWSER binding, no puppeteer, no API token) captures exactly
// that. Chrome runs in Cloudflare's fleet, not in this isolate. A page that fails to export never
// sets the ready selector, so the capture times out and surfaces as a render failure.
export async function renderThumbnailScreenshot(
	renderUrl: string,
	env: Environment
): Promise<{ base64: string; durationMs: number }> {
	if (!env.BROWSER) {
		throw new Error(
			'Browser Rendering is not configured. Set the BROWSER binding (local dev needs Cloudflare credentials).'
		)
	}

	const startedAt = Date.now()
	const response = await env.BROWSER.rest.screenshot(getScreenshotRequestBody(renderUrl))
	const durationMs = Date.now() - startedAt

	if (!response.ok) {
		throw new Error(`Browser Rendering screenshot failed (${response.status})`)
	}
	const buffer = await response.arrayBuffer()
	if (buffer.byteLength === 0) {
		throw new Error('Render produced an empty screenshot')
	}
	return { base64: arrayBufferToBase64(buffer), durationMs }
}

function getScreenshotRequestBody(renderUrl: string) {
	const headers = getExtraHeaders(renderUrl)
	return {
		url: renderUrl,
		...(headers ? { setExtraHTTPHeaders: headers } : null),
		viewport: {
			width: DEFAULT_THUMBNAIL_WIDTH,
			height: DEFAULT_THUMBNAIL_HEIGHT,
			deviceScaleFactor: 1,
		},
		// Waiting for the ready selector is the real completion signal; waiting for network idle is
		// fragile because background app requests (e.g. replicator-status polling) can keep the
		// network busy indefinitely.
		gotoOptions: {
			waitUntil: 'load',
			timeout: RENDER_TIMEOUT_MS,
		},
		waitForSelector: {
			selector: RENDER_READY_SELECTOR,
			timeout: RENDER_TIMEOUT_MS,
		},
		screenshotOptions: {
			type: 'png',
			fullPage: false,
		},
	}
}

export async function isRateLimited(
	limiter: RateLimit | undefined,
	key: string,
	{ fallbackLimit }: { fallbackLimit: number }
): Promise<boolean> {
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
		RATE_LIMIT_FALLBACK.set(rateLimitKey, {
			count: 1,
			resetAt: now + RATE_LIMIT_WINDOW_MS,
		})
		return false
	}
	existing.count++
	return existing.count > fallbackLimit
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

export function getRenderOrigin(env: Environment) {
	// Staging and production set this in wrangler.toml to their own client origin. Local dev sets it
	// to the local client; previews configure it explicitly when they need to exercise this path.
	if (!env.MCP_SCREENSHOT_RENDER_ORIGIN) {
		throw new Error(
			`MCP_SCREENSHOT_RENDER_ORIGIN is not configured. It must point at an origin that serves the ${THUMBNAIL_RENDER_PATH} render page.`
		)
	}
	return env.MCP_SCREENSHOT_RENDER_ORIGIN
}

function getExtraHeaders(renderUrl: string) {
	const { hostname } = new URL(renderUrl)
	if (hostname.endsWith('.ngrok-free.dev')) {
		return {
			'ngrok-skip-browser-warning': 'true',
		}
	}
	return null
}

function getClientIp(request: Request) {
	const forwardedFor = request.headers.get('x-forwarded-for')
	return request.headers.get('cf-connecting-ip') ?? forwardedFor?.split(',')[0]?.trim() ?? null
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
	const bytes = new Uint8Array(buffer)
	let binary = ''
	for (let i = 0; i < bytes.length; i += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
	}
	return btoa(binary)
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
	const binary = atob(base64)
	const bytes = new Uint8Array(binary.length)
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i)
	}
	return bytes.buffer
}

function writeMcpScreenshotTelemetry(
	env: Environment,
	data: {
		boardHash: string
		ipHash: string
		cacheStatus: 'hit' | 'miss'
		browserRunDurationMs?: number
		failureReason?: string
		rateLimitAllowed: boolean
	}
) {
	writeDataPoint(undefined, env.MEASURE, env, 'mcp_shared_board_screenshot', {
		blobs: [
			'source:mcp',
			`cache:${data.cacheStatus}`,
			`failure:${data.failureReason ?? 'none'}`,
			`rate_limit:${data.rateLimitAllowed ? 'allowed' : 'blocked'}`,
			`ip:${data.ipHash}`,
		],
		indexes: [data.boardHash],
		doubles: [
			DEFAULT_THUMBNAIL_WIDTH,
			DEFAULT_THUMBNAIL_HEIGHT,
			data.browserRunDurationMs ?? -1,
			-1,
			data.rateLimitAllowed ? 1 : 0,
		],
	})
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
