import { afterEach, describe, expect, it, vi } from 'vitest'
import { MCP_PER_IP_RATE_LIMIT } from '../../config'
import { Environment } from '../../types'
import { verifyThumbnailRenderToken } from '../../utils/renderTokens'
import {
	parseBoardInfoInput,
	parseClusterInfoInput,
	parseClusterScreenshotInput,
	parsePageInfoInput,
} from './boardTools'
import { getPublishedFileInfo, getPublishedRoomSnapshot } from './getPublishedFile'
import { getSharedFileInfo } from './getSharedFile'
import {
	makeFakeThumbnailsBucket,
	makeMeasuringBrowserBinding,
	makeScreenshotTestEnv,
	makeSnapshot,
	screenshotOf,
} from './screenshotTestHelpers'
import {
	isMcpScreenshotEnabled,
	resetRateLimitFallbackForTests,
	sharedBoardScreenshotMcp,
} from './sharedBoardScreenshotMcp'

vi.mock('./getPublishedFile', () => ({
	getPublishedFileInfo: vi.fn(),
	getPublishedRoomSnapshot: vi.fn(),
}))

vi.mock('./getSharedFile', async (importOriginal) => ({
	...(await importOriginal<typeof import('./getSharedFile')>()),
	getSharedFileInfo: vi.fn(),
	getSharedFileRoomSnapshot: vi.fn(),
}))

let requestId = 0

afterEach(() => {
	vi.clearAllMocks()
	resetRateLimitFallbackForTests()
	requestId = 0
})

const PAGES = [
	{ id: 'page:a', name: 'Cover', index: 'a1', shapes: 2 },
	{ id: 'page:b', name: 'Ideas', index: 'a2', shapes: 1 },
	{ id: 'page:c', name: 'Blank', index: 'a3', shapes: 0 },
]

function makeEnv(overrides: Partial<Record<string, unknown>> = {}) {
	// get_page_info, get_cluster_info and get_cluster_screenshot all measure the page in a render
	// before clustering it, so the fake browser has to play the render page's part and post a result.
	const env: Environment = makeScreenshotTestEnv({
		MCP_SCREENSHOT_RENDER_ORIGIN: 'https://render.example',
		THUMBNAILS: makeFakeThumbnailsBucket(),
		...overrides,
	})
	;(env as any).BROWSER = makeMeasuringBrowserBinding(() => env)
	return env
}

function makeRpcRequest(method: string, params?: unknown) {
	return new Request('https://sync.tldraw.xyz/app/mcp', {
		method: 'POST',
		headers: { 'cf-connecting-ip': `203.0.113.${++requestId}` },
		body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
	}) as any
}

function makeToolCall(name: string, args: object) {
	return makeRpcRequest('tools/call', { name, arguments: args })
}

const MODERN_VERSION = '2026-07-28'
const LEGACY_VERSION = '2025-11-25'

// A 2026-07-28 request: version on every request, method and tool name mirrored into headers.
// `headers` overrides let a test break one of those mirrors on purpose.
function makeModernRpcRequest(
	method: string,
	params?: object,
	{
		version = MODERN_VERSION,
		headers = {},
	}: { version?: string; headers?: Record<string, string> } = {}
) {
	const name = (params as { name?: string } | undefined)?.name
	return new Request('https://sync.tldraw.xyz/app/mcp', {
		method: 'POST',
		headers: {
			'cf-connecting-ip': `203.0.113.${++requestId}`,
			'mcp-protocol-version': version,
			'mcp-method': method,
			...(name ? { 'mcp-name': name } : {}),
			...headers,
		},
		body: JSON.stringify({
			jsonrpc: '2.0',
			id: 1,
			method,
			params: {
				...params,
				_meta: { 'io.modelcontextprotocol/protocolVersion': version },
			},
		}),
	}) as any
}

async function rpcResult(response: Response) {
	return ((await response.json()) as any).result
}

async function rpcError(response: Response) {
	return ((await response.json()) as any).error
}

async function callTool(name: string, args: object, env = makeEnv()) {
	return rpcResult(await sharedBoardScreenshotMcp(makeToolCall(name, args), env))
}

