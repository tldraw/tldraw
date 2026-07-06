import { IRequest } from 'itty-router'
import { Environment } from '../../types'
import { writeDataPoint } from '../../utils/analytics'

const TOOL_NAME = 'get_shared_board_screenshot'
const MCP_PROTOCOL_VERSION = '2024-11-05'
const DEFAULT_WIDTH = 1200
const DEFAULT_HEIGHT = 630
const MIN_DIMENSION = 200
const MAX_DIMENSION = 1600
const MCP_SCREENSHOT_RATE_LIMIT = 20
const MCP_SCREENSHOT_RATE_LIMIT_WINDOW_MS = 60_000
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

interface ResolvedBoard {
	kind: 'published'
	slug: string
	fixture: 'snapshot-example' | 'layer-panel'
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
					version: '0.0.0',
				},
				instructions:
					'Image-only MCP server for public tldraw.com shared board screenshots. The prototype currently renders published URLs through a fixed tldraw-owned Browser Run thumbnail target.',
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

export function resolveSharedBoardUrl(urlString: string): ResolvedBoard {
	let url: URL
	try {
		url = new URL(urlString)
	} catch {
		throw new Error('Only valid tldraw.com board URLs are accepted')
	}

	if (!isAllowedTldrawHost(url.hostname)) {
		throw new Error('Only tldraw.com board URLs are accepted')
	}

	const [prefix, slug, extra] = url.pathname.split('/').filter(Boolean)
	if (!prefix || !slug || extra) {
		throw new Error('Only published tldraw.com board URLs are supported in this prototype')
	}

	if (prefix === 'p') {
		return {
			kind: 'published',
			slug,
			fixture: slug.includes('layer') ? 'layer-panel' : 'snapshot-example',
		}
	}

	if (prefix === 'f' || prefix === 'invite') {
		throw new Error(
			'Private, invite-only, and shared-live file URLs require the production resolver'
		)
	}

	throw new Error('Only published tldraw.com board URLs are supported in this prototype')
}

export function buildBrowserRunThumbnailUrl(
	renderOrigin: string,
	board: ResolvedBoard,
	input: SharedBoardScreenshotInput
) {
	const url = new URL('/dev/browser-run-thumbnail', renderOrigin)
	url.searchParams.set('fixture', board.fixture)
	url.searchParams.set('x', String(input.viewport.x))
	url.searchParams.set('y', String(input.viewport.y))
	url.searchParams.set('z', String(input.viewport.z))
	url.searchParams.set('width', String(input.width))
	url.searchParams.set('height', String(input.height))
	url.searchParams.set('theme', input.theme)
	url.searchParams.set('source', 'mcp')
	url.searchParams.set('boardKind', board.kind)
	url.searchParams.set('boardSlug', board.slug)
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
	let board: ResolvedBoard
	try {
		input = parseSharedBoardScreenshotInput(argumentsValue)
		board = resolveSharedBoardUrl(input.url)
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
		return {
			content: [{ type: 'text', text: failureReason }],
			isError: true,
		}
	}

	const boardHash = await sha256(board.slug)
	const rateLimit = await checkMcpScreenshotRateLimit(env, clientIp ?? 'unknown')

	writeMcpScreenshotTelemetry(env, {
		boardHash,
		ipHash,
		cacheStatus: 'miss',
		width: input.width,
		height: input.height,
		rateLimitAllowed: rateLimit.allowed,
		failureReason: rateLimit.allowed ? undefined : 'rate_limited',
	})

	if (!rateLimit.allowed) {
		return {
			content: [
				{
					type: 'text',
					text: 'Rate limited. Shared board screenshots are limited to about 20 requests per minute per IP.',
				},
			],
			isError: true,
		}
	}

	try {
		const renderUrl = buildBrowserRunThumbnailUrl(getRenderOrigin(env), board, input)
		const browserRun = await captureWithBrowserRun(renderUrl, input, env)
		writeMcpScreenshotTelemetry(env, {
			boardHash,
			ipHash,
			cacheStatus: 'miss',
			width: input.width,
			height: input.height,
			browserRunDurationMs: browserRun.durationMs,
			browserMsUsed: browserRun.browserMsUsed,
			rateLimitAllowed: true,
		})

		return {
			content: [
				{
					type: 'image',
					data: arrayBufferToBase64(browserRun.png),
					mimeType: 'image/png',
				},
			],
		}
	} catch (error) {
		const failureReason = error instanceof Error ? error.message : String(error)
		writeMcpScreenshotTelemetry(env, {
			boardHash,
			ipHash,
			cacheStatus: 'miss',
			width: input.width,
			height: input.height,
			rateLimitAllowed: true,
			failureReason,
		})
		return {
			content: [{ type: 'text', text: `Screenshot failed: ${failureReason}` }],
			isError: true,
		}
	}
}

async function captureWithBrowserRun(
	renderUrl: string,
	input: SharedBoardScreenshotInput,
	env: Environment
): Promise<BrowserRunResult> {
	const accountId = env.CLOUDFLARE_ACCOUNT_ID
	const apiToken = env.CLOUDFLARE_API_TOKEN
	if (!accountId || !apiToken) {
		throw new Error(
			'Browser Run is not configured. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.'
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

async function checkMcpScreenshotRateLimit(env: Environment, key: string) {
	const rateLimitKey = `mcp-shared-board-screenshot:${key}`
	if (env.MCP_SCREENSHOT_RATE_LIMITER) {
		const { success } = await env.MCP_SCREENSHOT_RATE_LIMITER.limit({ key: rateLimitKey })
		return { allowed: success }
	}

	const now = Date.now()
	const existing = RATE_LIMIT_FALLBACK.get(rateLimitKey)
	if (!existing || existing.resetAt <= now) {
		RATE_LIMIT_FALLBACK.set(rateLimitKey, {
			count: 1,
			resetAt: now + MCP_SCREENSHOT_RATE_LIMIT_WINDOW_MS,
		})
		return { allowed: true }
	}
	existing.count++
	return { allowed: existing.count <= MCP_SCREENSHOT_RATE_LIMIT }
}

function getSharedBoardScreenshotToolDefinition() {
	return {
		name: TOOL_NAME,
		title: 'Get shared tldraw board screenshot',
		description:
			'Return a PNG screenshot of a public tldraw.com board. This prototype accepts published /p/:slug URLs and renders through a fixed tldraw-owned Browser Run thumbnail target.',
		inputSchema: {
			type: 'object',
			additionalProperties: false,
			properties: {
				url: {
					type: 'string',
					description:
						'A public tldraw.com published board URL, for example https://www.tldraw.com/p/slug.',
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
					description: 'Output width. Defaults to 1200 and is clamped to the prototype bounds.',
					default: DEFAULT_WIDTH,
				},
				height: {
					type: 'number',
					description: 'Output height. Defaults to 630 and is clamped to the prototype bounds.',
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

function isAllowedTldrawHost(hostname: string) {
	return (
		hostname === 'tldraw.com' || hostname === 'www.tldraw.com' || hostname === 'staging.tldraw.com'
	)
}

function getRenderOrigin(env: Environment) {
	// The render page lives at /dev/browser-run-thumbnail and is only served when dev routes are
	// enabled, so this prototype must be pointed at a dev or preview origin explicitly. There is no
	// safe production default: a live origin would have Browser Run screenshot a route that 404s.
	if (!env.MCP_SCREENSHOT_RENDER_ORIGIN) {
		throw new Error(
			'MCP_SCREENSHOT_RENDER_ORIGIN is not configured. This prototype needs an origin that serves the dev-only /dev/browser-run-thumbnail render page.'
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
