import {
	DEFAULT_THUMBNAIL_HEIGHT,
	DEFAULT_THUMBNAIL_WIDTH,
	getShapeClusters,
	getShapeText,
	type TLShapeWithPlainText,
} from '@tldraw/dotcom-shared'
import { TLShape } from '@tldraw/tlschema'
import { IRequest } from 'itty-router'
import {
	MCP_GLOBAL_BROWSER_RUN_RATE_LIMIT,
	MCP_PER_BOARD_RATE_LIMIT,
	MCP_PER_IP_RATE_LIMIT,
	MCP_RATE_LIMIT_WINDOW_MS,
} from '../../config'
import { Environment } from '../../types'
import { arrayBufferToBase64 } from '../../utils/base64'
import { sha256 } from '../../utils/hash'
import { getDocumentNameFromSnapshot } from '../getDocumentNameFromSnapshot'
import {
	ResolveThumbnailBoardResult,
	ResolvedThumbnailBoard,
	captureThumbnailScreenshot,
	enumerateBoardPages,
	getShapesOnPage,
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

// The MCP protocol surface over the shared render-and-cache core in thumbnailRender.ts: JSON-RPC
// plumbing, tool definitions, input parsing, and the MCP tools' own per-IP/per-board rate limits
// and `mcp/` cache keys.

const BOARD_INFO_TOOL_NAME = 'get_board_info'
const PAGE_INFO_TOOL_NAME = 'get_page_info'
const CLUSTER_INFO_TOOL_NAME = 'get_cluster_info'
const CLUSTER_SCREENSHOT_TOOL_NAME = 'get_cluster_screenshot'
const MCP_PROTOCOL_VERSION = '2024-11-05'

// The MCP rate limit budgets themselves live in config.ts (MCP_PER_IP_RATE_LIMIT and friends), with
// the comment that maps each isolate-local fallback to its deployed Cloudflare binding. They are
// applied here rather than in the shared render core so a new surface built on those helpers cannot
// pick one up by accident.
const GLOBAL_BROWSER_RATE_LIMIT_KEY = 'global'
const RATE_LIMIT_FALLBACK = new Map<string, { count: number; resetAt: number }>()

async function isGlobalBrowserRunRateLimited(env: Environment): Promise<boolean> {
	return isRateLimited(env, env.MCP_SERVER_BROWSER_RATE_LIMITER, GLOBAL_BROWSER_RATE_LIMIT_KEY, {
		fallbackLimit: MCP_GLOBAL_BROWSER_RUN_RATE_LIMIT,
	})
}

async function isRateLimited(
	env: Environment,
	limiter: RateLimit | undefined,
	key: string,
	{ fallbackLimit }: { fallbackLimit: number }
): Promise<boolean> {
	// Local dev opts out entirely. These limits exist to bound Browser Rendering spend and to protect
	// a public, unauthenticated endpoint — a dev machine driving its own screenshot service is doing
	// neither, and a ~2/min cap makes the tools unusable to iterate against. Selected on the var
	// being set rather than on an environment name, so only an environment that configures one can
	// take this path; every deployed environment leaves it unset and stays limited.
	if (env.MCP_SCREENSHOT_RATE_LIMITS_DISABLED === 'true') return false

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
					'MCP server for public tldraw.com boards. Drill down in order: get_board_info lists a board’s pages, get_page_info lists one page’s clusters of shapes, and get_cluster_screenshot returns a PNG of one or more clusters. get_cluster_info describes the shapes inside a cluster when those matter.  Accepts published tldraw.com/p/:slug boards and anonymously-shared tldraw.com/f/:slug files, rendered through a signed, tldraw-owned render job.',
			})
		case 'ping':
			return jsonRpcResult(rpcRequest.id, {})
		case 'tools/list':
			return jsonRpcResult(rpcRequest.id, {
				tools: [
					getBoardInfoToolDefinition(),
					getPageInfoToolDefinition(),
					getClusterInfoToolDefinition(),
					getClusterScreenshotToolDefinition(),
				],
			})
		case 'tools/call':
			switch (rpcRequest.params?.name) {
				case BOARD_INFO_TOOL_NAME:
					return jsonRpcResult(
						rpcRequest.id,
						await callBoardInfoTool(rpcRequest.params.arguments, request, env, ctx)
					)
				case PAGE_INFO_TOOL_NAME:
					return jsonRpcResult(
						rpcRequest.id,
						await callPageInfoTool(rpcRequest.params.arguments, request, env, ctx)
					)
				case CLUSTER_INFO_TOOL_NAME:
					return jsonRpcResult(
						rpcRequest.id,
						await callClusterInfoTool(rpcRequest.params.arguments, request, env, ctx)
					)
				case CLUSTER_SCREENSHOT_TOOL_NAME:
					return jsonRpcResult(
						rpcRequest.id,
						await callClusterScreenshotTool(rpcRequest.params.arguments, request, env, ctx)
					)
				default:
					return jsonRpcError(rpcRequest.id, -32602, `Unknown tool: ${rpcRequest.params?.name}`)
			}
		default:
			return jsonRpcError(rpcRequest.id, -32601, `Method not found: ${rpcRequest.method}`)
	}
}