function mockPublishedBoard(snapshot = makeSnapshot(PAGES)) {
	vi.mocked(getSharedFileInfo).mockResolvedValue(null)
	vi.mocked(getPublishedFileInfo).mockResolvedValue({
		id: 'file-1',
		published: true,
		lastPublished: 1751234567890,
	})
	vi.mocked(getPublishedRoomSnapshot).mockResolvedValue(snapshot)
}

describe('tool inputs', () => {
	it('parses board and page selectors', () => {
		expect(parseBoardInfoInput({ boardId: 'abc' })).toEqual({ boardId: 'abc' })
		expect(parsePageInfoInput({ boardId: 'abc' })).toEqual({
			boardId: 'abc',
			page: { kind: 'ordinal', ordinal: 0 },
		})
		expect(parsePageInfoInput({ boardId: 'abc', page: 'page:b' })).toEqual({
			boardId: 'abc',
			page: { kind: 'id', id: 'page:b' },
		})
		expect(() => parsePageInfoInput({ boardId: 'abc', page: -1 })).toThrow('page must be')
		expect(() => parseBoardInfoInput({ boardId: 'https://tldraw.com/p/abc' })).toThrow('not a URL')
	})

	it('parses cluster arguments, accepting one id or several', () => {
		expect(
			parseClusterInfoInput({ boardId: 'abc', page: 1, clusterId: 'cluster:one' })
		).toMatchObject({ boardId: 'abc', clusterId: 'cluster:one' })
		expect(
			parseClusterScreenshotInput({
				boardId: 'abc',
				clusterIds: ['cluster:one', 'cluster:two'],
				theme: 'dark',
			})
		).toMatchObject({ boardId: 'abc', clusterIds: ['cluster:one', 'cluster:two'], theme: 'dark' })
		// A bare string is accepted, because asking for one cluster is the common case.
		expect(
			parseClusterScreenshotInput({ boardId: 'abc', clusterIds: 'cluster:one' })
		).toMatchObject({ clusterIds: ['cluster:one'], theme: 'light' })
		expect(() => parseClusterScreenshotInput({ boardId: 'abc', clusterIds: [] })).toThrow(
			'clusterIds is required'
		)
	})
})

describe('MCP server', () => {
	it('lists the replacement tools without the old page screenshot tool', async () => {
		const result = await rpcResult(
			await sharedBoardScreenshotMcp(makeRpcRequest('tools/list'), makeEnv())
		)
		expect(result.tools.map((tool: any) => tool.name)).toEqual([
			'get_board_info',
			'get_page_info',
			'get_cluster_info',
			'get_cluster_screenshot',
		])
	})

	it('can be disabled at runtime', async () => {
		expect(isMcpScreenshotEnabled(makeEnv())).toBe(true)
		expect(isMcpScreenshotEnabled(makeEnv({ MCP_SCREENSHOT_ENABLED: 'false' }))).toBe(false)

		const response = await sharedBoardScreenshotMcp(
			makeRpcRequest('initialize'),
			makeEnv({ MCP_SCREENSHOT_ENABLED: 'false' })
		)
		expect(response.status).toBe(404)
	})

	it('answers anything but POST with 405', async () => {
		const response = await sharedBoardScreenshotMcp(
			new Request('https://sync.tldraw.xyz/app/mcp', { method: 'GET' }) as any,
			makeEnv()
		)
		expect(response.status).toBe(405)
	})
})

