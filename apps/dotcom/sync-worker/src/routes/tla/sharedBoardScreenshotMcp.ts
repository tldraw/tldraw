import { THUMBNAIL_RENDER_PATH } from '@tldraw/dotcom-shared'
import { IRequest } from 'itty-router'
import { getR2KeyForRoom } from '../../r2'
import { Environment } from '../../types'
import { writeDataPoint } from '../../utils/analytics'
import {
	THUMBNAIL_RENDER_TOKEN_TTL_MS,
	ThumbnailRenderJob,
	mintThumbnailRenderToken,
} from '../../utils/renderTokens'
import { getPublishedFileInfo } from './getPublishedFile'
import { getSharedFileInfo, isFileAnonymouslyViewable } from './getSharedFile'

const TOOL_NAME = 'get_shared_board_screenshot'
const MCP_PROTOCOL_VERSION = '2024-11-05'
const DEFAULT_WIDTH = 1200
const DEFAULT_HEIGHT = 630
const MIN_DIMENSION = 200
const MAX_DIMENSION = 1600
const BROWSER_RUN_TIMEOUT_MS = 60_000

// Per-IP and per-board limits protect the endpoint and individual boards; the global limit caps
// total Browser Run spend across all callers. The Cloudflare bindings in wrangler.toml enforce
// these in deployments; the isolate-local fallback only covers local dev and tests.
const PER_IP_RATE_LIMIT = 20
const PER_BOARD_RATE_LIMIT = 20
const GLOBAL_BROWSER_RUN_RATE_LIMIT = 60
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
	url: string
	viewport: {
		x: number
		y: number
		z: number
	}
	width: number
	height: number
	theme: 'light' | 'dark'
}

interface ResolvedBoardUrl {
	kind: 'published' | 'shared_file'
	slug: string
}

interface BrowserRunResult {
	png: ArrayBuffer
	durationMs: number
	browserMsUsed: number | null
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
					version: '1.0.0',
				},
				instructions:
					'Image-only MCP server for public tldraw.com board screenshots. Accepts published tldraw.com/p/:slug URLs and anonymously-shared tldraw.com/f/:slug URLs, and renders them through a signed, tldraw-owned Browser Run render job.',
			})
		case 'ping':
			return jsonRpcResult(rpcRequest.id, {})
		case 'tools/list':
			return jsonRpcResult(rpcRequest.id, { tools: [getSharedBoardScreenshotToolDefinition()] })
		case 'tools/call':
			if (rpcRequest.params?.name !== TOOL_NAME) {
				return jsonRpcError(rpcRequest.id, -32602, `Unknown tool: ${rpcRequest.params?.name}`)
			}
			return jsonRpcResult(
				rpcRequest.id,
				await callSharedBoardScreenshotTool(rpcRequest.params.arguments, request, env)
			)
		default:
			return jsonRpcError(rpcRequest.id, -32601, `Method not found: ${rpcRequest.method}`)
	}
}

export function parseSharedBoardScreenshotInput(input: unknown): SharedBoardScreenshotInput {
	if (!input || typeof input !== 'object') {
		throw new Error('Tool arguments must be an object')
	}
	const value = input as Record<string, unknown>
	const viewport = value.viewport as Record<string, unknown> | undefined
	if (typeof value.url !== 'string') {
		throw new Error('url is required')
	}
	if (!viewport || typeof viewport !== 'object') {
		throw new Error('viewport is required')
	}

	return {
		url: value.url,
		viewport: {
			x: requireFiniteNumber(viewport.x, 'viewport.x'),
			y: requireFiniteNumber(viewport.y, 'viewport.y'),
			z: requireFiniteNumber(viewport.z, 'viewport.z'),
		},
		width: parseDimension(value.width, DEFAULT_WIDTH, 'width'),
		height: parseDimension(value.height, DEFAULT_HEIGHT, 'height'),
		theme: value.theme === 'dark' ? 'dark' : 'light',
	}
}