export function parseBoardInfoInput(input: unknown): { boardId: string } {
	const value = requireArgumentsObject(input)
	return { boardId: parseBoardId(value.boardId) }
}

export function parsePageInfoInput(input: unknown): { boardId: string; page: PageSelector } {
	const value = requireArgumentsObject(input)
	return { boardId: parseBoardId(value.boardId), page: parsePageSelector(value.page) }
}

export function parseClusterInfoInput(input: unknown): {
	boardId: string
	page: PageSelector
	clusterId: string
} {
	const value = requireArgumentsObject(input)
	return {
		boardId: parseBoardId(value.boardId),
		page: parsePageSelector(value.page),
		clusterId: parseClusterId(value.clusterId),
	}
}

export function parseClusterScreenshotInput(input: unknown): {
	boardId: string
	page: PageSelector
	clusterIds: string[]
	theme: 'light' | 'dark'
} {
	const value = requireArgumentsObject(input)
	return {
		boardId: parseBoardId(value.boardId),
		page: parsePageSelector(value.page),
		clusterIds: parseClusterIds(value.clusterIds),
		theme: parseTheme(value.theme),
	}
}

// Accepts one id or several. A single string is allowed because asking for one cluster is the common
// case and making callers wrap it in an array is friction for nothing.
export function parseClusterIds(value: unknown): string[] {
	if (typeof value === 'string') return [parseClusterId(value)]
	if (!Array.isArray(value) || value.length === 0) {
		throw new Error('clusterIds is required: a cluster id, or an array of them')
	}
	return value.map((id) => parseClusterId(id))
}

export function parseClusterId(value: unknown): string {
	if (typeof value !== 'string' || value.length === 0) {
		throw new Error('clusterId is required')
	}
	return value
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

// A page is named either by its 0-based ordinal or by its id. Ordinals read naturally but shift the
// moment pages are reordered, so an id a caller is holding from an earlier call keeps pointing at the
// same page. Both are accepted in the one argument so the tool surface stays small.
export type PageSelector = { kind: 'ordinal'; ordinal: number } | { kind: 'id'; id: string }

function parsePageSelector(value: unknown): PageSelector {
	if (value === undefined || value === null) return { kind: 'ordinal', ordinal: 0 }
	if (typeof value === 'string') {
		if (!value.startsWith('page:')) {
			throw new Error(
				'page must be a 0-based page ordinal (a number) or a page id (the "page:…" string from get_board_info)'
			)
		}
		return { kind: 'id', id: value }
	}
	if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
		throw new Error('page must be a non-negative integer (0-based page ordinal) or a page id')
	}
	return { kind: 'ordinal', ordinal: value }
}