// Both eras share one endpoint: 2026-07-28 (version per request) and 2025-11-25 (`initialize`).
describe('protocol versions', () => {
	it('reports what it speaks, so a client can pick a version', async () => {
		const result = await rpcResult(
			await sharedBoardScreenshotMcp(makeModernRpcRequest('server/discover'), makeEnv())
		)
		expect(result).toMatchObject({
			resultType: 'complete',
			supportedVersions: [MODERN_VERSION, LEGACY_VERSION],
			capabilities: { tools: {} },
			cacheScope: 'public',
			_meta: {
				'io.modelcontextprotocol/serverInfo': { name: 'tldraw-shared-board-screenshot' },
			},
		})
	})

	it('answers server/discover even when the request names a version it does not speak', async () => {
		// Refusing here would leave the client no way to find a version we have in common.
		const response = await sharedBoardScreenshotMcp(
			makeModernRpcRequest('server/discover', undefined, { version: '2024-11-05' }),
			makeEnv()
		)
		expect(response.status).toBe(200)
		expect((await rpcResult(response)).supportedVersions).toEqual([MODERN_VERSION, LEGACY_VERSION])
	})

	it('rejects a version it does not speak, naming the ones it does', async () => {
		const response = await sharedBoardScreenshotMcp(
			makeModernRpcRequest('tools/list', undefined, { version: '2024-11-05' }),
			makeEnv()
		)
		expect(response.status).toBe(400)
		expect(await rpcError(response)).toMatchObject({
			code: -32022,
			data: { supported: [MODERN_VERSION, LEGACY_VERSION], requested: '2024-11-05' },
		})
	})

	it('offers 2025-11-25 to a client that asks to initialize at 2024-11-05', async () => {
		// Naming a version we do support is how the handshake declines one.
		const result = await rpcResult(
			await sharedBoardScreenshotMcp(
				makeRpcRequest('initialize', { protocolVersion: '2024-11-05' }),
				makeEnv()
			)
		)
		expect(result.protocolVersion).toBe(LEGACY_VERSION)
	})

	it('serves a request with no version header as legacy', async () => {
		// Clients are meant to send the header and plenty don't, so it's served rather than rejected.
		const response = await sharedBoardScreenshotMcp(makeRpcRequest('ping'), makeEnv())
		expect(response.status).toBe(200)
		expect(await rpcResult(response)).toEqual({})
	})

	it('envelopes modern results and leaves legacy ones alone', async () => {
		const modern = await rpcResult(
			await sharedBoardScreenshotMcp(makeModernRpcRequest('tools/list'), makeEnv())
		)
		expect(modern).toMatchObject({
			resultType: 'complete',
			cacheScope: 'public',
			_meta: { 'io.modelcontextprotocol/serverInfo': { version: '2.0.0' } },
		})
		expect(modern.ttlMs).toBeGreaterThan(0)

		const legacy = await rpcResult(
			await sharedBoardScreenshotMcp(makeRpcRequest('tools/list'), makeEnv())
		)
		expect(legacy.resultType).toBeUndefined()
		expect(legacy.ttlMs).toBeUndefined()
		expect(legacy._meta).toBeUndefined()
		// Same tools either way — only the envelope differs.
		expect(legacy.tools).toEqual(modern.tools)
	})

	it('drops ping for modern callers, which no longer have it', async () => {
		const response = await sharedBoardScreenshotMcp(makeModernRpcRequest('ping'), makeEnv())
		expect(response.status).toBe(404)
		expect((await rpcError(response)).code).toBe(-32601)
	})

	it('runs a tool under the modern envelope', async () => {
		mockPublishedBoard()
		const result = await rpcResult(
			await sharedBoardScreenshotMcp(
				makeModernRpcRequest('tools/call', {
					name: 'get_board_info',
					arguments: { boardId: 'abc' },
				}),
				makeEnv()
			)
		)
		expect(result.resultType).toBe('complete')
		expect(JSON.parse(result.content[0].text).pageCount).toBe(3)
	})
})

// The routing headers duplicate body fields, so a disagreement between them has to be rejected.
describe('modern request headers', () => {
	it('rejects a method header that disagrees with the body', async () => {
		const response = await sharedBoardScreenshotMcp(
			makeModernRpcRequest('tools/list', undefined, { headers: { 'mcp-method': 'tools/call' } }),
			makeEnv()
		)
		expect(response.status).toBe(400)
		expect(await rpcError(response)).toMatchObject({ code: -32020 })
	})

	it('rejects a tool call whose name header disagrees with the body', async () => {
		const response = await sharedBoardScreenshotMcp(
			makeModernRpcRequest(
				'tools/call',
				{ name: 'get_board_info', arguments: { boardId: 'abc' } },
				{ headers: { 'mcp-name': 'get_cluster_screenshot' } }
			),
			makeEnv()
		)
		expect(response.status).toBe(400)
		expect(await rpcError(response)).toMatchObject({ code: -32020 })
	})

	it('rejects a modern request missing a required header', async () => {
		const request = makeModernRpcRequest('tools/list')
		request.headers.delete('mcp-method')
		const response = await sharedBoardScreenshotMcp(request, makeEnv())
		expect(response.status).toBe(400)
		expect(await rpcError(response)).toMatchObject({ code: -32020 })
	})

	it('decodes a base64-wrapped name header before comparing it', async () => {
		// Tool names are only *recommended* to be header-safe, so a conforming client may wrap one.
		mockPublishedBoard()
		const encoded = `=?base64?${btoa('get_board_info')}?=`
		const result = await rpcResult(
			await sharedBoardScreenshotMcp(
				makeModernRpcRequest(
					'tools/call',
					{ name: 'get_board_info', arguments: { boardId: 'abc' } },
					{ headers: { 'mcp-name': encoded } }
				),
				makeEnv()
			)
		)
		expect(result.isError).toBeUndefined()
		expect(JSON.parse(result.content[0].text).pageCount).toBe(3)
	})
})