export function resolveSharedBoardUrl(
	urlString: string,
	extraAllowedHost?: string
): ResolvedBoardUrl {
	let url: URL
	try {
		url = new URL(urlString)
	} catch {
		throw new Error('Only valid tldraw.com board URLs are accepted')
	}

	if (!isAllowedTldrawHost(url.hostname, extraAllowedHost)) {
		throw new Error('Only tldraw.com board URLs are accepted')
	}

	const [prefix, slug, extra] = url.pathname.split('/').filter(Boolean)
	if (!prefix || !slug || extra) {
		throw new Error('Only published or shared tldraw.com board URLs are supported')
	}

	if (prefix === 'p') {
		return { kind: 'published', slug }
	}

	if (prefix === 'f') {
		return { kind: 'shared_file', slug }
	}

	if (prefix === 'invite') {
		throw new Error('Invite-only file URLs are not supported')
	}

	throw new Error('Only published or shared tldraw.com board URLs are supported')
}

export function getThumbnailCacheKey(job: Omit<ThumbnailRenderJob, 'v' | 'exp'>) {
	return `mcp/${job.kind}/${job.slug}/${job.version}/${job.width}x${job.height}/${job.theme}/${job.x}_${job.y}_${job.z}.png`
}

export function buildThumbnailRenderUrl(renderOrigin: string, token: string) {
	const url = new URL(THUMBNAIL_RENDER_PATH, renderOrigin)
	url.searchParams.set('token', token)
	return url.toString()
}