/** How the page was named, for error messages that echo back what the caller actually passed. */
function describePageSelector(selector: PageSelector) {
	return selector.kind === 'id' ? `"${selector.id}"` : String(selector.ordinal)
}

// A board id is tried as a shared file id first (the /f/:slug namespace, where the slug is the
// file id) and as a published-board slug (/p/:slug) second, so callers never need to know which
// kind of board they hold. A shared file that resolves as empty is still the caller's board, so it
// does not fall through to the published lookup and get misreported as not found.
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
		const resolved = await resolveSharedBoardById(env, input.boardId)
		if (!resolved.ok) {
			return toolError(
				resolved.reason === 'board_empty'
					? 'This board has no saved content yet.'
					: 'No public board was found with this id. Only published boards and files shared via link are supported.'
			)
		}

		const snapshot = await loadBoardSnapshot(env, resolved.board, { access: 'public' })
		if (!snapshot) {
			return toolError('This board has no saved content yet.')
		}
		const pages = enumerateBoardPages(snapshot)
		return toolJsonResult({
			name: getDocumentNameFromSnapshot(snapshot),
			pageCount: pages.length,
			// `id` is the stable handle: it survives page reordering, `index` does not. Either can be
			// passed as `page` to the other tools.
			pages: pages.map((p) => ({
				index: p.index,
				id: p.id,
				name: p.name,
				hasContent: p.hasContent,
			})),
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
		await isRateLimited(
			env,
			env.MCP_SCREENSHOT_RATE_LIMITER,
			`ip-cluster:${clientIp ?? 'unknown'}`,
			{
				fallbackLimit: MCP_PER_IP_RATE_LIMIT,
			}
		)
	) {
		return toolError(
			`Rate limited. Requests are limited to about ${MCP_PER_IP_RATE_LIMIT} per minute per IP.`
		)
	}

	try {
		// Scoped to the requested page: get_cluster_info and get_shapes_screenshot both resolve
		// cluster ids against a single page, so listing every shape on the board here would hand out
		// ids that neither of them can look up.
		const resolved = await resolveBoardPage(env, input.boardId, input.page)
		if (!resolved.ok) return resolved.result

		const clusters = await clusterPage(env, resolved)
		return toolJsonResult({
			name: resolved.pageName,
			clusterCount: clusters.length,
			clusters: clusters.map((c) => ({
				id: c.id,
				label: c.label,
				keywords: c.keywords,
				numberOfShapes: c.numberOfShapes,
			})),
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
			`Could not read page info: ${describeThumbnailFailure(classifyScreenshotFailure(error))}.`
		)
	}
}

// Every page-scoped tool needs the same four steps before it can do anything: resolve the board,
// load its snapshot, validate the page ordinal, and pull that page's shapes. Returning the tool's
// own error shape on failure keeps the wording identical across tools.
type ResolvedPage =
	| {
			ok: true
			board: ResolvedThumbnailBoard
			pageId: string
			pageName: string
			shapes: TLShape[]
	  }
	| { ok: false; result: ReturnType<typeof toolError> }

async function resolveBoardPage(
	env: Environment,
	boardId: string,
	page: PageSelector
): Promise<ResolvedPage> {
	const resolved = await resolveSharedBoardById(env, boardId)
	if (!resolved.ok) {
		return {
			ok: false,
			result: toolError(
				resolved.reason === 'board_empty'
					? 'This board has no saved content yet.'
					: 'No public board was found with this id. Only published boards and files shared via link are supported.'
			),
		}
	}

	const snapshot = await loadBoardSnapshot(env, resolved.board, { access: 'public' })
	if (!snapshot) {
		return { ok: false, result: toolError('This board has no saved content yet.') }
	}

	const pages = enumerateBoardPages(snapshot)
	if (pages.length === 0) {
		return { ok: false, result: toolError('This board has no pages.') }
	}

	const targetPage = page.kind === 'id' ? pages.find((p) => p.id === page.id) : pages[page.ordinal]
	if (!targetPage) {
		return {
			ok: false,
			result: toolError(
				page.kind === 'id'
					? `No page with id "${page.id}" on this board. Call get_board_info to list its pages; a page id is stable across reordering, an index is not.`
					: `Page ${page.ordinal} is out of range: this board has ${pages.length} page(s) (0–${pages.length - 1}). Call get_board_info to list them.`
			),
		}
	}
	return {
		ok: true,
		board: resolved.board,
		pageId: targetPage.id,
		pageName: targetPage.name,
		shapes: getShapesOnPage(snapshot, targetPage.id),
	}
}

// Clustering needs real geometry, and the only way to get it is to run an editor in Browser
// Rendering — the same cost as a screenshot. Every caller goes through here, so that cost is stated
// once rather than implied in three places.
async function clusterPage(env: Environment, resolved: Extract<ResolvedPage, { ok: true }>) {
	const measured = await measurePageShapes(env, resolved.board, resolved.pageId)

	// The render answers two things a Worker cannot: where each shape sits, and what
	// ShapeUtil.getText says it holds. Bounds drive the linkage; the text is attached to the shapes
	// so labelling reads the editor's answer rather than re-deriving one from props.
	const shapes: TLShapeWithPlainText[] = resolved.shapes.map((shape) => {
		const text = measured[shape.id as string]?.text
		return text ? { ...shape, plainText: text } : shape
	})

	return getShapeClusters(shapes, resolved.pageId, measured)
}

// The shape as stored, with one substitution: `props.richText` — a ProseMirror document, deeply
// nested and unreadable — is dropped in favour of the plain string the editor's ShapeUtil.getText
// reported for that shape during the measure render. Everything else is passed through untouched, so
// a caller still sees type, position, rotation, size, colour and the rest exactly as stored.
//
// This matters beyond readability: a geo shape's label is not in `props` at all under any key a
// Worker could find, so without the editor's answer that text is simply invisible.
function toReadableShape(shape: TLShapeWithPlainText) {
	const { plainText, ...rest } = shape
	const props = { ...(rest.props as Record<string, unknown>) }
	delete props.richText

	const text = plainText ?? getShapeText(shape)
	if (text) props.text = text
	else delete props.text

	return { ...rest, props }
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
		await isRateLimited(env, env.MCP_SCREENSHOT_RATE_LIMITER, `ip-info:${clientIp ?? 'unknown'}`, {
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

		const cluster = (await clusterPage(env, resolved)).find((c) => c.id === input.clusterId)
		if (!cluster) {
			return toolError(
				`No cluster with id "${input.clusterId}" on page ${describePageSelector(input.page)}. Call get_page_info to list this page's clusters.`
			)
		}

		return toolJsonResult({
			clusterId: cluster.id,
			label: cluster.label,
			keywords: cluster.keywords,
			pageName: resolved.pageName,
			numberOfShapes: cluster.numberOfShapes,
			shapes: cluster.shapes.map(toReadableShape),
		})
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
			resolved: Extract<ResolvedPage, { ok: true }>
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
		await isRateLimited(env, env.MCP_SCREENSHOT_RATE_LIMITER, `ip-shot:${clientIp ?? 'unknown'}`, {
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
			await isRateLimited(env, env.MCP_SERVER_BOARD_RATE_LIMITER, `board:${boardId}`, {
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
			pageId: resolved.pageId,
			shapeIds,
			theme,
			width: DEFAULT_THUMBNAIL_WIDTH,
			height: DEFAULT_THUMBNAIL_HEIGHT,
		})

		// The PNG already cost Browser Run capacity and is exactly what was asked for, so a failed cache
		// write is reported but never turns a good render into an error.
		try {
			await putThumbnailPng(env.THUMBNAILS, cacheKey, render.base64, resolved.board.version, {
				pageName: encodeURIComponent(resolved.pageName),
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
		return toolPageResult(resolved.pageName, render.base64)
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
			const clusters = await clusterPage(env, resolved)
			const byId = new Map(clusters.map((cluster) => [cluster.id, cluster]))

			// Reject unknown ids rather than quietly rendering the subset that resolved — a caller
			// asking for three clusters and getting a picture of two has no way to notice.
			const missing = input.clusterIds.filter((id) => !byId.has(id))
			if (missing.length > 0) {
				return {
					ok: false,
					result: toolError(
						`No cluster on page ${describePageSelector(input.page)} with id ${missing.map((id) => `"${id}"`).join(', ')}. Call get_page_info to list this page's clusters.`
					),
				}
			}

			// Several clusters render as one framed image of their union, which is the point of taking
			// more than one: seeing how they sit relative to each other.
			const shapeIds = [
				...new Set(
					input.clusterIds.flatMap((id) => byId.get(id)!.shapes.map((shape) => shape.id as string))
				),
			]
			return { ok: true, shapeIds }
		},
	})
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
			'Return metadata for a public tldraw.com board: its name, page count, and the id, name, 0-based index, and hasContent flag for each page. Call this first, then pass a page id or index to get_page_info.',
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

function getPageInfoToolDefinition() {
	return {
		name: PAGE_INFO_TOOL_NAME,
		title: 'Get tldraw page info',
		description:
			'List the shape clusters on one page of a public tldraw.com board. Each top-level shape is a cluster together with its descendants, so frames and groups stay together while ungrouped shapes remain individually addressable. Pass a cluster id to get_cluster_info or get_cluster_screenshot.',
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
					type: ['number', 'string'],
					description:
						'The page id or 0-based index from get_board_info. Defaults to 0, the first page.',
					default: 0,
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

function getClusterInfoToolDefinition() {
	return {
		name: CLUSTER_INFO_TOOL_NAME,
		title: 'Get tldraw cluster info',
		description:
			"Describe one cluster from get_page_info: its label, keywords, and the full record of every shape it contains — type, position, rotation, size, style and so on. Each shape's rich text document is replaced by `props.text`, the plain string the editor reports for it, which also surfaces text that is not stored on the record at all (a geo shape's label, for instance).",
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
					type: ['number', 'string'],
					description:
						'The page id or 0-based index from get_board_info. Defaults to 0, the first page.',
					default: 0,
				},
				clusterId: {
					type: 'string',
					description: 'The id of the cluster to get info for.',
				},
			},
			required: ['boardId', 'clusterId'],
		},
		annotations: {
			readOnlyHint: true,
			idempotentHint: true,
			openWorldHint: false,
			destructiveHint: false,
		},
	}
}

function getClusterScreenshotToolDefinition() {
	return {
		name: CLUSTER_SCREENSHOT_TOOL_NAME,
		title: 'Get tldraw cluster screenshot',
		description: `Return a ${DEFAULT_THUMBNAIL_WIDTH}x${DEFAULT_THUMBNAIL_HEIGHT} PNG of one or more clusters from get_page_info, preceded by the page name. The camera fits the clusters requested and only their shapes are drawn, so nothing else on the page appears. Pass several ids to see how those clusters sit relative to each other in a single image. This is the direct route from a cluster id to a picture — get_cluster_info is only needed when the individual shapes matter.`,
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
					type: ['number', 'string'],
					description:
						'Which page: either its 0-based index or its page id from get_board_info. Ids survive page reordering, indexes do not. Defaults to 0, the first page.',
					default: 0,
				},
				clusterIds: {
					type: 'array',
					items: { type: 'string' },
					description:
						'One or more cluster ids from get_page_info. All of them must be on the given page. A bare string is also accepted for a single cluster.',
				},
				theme: {
					type: 'string',
					enum: ['light', 'dark'],
					default: 'light',
				},
			},
			required: ['boardId', 'page', 'clusterIds'],
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