describe('board and page info', () => {
	it('lists stable page ids as well as indexes', async () => {
		mockPublishedBoard()
		const result = await callTool('get_board_info', { boardId: 'abc' })

		expect(JSON.parse(result.content[0].text)).toEqual({
			name: 'My Board',
			pageCount: 3,
			pages: [
				{ index: 0, id: 'page:a', name: 'Cover', hasContent: true },
				{ index: 1, id: 'page:b', name: 'Ideas', hasContent: true },
				{ index: 2, id: 'page:c', name: 'Blank', hasContent: false },
			],
		})
	})

	it('lists one cluster per top-level shape', async () => {
		mockPublishedBoard()
		const result = await callTool('get_page_info', { boardId: 'abc', page: 'page:a' })
		const info = JSON.parse(result.content[0].text)

		expect(info.name).toBe('Cover')
		expect(info.clusters).toHaveLength(2)
		// The fixture's shapes carry no text, so there is nothing to derive a keyword label from —
		// an empty label is the honest answer rather than a made-up one.
		expect(info.clusters).toEqual([
			{ id: expect.stringMatching(/^cluster:/), numberOfShapes: 1, label: '', keywords: [] },
			{ id: expect.stringMatching(/^cluster:/), numberOfShapes: 1, label: '', keywords: [] },
		])
	})

	it('returns the shapes in a cluster', async () => {
		mockPublishedBoard()
		const pageResult = await callTool('get_page_info', { boardId: 'abc' })
		const clusterId = JSON.parse(pageResult.content[0].text).clusters[0].id
		const result = await callTool('get_cluster_info', { boardId: 'abc', clusterId })
		const info = JSON.parse(result.content[0].text)

		expect(info).toMatchObject({
			clusterId,
			pageName: 'Cover',
			numberOfShapes: 1,
			shapes: [{ id: 'shape:page:a-0' }],
		})
	})

	// A shape's rich text is a deeply nested ProseMirror document, and a geo shape's label is not on
	// the record under any key at all — so the editor's getText answer replaces it on the way out.
	it('replaces rich text with the plain text the editor reported', async () => {
		mockPublishedBoard()
		const env = makeEnv()
		;(env as any).BROWSER = makeMeasuringBrowserBinding(() => env, {
			'shape:page:a-0': { minX: 0, minY: 0, maxX: 10, maxY: 10, text: 'Checkout total' },
			'shape:page:a-1': { minX: 5000, minY: 0, maxX: 5010, maxY: 10 },
		})

		const pageResult = await callTool('get_page_info', { boardId: 'abc' }, env)
		const clusterId = JSON.parse(pageResult.content[0].text).clusters[0].id
		const result = await callTool('get_cluster_info', { boardId: 'abc', clusterId }, env)
		const shape = JSON.parse(result.content[0].text).shapes[0]

		expect(shape.props.text).toBe('Checkout total')
		expect(shape.props.richText).toBeUndefined()
		// Everything else about the record is passed through untouched.
		expect(shape).toMatchObject({ id: 'shape:page:a-0', typeName: 'shape' })
		expect(shape.plainText).toBeUndefined()
	})
})

