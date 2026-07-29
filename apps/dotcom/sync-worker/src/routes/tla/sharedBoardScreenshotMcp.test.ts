import { afterEach, describe, expect, it, vi } from 'vitest'
import { Environment } from '../../types'
import { verifyThumbnailRenderToken } from '../../utils/renderTokens'
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
	parseBoardInfoInput,
	parseClusterInfoInput,
	parseClusterScreenshotInput,
	parsePageInfoInput,
	sharedBoardScreenshotMcp,
} from './sharedBoardScreenshotMcp'
import { resetRateLimitFallbackForTests } from './thumbnailRender'

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

async function rpcResult(response: Response) {
	return ((await response.json()) as any).result
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
describe('rate limits', () => {
	// makeToolCall deliberately rotates the client IP per request so tests never limit each other —
	// which is exactly what these two need to defeat, since the limit is per IP.
	async function callFromSameIp(env: Environment, ip: string) {
		const request = new Request('https://sync.tldraw.xyz/app/mcp', {
			method: 'POST',
			headers: { 'cf-connecting-ip': ip },
			body: JSON.stringify({
				jsonrpc: '2.0',
				id: 1,
				method: 'tools/call',
				params: { name: 'get_board_info', arguments: { boardId: 'abc' } },
			}),
		}) as any
		return rpcResult(await sharedBoardScreenshotMcp(request, env))
	}

	it('limits repeated calls from one client by default', async () => {
		mockPublishedBoard()
		const env = makeEnv()
		const outcomes: (boolean | undefined)[] = []
		for (let i = 0; i < 5; i++) outcomes.push((await callFromSameIp(env, '203.0.113.200')).isError)
		expect(outcomes.some(Boolean)).toBe(true)
	})

	it('does not limit when the dev var is set', async () => {
		mockPublishedBoard()
		const env = makeEnv({ MCP_SCREENSHOT_RATE_LIMITS_DISABLED: 'true' })
		for (let i = 0; i < 8; i++) {
			expect((await callFromSameIp(env, '203.0.113.201')).isError).toBeUndefined()
		}
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