async function callSharedBoardScreenshotTool(
	argumentsValue: unknown,
	request: Request,
	env: Environment
) {
	const clientIp = getClientIp(request)
	const ipHash = clientIp ? await sha256(clientIp) : 'unknown'
	let input: SharedBoardScreenshotInput
	let boardUrl: ResolvedBoardUrl
	try {
		input = parseSharedBoardScreenshotInput(argumentsValue)
		boardUrl = resolveSharedBoardUrl(input.url, getRenderOriginHost(env))
	} catch (error) {
		const failureReason = error instanceof Error ? error.message : String(error)
		writeMcpScreenshotTelemetry(env, {
			boardHash: 'unresolved',
			ipHash,
			cacheStatus: 'miss',
			width: DEFAULT_WIDTH,
			height: DEFAULT_HEIGHT,
			rateLimitAllowed: true,
			failureReason,
		})
		return toolError(failureReason)
	}

	const boardHash = await sha256(boardUrl.slug)
	const telemetry = (data: {
		cacheStatus: 'hit' | 'miss'
		browserRunDurationMs?: number
		browserMsUsed?: number | null
		failureReason?: string
		rateLimitAllowed?: boolean
	}) => {
		writeMcpScreenshotTelemetry(env, {
			boardHash,
			ipHash,
			width: input.width,
			height: input.height,
			rateLimitAllowed: true,
			...data,
		})
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
		let fileId: string
		let version: string | number
		if (boardUrl.kind === 'published') {
			const file = await getPublishedFileInfo(env, boardUrl.slug)
			if (!file || !file.published) {
				telemetry({ cacheStatus: 'miss', failureReason: 'not_published' })
				return toolError(
					'No published board was found at this URL. Only published tldraw.com/p/ boards are supported.'
				)
			}
			fileId = file.id
			version = file.lastPublished
		} else {
			const file = await getSharedFileInfo(env, boardUrl.slug)
			if (!isFileAnonymouslyViewable(file)) {
				telemetry({ cacheStatus: 'miss', failureReason: 'not_shared' })
				return toolError(
					'No shared board was found at this URL, or it is private. Only shared tldraw.com/f/ boards can be screenshotted.'
				)
			}
			// The persisted room's R2 etag rotates when the board content changes, so it keys the
			// thumbnail cache without a separate content-version field.
			const persisted = await env.ROOMS.head(getR2KeyForRoom({ slug: boardUrl.slug, isApp: true }))
			if (!persisted) {
				telemetry({ cacheStatus: 'miss', failureReason: 'board_empty' })
				return toolError('This board has no saved content to screenshot yet.')
			}
			fileId = file.id
			version = persisted.etag
		}

		const job: ThumbnailRenderJob = {
			v: 1,
			kind: boardUrl.kind,
			slug: boardUrl.slug,
			fileId,
			version,
			x: input.viewport.x,
			y: input.viewport.y,
			z: input.viewport.z,
			width: input.width,
			height: input.height,
			theme: input.theme,
			exp: Date.now() + THUMBNAIL_RENDER_TOKEN_TTL_MS,
		}

		const cacheKey = getThumbnailCacheKey(job)
		const cached = await env.THUMBNAILS?.get(cacheKey)
		if (cached) {
			const png = await cached.arrayBuffer()
			telemetry({ cacheStatus: 'hit' })
			return toolImage(png)
		}

		// Only cache misses spend Browser Run capacity, so the per-board and global guards sit here
		// rather than at the top of the tool call.
		if (
			await isRateLimited(env.MCP_SCREENSHOT_RATE_LIMITER, `board:${boardUrl.slug}`, {
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
			await isRateLimited(env.MCP_SCREENSHOT_BROWSER_RATE_LIMITER, 'global', {
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

		const token = await mintThumbnailRenderToken(env, job)
		const renderUrl = buildThumbnailRenderUrl(getRenderOrigin(env), token)
		const browserRun = await captureWithBrowserRun(renderUrl, input, env)
		await env.THUMBNAILS?.put(cacheKey, browserRun.png, {
			httpMetadata: { contentType: 'image/png' },
		})

		telemetry({
			cacheStatus: 'miss',
			browserRunDurationMs: browserRun.durationMs,
			browserMsUsed: browserRun.browserMsUsed,
		})
		return toolImage(browserRun.png)
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

function toolImage(png: ArrayBuffer) {
	return {
		content: [
			{
				type: 'image',
				data: arrayBufferToBase64(png),
				mimeType: 'image/png',
			},
		],
	}
}

async function captureWithBrowserRun(
	renderUrl: string,
	input: SharedBoardScreenshotInput,
	env: Environment
): Promise<BrowserRunResult> {
	const accountId = env.CLOUDFLARE_ACCOUNT_ID
	const apiToken = env.BROWSER_RENDERING_API_TOKEN
	if (!accountId || !apiToken) {
		throw new Error(
			'Browser Run is not configured. Set CLOUDFLARE_ACCOUNT_ID and BROWSER_RENDERING_API_TOKEN.'
		)
	}

	const startedAt = Date.now()
	const response = await fetch(
		`https://api.cloudflare.com/client/v4/accounts/${accountId}/browser-rendering/screenshot`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiToken}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(getBrowserRunRequestBody(renderUrl, input)),
			signal: AbortSignal.timeout(BROWSER_RUN_TIMEOUT_MS),
		}
	)
	const durationMs = Date.now() - startedAt
	const browserMsUsed = parseNullableNumber(response.headers.get('X-Browser-Ms-Used'))

	if (!response.ok) {
		throw new Error(`Browser Run failed (${response.status})`)
	}

	const contentType = response.headers.get('content-type') ?? ''
	if (!contentType.includes('image/png') && !contentType.includes('application/octet-stream')) {
		throw new Error(`Browser Run returned ${contentType || 'unknown content type'}`)
	}

	return {
		png: await response.arrayBuffer(),
		durationMs,
		browserMsUsed,
	}
}

function getBrowserRunRequestBody(renderUrl: string, input: SharedBoardScreenshotInput) {
	const headers = getExtraHeaders(renderUrl)
	return {
		url: renderUrl,
		...(headers ? { setExtraHTTPHeaders: headers } : null),
		viewport: {
			width: input.width,
			height: input.height,
			deviceScaleFactor: 1,
		},
		gotoOptions: {
			waitUntil: 'networkidle0',
			timeout: 45_000,
		},
		waitForSelector: {
			selector: '[data-thumbnail-ready="true"]',
			timeout: 45_000,
		},
		screenshotOptions: {
			type: 'png',
			fullPage: false,
		},
	}
}

async function isRateLimited(
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

function getSharedBoardScreenshotToolDefinition() {
	return {
		name: TOOL_NAME,
		title: 'Get shared tldraw board screenshot',
		description:
			'Return a PNG screenshot of a public tldraw.com board. Accepts published /p/:slug URLs and anonymously-shared /f/:slug URLs, and renders through a signed tldraw-owned Browser Run render job.',
		inputSchema: {
			type: 'object',
			additionalProperties: false,
			properties: {
				url: {
					type: 'string',
					description:
						'A public tldraw.com board URL: a published board (https://www.tldraw.com/p/slug) or an anonymously-shared file (https://www.tldraw.com/f/slug).',
				},
				viewport: {
					type: 'object',
					additionalProperties: false,
					properties: {
						x: { type: 'number' },
						y: { type: 'number' },
						z: { type: 'number' },
					},
					required: ['x', 'y', 'z'],
				},
				width: {
					type: 'number',
					description: `Output width. Defaults to ${DEFAULT_WIDTH} and is clamped to ${MIN_DIMENSION}-${MAX_DIMENSION}.`,
					default: DEFAULT_WIDTH,
				},
				height: {
					type: 'number',
					description: `Output height. Defaults to ${DEFAULT_HEIGHT} and is clamped to ${MIN_DIMENSION}-${MAX_DIMENSION}.`,
					default: DEFAULT_HEIGHT,
				},
				theme: {
					type: 'string',
					enum: ['light', 'dark'],
					default: 'light',
				},
			},
			required: ['url', 'viewport'],
		},
		annotations: {
			readOnlyHint: true,
			idempotentHint: true,
			openWorldHint: false,
			destructiveHint: false,
		},
	}
}

function parseDimension(value: unknown, fallback: number, name: string) {
	if (value === undefined) return fallback
	const number = requireFiniteNumber(value, name)
	return Math.max(MIN_DIMENSION, Math.min(MAX_DIMENSION, Math.floor(number)))
}

function requireFiniteNumber(value: unknown, name: string) {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		throw new Error(`${name} must be a finite number`)
	}
	return value
}

function isAllowedTldrawHost(hostname: string, extraAllowedHost?: string) {
	return (
		hostname === 'tldraw.com' ||
		hostname === 'www.tldraw.com' ||
		hostname === 'staging.tldraw.com' ||
		(extraAllowedHost !== undefined && hostname === extraAllowedHost)
	)
}

function getRenderOrigin(env: Environment) {
	// Staging and production set this in wrangler.toml to their own client origin. Local dev sets it
	// to the local client; previews configure it explicitly when they need to exercise this path.
	if (!env.MCP_SCREENSHOT_RENDER_ORIGIN) {
		throw new Error(
			`MCP_SCREENSHOT_RENDER_ORIGIN is not configured. It must point at an origin that serves the ${THUMBNAIL_RENDER_PATH} render page.`
		)
	}
	return env.MCP_SCREENSHOT_RENDER_ORIGIN
}

// The hostname of this deployment's own render origin, so board URLs on it (e.g. a preview's
// pr-1234-preview-deploy.tldraw.com host, or localhost in dev) are accepted in addition to the
// canonical tldraw.com hosts. Returns undefined when the render origin is unset or unparseable.
function getRenderOriginHost(env: Environment): string | undefined {
	if (!env.MCP_SCREENSHOT_RENDER_ORIGIN) return undefined
	try {
		return new URL(env.MCP_SCREENSHOT_RENDER_ORIGIN).hostname
	} catch {
		return undefined
	}
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

function parseNullableNumber(value: string | null) {
	if (value === null) return null
	const number = Number(value)
	return Number.isFinite(number) ? number : null
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
	const bytes = new Uint8Array(buffer)
	let binary = ''
	for (let i = 0; i < bytes.length; i += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
	}
	return btoa(binary)
}

async function sha256(value: string) {
	const bytes = new TextEncoder().encode(value)
	const digest = await crypto.subtle.digest('SHA-256', bytes)
	return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function writeMcpScreenshotTelemetry(
	env: Environment,
	data: {
		boardHash: string
		ipHash: string
		cacheStatus: 'hit' | 'miss'
		width: number
		height: number
		browserRunDurationMs?: number
		browserMsUsed?: number | null
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
			data.width,
			data.height,
			data.browserRunDurationMs ?? -1,
			data.browserMsUsed ?? -1,
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