// The limits protect a public endpoint and bound Browser Rendering spend; a dev machine is doing
// neither, and a ~2/min cap makes the tools impossible to iterate against. Only an environment that
// sets the var opts out, so these pin both halves of that switch.
// Only the tools that spend Browser Run are limited — get_board_info is not, since it renders
// nothing. The budgets themselves live in config.ts.
// makeToolCall deliberately rotates the client IP per request so tests never limit each other —
// which is exactly what a rate limit test has to defeat, since the budget is per IP.
async function callFromSameIp(env: Environment, ip: string, name: string, args: object) {
	const request = new Request('https://sync.tldraw.xyz/app/mcp', {
		method: 'POST',
		headers: { 'cf-connecting-ip': ip },
		body: JSON.stringify({
			jsonrpc: '2.0',
			id: 1,
			method: 'tools/call',
			params: { name, arguments: args },
		}),
	}) as any
	return rpcResult(await sharedBoardScreenshotMcp(request, env))
}

describe('rate limits', () => {
	it('does not limit get_board_info, which spends no Browser Run', async () => {
		mockPublishedBoard()
		const env = makeEnv()
		for (let i = 0; i < MCP_PER_IP_RATE_LIMIT + 4; i++) {
			const result = await callFromSameIp(env, '203.0.113.200', 'get_board_info', {
				boardId: 'abc',
			})
			expect(result.isError).toBeUndefined()
		}
	})

	it('limits a clustering tool, which does', async () => {
		mockPublishedBoard()
		const env = makeEnv()
		const outcomes: (boolean | undefined)[] = []
		for (let i = 0; i < MCP_PER_IP_RATE_LIMIT + 2; i++) {
			outcomes.push(
				(await callFromSameIp(env, '203.0.113.201', 'get_page_info', { boardId: 'abc' })).isError
			)
		}
		expect(outcomes.some(Boolean)).toBe(true)
	})
})

describe('shape screenshots', () => {
	// Every clustering tool measures the page first, so the quickAction calls are [measure, …, shot].
	// The screenshot job is the one carrying shapeIds.
	const screenshotJobToken = (env: Environment) => {
		const calls = screenshotOf(env).mock.calls
		const body = calls[calls.length - 1][1] as { url: string }
		return new URL(body.url).searchParams.get('token')!
	}

	it('renders a cluster and signs only that cluster’s shape ids into the render job', async () => {
		mockPublishedBoard()
		const env = makeEnv()
		const pageResult = await callTool('get_page_info', { boardId: 'abc' }, env)
		const clusterId = JSON.parse(pageResult.content[0].text).clusters[0].id

		const result = await callTool(
			'get_cluster_screenshot',
			{ boardId: 'abc', clusterIds: [clusterId] },
			env
		)
		expect(result.content).toEqual([
			{ type: 'text', text: 'Cover' },
			{ type: 'image', data: 'AQID', mimeType: 'image/png' },
		])

		const job = await verifyThumbnailRenderToken(env, screenshotJobToken(env))
		expect(job).toMatchObject({ pageId: 'page:a', shapeIds: ['shape:page:a-0'] })
	})

	// The point of taking more than one id: seeing how those clusters sit relative to each other in
	// a single framed image, rather than one call per cluster.
	it('renders several clusters into one image, signing the union of their shapes', async () => {
		mockPublishedBoard()
		const env = makeEnv()
		const pageResult = await callTool('get_page_info', { boardId: 'abc' }, env)
		const clusterIds = JSON.parse(pageResult.content[0].text)
			.clusters.slice(0, 2)
			.map((cluster: any) => cluster.id)
		expect(clusterIds).toHaveLength(2)

		const result = await callTool('get_cluster_screenshot', { boardId: 'abc', clusterIds }, env)
		expect(result.isError).toBeUndefined()

		const job = await verifyThumbnailRenderToken(env, screenshotJobToken(env))
		expect(job!.shapeIds!.length).toBe(2)
	})

	it('rejects unknown cluster ids rather than rendering a subset', async () => {
		mockPublishedBoard()
		const env = makeEnv()

		const missing = await callTool(
			'get_cluster_screenshot',
			{ boardId: 'abc', clusterIds: ['cluster:nope'] },
			env
		)
		expect(missing.isError).toBe(true)
	})
})
