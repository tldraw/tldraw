import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MCP_PER_USER_RATE_LIMIT } from '../../config'
import { Environment } from '../../types'
import { verifyThumbnailRenderToken } from '../../utils/renderTokens'
import { hasReadAccessToFile } from '../../utils/tla/getAuth'
import {
	parseBoardInfoInput,
	parseClusterInfoInput,
	parseClusterScreenshotInput,
	parsePageInfoInput,
} from './boardTools'
import { getPublishedFileInfo, getPublishedRoomSnapshot } from './getPublishedFile'
import { getSharedFileInfo, getSharedFileRoomSnapshot } from './getSharedFile'
import { authenticateMcpRequest } from './mcpAuth'
import {
	blobsWithPrefix,
	callerBlobsOf,
	failureBlobsOf,
	makeBrowserBinding,
	makeFakeRoomsBucket,
	makeFakeThumbnailsBucket,
	makeMeasuringBrowserBinding,
	makeScreenshotTestEnv,
	makeSnapshot,
	screenshotOf,
	sessionsOf,
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

// Keep the real isFileAnonymouslyViewable so the route's share gate is exercised for real; only the
// DB/R2 lookups are mocked.
vi.mock('./getSharedFile', async (importOriginal) => ({
	...(await importOriginal<typeof import('./getSharedFile')>()),
	getSharedFileInfo: vi.fn(),
	getSharedFileRoomSnapshot: vi.fn(),
}))

// The board access check is a Postgres read. Mocked here so these tests stay about what the tools do
// with the answer; the check's own logic and the auth layer's are covered in getAuth and mcpAuth.
vi.mock('../../utils/tla/getAuth', () => ({ hasReadAccessToFile: vi.fn() }))

// Same for authentication: every case below runs as an already-authorized caller, and the token and
// flag handling that produces that verdict is covered in mcpAuth.test.ts. The user id is read back
// off the request so a test can act as more than one caller — which the per-user rate limit needs.
vi.mock('./mcpAuth', () => ({ authenticateMcpRequest: vi.fn() }))

beforeEach(() => {
	vi.mocked(authenticateMcpRequest).mockImplementation(async (request: any) => ({
		ok: true,
		userId: request.headers.get('x-test-user') ?? 'user_default',
	}))
	// Not the caller's file unless a test says otherwise, which leaves published boards as the default
	// way a board resolves — the same starting point these tests had before the access check existed.
	vi.mocked(hasReadAccessToFile).mockResolvedValue(false)
})

afterEach(() => {
	vi.clearAllMocks()
	resetRateLimitFallbackForTests()
})

const PAGES = [
	{ id: 'page:a', name: 'Cover', index: 'a1', shapes: 2 },
	{ id: 'page:b', name: 'Ideas', index: 'a2', shapes: 1 },
	{ id: 'page:c', name: 'Blank', index: 'a3', shapes: 0 },
]

// The MCP tests assert the render URL against a render origin that is deliberately not the client's
// real origin, so pin a distinct one here rather than using the shared default. THUMBNAILS holds
// measure results and render-token records; MCP_DATA_BUCKET is where the tools cache their PNGs.
// The clustering tools measure the page in a render before they can group anything, so the fake
// browser plays the render page's part and posts a measure result.
function makeEnv(overrides: Partial<Record<string, unknown>> = {}) {
	const env: Environment = makeScreenshotTestEnv({
		MCP_SCREENSHOT_RENDER_ORIGIN: 'https://render.example',
		THUMBNAILS: makeFakeThumbnailsBucket(),
		MCP_DATA_BUCKET: makeFakeThumbnailsBucket(),
		...overrides,
	})
	if (!('BROWSER' in overrides)) {
		;(env as any).BROWSER = makeMeasuringBrowserBinding(() => env)
	}
	return env
}

// `userId` is who the mocked auth layer will report for this request — the key the per-user rate
// limits and the board access check both work from.
function makeRpcRequest(userId: string, method: string, params?: unknown) {
	return new Request('https://sync.tldraw.xyz/app/mcp', {
		method: 'POST',
		headers: { 'x-test-user': userId },
		body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
	}) as any
}

function makeToolCall(userId: string, name: string, args: object) {
	return makeRpcRequest(userId, 'tools/call', { name, arguments: args })
}

const MODERN_VERSION = '2026-07-28'
const LEGACY_VERSION = '2025-11-25'

// A 2026-07-28 request: version on every request, method and tool name mirrored into headers.
// `headers` overrides let a test break one of those mirrors on purpose.
function makeModernRpcRequest(
	userId: string,
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
			'x-test-user': userId,
			'mcp-protocol-version': version,
			'mcp-method': method,
			...(name ? { 'mcp-name': name } : {}),
			...headers,
		},
		body: JSON.stringify({
			jsonrpc: '2.0',
			id: 1,
			method,
			params: { ...params, _meta: { 'io.modelcontextprotocol/protocolVersion': version } },
		}),
	}) as any
}

async function errorOf(response: Response) {
	return ((await response.json()) as any).error
}

async function resultOf(response: Response) {
	return ((await response.json()) as any).result
}

async function callTool(userId: string, name: string, args: object, env = makeEnv()) {
	return resultOf(await sharedBoardScreenshotMcp(makeToolCall(userId, name, args), env))
}

function mockPublishedBoard(snapshot = makeSnapshot(PAGES)) {
	// clearAllMocks (afterEach) resets call history but not mockResolvedValue, so a shared-file
	// result set by an earlier test would leak in and make this published board resolve as a
	// shared file (then hit env.ROOMS). Explicitly clear it: a published board has no shared row.
	vi.mocked(getSharedFileInfo).mockResolvedValue(null)
	vi.mocked(getPublishedFileInfo).mockResolvedValue({
		id: 'file-1',
		published: true,
		lastPublished: 1751234567890,
	})
	vi.mocked(getPublishedRoomSnapshot).mockResolvedValue(snapshot)
}

// Every clustering tool measures the page in a render before it can do anything else, so the
// quickAction calls are [measure, …, shot]: the first call carries the measure job and the last
// carries the screenshot job with shapeIds.
function jobTokenOfCall(env: Environment, index: number) {
	const calls = screenshotOf(env).mock.calls
	const body = calls.at(index)![1] as { url: string }
	return new URL(body.url).searchParams.get('token')!
}

// Cluster ids are content-derived hashes and every fixture board shares one snapshot, so an id
// fetched once names the same cluster on every board. Fetched by a helper user where the test is
// about budgets, so the lookup spends nobody's budget but the helper's.
async function firstClusterId(env: Environment, userId: string, boardId: string, page?: unknown) {
	const pageResult = await callTool(userId, 'get_page_info', { boardId, page }, env)
	return JSON.parse(pageResult.content[0].text).clusters[0].id as string
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
		expect(() => parsePageInfoInput({ boardId: 'abc', page: 1.5 })).toThrow('page must be')
		expect(() => parseBoardInfoInput({})).toThrow('boardId is required')
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

	// An unrecognized theme is rejected rather than silently rendered as light, so a caller that
	// asks for something the tool doesn't support hears about it instead of getting a plausible
	// image back with its argument quietly dropped.
	it('rejects an unrecognized theme', () => {
		expect(() =>
			parseClusterScreenshotInput({ boardId: 'a', clusterIds: 'c', theme: 'blue' })
		).toThrow('theme must be')
		expect(parseClusterScreenshotInput({ boardId: 'a', clusterIds: 'c', theme: null }).theme).toBe(
			'light'
		)
	})
})

describe('MCP server', () => {
	it('lists the replacement tools without the old page screenshot tool', async () => {
		const result = await resultOf(
			await sharedBoardScreenshotMcp(makeRpcRequest('user_1', 'tools/list'), makeEnv())
		)
		expect(result.tools.map((tool: any) => tool.name)).toEqual([
			'get_board_info',
			'get_page_info',
			'get_cluster_info',
			'get_cluster_screenshot',
		])
	})
})

describe('protocol version negotiation', () => {
	// A post-handshake request states its version in a header rather than the body; makeRpcRequest
	// deliberately sends none (the pre-2025-06-18 shape every other test exercises), so this builds
	// the request by hand.
	function makeVersionedListRequest(version: string) {
		return new Request('https://sync.tldraw.xyz/app/mcp', {
			method: 'POST',
			headers: { 'x-test-user': 'user_60', 'mcp-protocol-version': version },
			body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
		}) as any
	}

	it('answers initialize with the legacy version, whatever was asked for', async () => {
		// `initialize` belongs to the legacy era, so it can only ever produce the legacy version: a
		// client that speaks modern never calls it. Anything else asked for is offered this instead,
		// and the client decides whether it can follow — the shape the spec asks for.
		for (const params of [
			{ protocolVersion: '2025-11-25' },
			{ protocolVersion: '2025-06-18' },
			{ protocolVersion: '2024-11-05' },
			{ protocolVersion: MODERN_VERSION },
			undefined,
		]) {
			const result = await resultOf(
				await sharedBoardScreenshotMcp(makeRpcRequest('user_60', 'initialize', params), makeEnv())
			)
			expect(result.protocolVersion).toBe(LEGACY_VERSION)
		}
	})

	it('serves both supported versions and refuses others naming the list', async () => {
		for (const version of [MODERN_VERSION, LEGACY_VERSION]) {
			// The modern era mirrors the method into a header, so send it for that one.
			const request =
				version === MODERN_VERSION
					? makeModernRpcRequest('user_60', 'tools/list')
					: makeVersionedListRequest(version)
			const response = await sharedBoardScreenshotMcp(request, makeEnv())
			expect(response.status).toBe(200)
		}

		// Refusal covers both directions: a version this server predates is as unspeakable as one it
		// dropped, and guessing at either would have the client trusting answers shaped for a
		// different revision.
		for (const version of ['2024-11-05', '2025-03-26', '2025-06-18']) {
			const response = await sharedBoardScreenshotMcp(makeVersionedListRequest(version), makeEnv())
			expect(response.status).toBe(400)
			const error = await errorOf(response)
			expect(error.code).toBe(-32022)
			expect(error.data).toEqual({
				supported: [MODERN_VERSION, LEGACY_VERSION],
				requested: version,
			})
		}
	})

	it('reports what it speaks, so a client can pick a version', async () => {
		const result = await resultOf(
			await sharedBoardScreenshotMcp(makeModernRpcRequest('user_60', 'server/discover'), makeEnv())
		)
		expect(result).toMatchObject({
			resultType: 'complete',
			supportedVersions: [MODERN_VERSION, LEGACY_VERSION],
			capabilities: { tools: {} },
			cacheScope: 'public',
			_meta: { 'io.modelcontextprotocol/serverInfo': { name: 'tldraw-shared-board-screenshot' } },
		})
	})

	it('answers server/discover even when the request names a version it does not speak', async () => {
		// Refusing here would leave the client no way to find a version we have in common.
		const response = await sharedBoardScreenshotMcp(
			makeModernRpcRequest('user_60', 'server/discover', undefined, { version: '2024-11-05' }),
			makeEnv()
		)
		expect(response.status).toBe(200)
		expect((await resultOf(response)).supportedVersions).toEqual([MODERN_VERSION, LEGACY_VERSION])
	})

	it('still requires authentication to discover', async () => {
		// Discovery sits behind the same 401 as everything else: that response is what points a client
		// at the metadata it needs, and exempting one method would reopen the anonymous tier.
		vi.mocked(authenticateMcpRequest).mockResolvedValue({
			ok: false,
			response: new Response('Unauthorized', { status: 401 }),
		} as any)
		const response = await sharedBoardScreenshotMcp(
			makeModernRpcRequest('user_60', 'server/discover'),
			makeEnv()
		)
		expect(response.status).toBe(401)
	})

	it('envelopes modern results and leaves legacy ones alone', async () => {
		const modern = await resultOf(
			await sharedBoardScreenshotMcp(makeModernRpcRequest('user_60', 'tools/list'), makeEnv())
		)
		expect(modern).toMatchObject({ resultType: 'complete', cacheScope: 'public' })
		expect(modern.ttlMs).toBeGreaterThan(0)

		const legacy = await resultOf(
			await sharedBoardScreenshotMcp(makeRpcRequest('user_61', 'tools/list'), makeEnv())
		)
		expect(legacy.resultType).toBeUndefined()
		expect(legacy.ttlMs).toBeUndefined()
		expect(legacy._meta).toBeUndefined()
		// Same tools either way — only the envelope differs.
		expect(legacy.tools).toEqual(modern.tools)
	})

	it('drops ping for modern callers, which no longer have it', async () => {
		const response = await sharedBoardScreenshotMcp(
			makeModernRpcRequest('user_60', 'ping'),
			makeEnv()
		)
		expect(response.status).toBe(404)
		expect((await errorOf(response)).code).toBe(-32601)
	})

	it('answers anything but POST with 405', async () => {
		const response = await sharedBoardScreenshotMcp(
			new Request('https://sync.tldraw.xyz/app/mcp', { method: 'GET' }) as any,
			makeEnv()
		)
		expect(response.status).toBe(405)
	})
})

// The routing headers duplicate body fields, so a disagreement between them has to be rejected.
describe('modern request headers', () => {
	it('rejects a method header that disagrees with the body', async () => {
		const response = await sharedBoardScreenshotMcp(
			makeModernRpcRequest('user_62', 'tools/list', undefined, {
				headers: { 'mcp-method': 'tools/call' },
			}),
			makeEnv()
		)
		expect(response.status).toBe(400)
		expect((await errorOf(response)).code).toBe(-32020)
	})

	it('rejects a tool call whose name header disagrees with the body', async () => {
		const response = await sharedBoardScreenshotMcp(
			makeModernRpcRequest(
				'user_62',
				'tools/call',
				{ name: 'get_board_info', arguments: { boardId: 'abc' } },
				{ headers: { 'mcp-name': 'get_cluster_screenshot' } }
			),
			makeEnv()
		)
		expect(response.status).toBe(400)
		expect((await errorOf(response)).code).toBe(-32020)
	})

	it('rejects a modern request missing a required header', async () => {
		const request = makeModernRpcRequest('user_62', 'tools/list')
		request.headers.delete('mcp-method')
		const response = await sharedBoardScreenshotMcp(request, makeEnv())
		expect(response.status).toBe(400)
		expect((await errorOf(response)).code).toBe(-32020)
	})

	it('decodes a base64-wrapped name header before comparing it', async () => {
		// Tool names are only *recommended* to be header-safe, so a conforming client may wrap one.
		mockPublishedBoard()
		const result = await resultOf(
			await sharedBoardScreenshotMcp(
				makeModernRpcRequest(
					'user_62',
					'tools/call',
					{ name: 'get_board_info', arguments: { boardId: 'abc' } },
					{ headers: { 'mcp-name': `=?base64?${btoa('get_board_info')}?=` } }
				),
				makeEnv()
			)
		)
		expect(result.resultType).toBe('complete')
		expect(JSON.parse(result.content[0].text).pageCount).toBe(3)
	})
})

describe('MCP_SCREENSHOT_ENABLED', () => {
	// The switch is read per request rather than baked in at build time, so flipping the var takes
	// the server down without a rebuild.
	it('serves the server when unset or "true"', () => {
		expect(isMcpScreenshotEnabled(makeEnv())).toBe(true)
		expect(isMcpScreenshotEnabled(makeEnv({ MCP_SCREENSHOT_ENABLED: 'true' }))).toBe(true)
		expect(isMcpScreenshotEnabled(makeEnv({ MCP_SCREENSHOT_ENABLED: ' TRUE ' }))).toBe(true)
	})

	// Anything unrecognized disables: someone reaching for the kill switch under pressure and typing
	// `0` or `off` should get a disabled server, not a silently still-running one.
	it('disables the server for "false" and for any unrecognized value', () => {
		for (const value of ['false', '0', 'off', 'no', 'disabled']) {
			expect(isMcpScreenshotEnabled(makeEnv({ MCP_SCREENSHOT_ENABLED: value }))).toBe(false)
		}
	})

	it('answers every request with 404 while disabled, without touching the board', async () => {
		// A board that would otherwise render, so the untouched screenshot binding below means the
		// switch stopped the request rather than the board simply not resolving.
		mockPublishedBoard()
		const env = makeEnv({ MCP_SCREENSHOT_ENABLED: 'false' })

		const response = await sharedBoardScreenshotMcp(
			makeToolCall('user_40', 'get_cluster_screenshot', {
				boardId: 'abc',
				clusterIds: ['cluster:any'],
			}),
			env
		)

		expect(response.status).toBe(404)
		expect(screenshotOf(env)).not.toHaveBeenCalled()
		expect(getPublishedFileInfo).not.toHaveBeenCalled()
	})

	// Disabled means gone, not "here but empty": a client that can still initialize and list tools
	// would advertise tools that every call then rejects.
	it('hides the protocol handshake while disabled', async () => {
		const response = await sharedBoardScreenshotMcp(
			makeRpcRequest('user_41', 'initialize'),
			makeEnv({ MCP_SCREENSHOT_ENABLED: 'false' })
		)

		expect(response.status).toBe(404)
	})
})

describe('get_board_info', () => {
	it('returns the board name, page count, and stable page ids as well as indexes', async () => {
		mockPublishedBoard()
		const result = await callTool('user_1', 'get_board_info', { boardId: 'abc' })

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

	it('resolves a shared file id and never spends browser capacity', async () => {
		vi.mocked(hasReadAccessToFile).mockResolvedValue(true)
		vi.mocked(getSharedFileInfo).mockResolvedValue({ id: 'f1', shared: true, isDeleted: false })
		vi.mocked(getSharedFileRoomSnapshot).mockResolvedValue(makeSnapshot(PAGES))
		const env = makeEnv({ ROOMS: makeFakeRoomsBucket() })

		const result = await callTool('user_2', 'get_board_info', { boardId: 'f1' }, env)

		expect(JSON.parse(result.content[0].text).pageCount).toBe(3)
		expect(getPublishedFileInfo).not.toHaveBeenCalled()
		expect(screenshotOf(env)).not.toHaveBeenCalled()
	})

	it('errors when no board resolves for this caller', async () => {
		vi.mocked(getSharedFileInfo).mockResolvedValue(null)
		vi.mocked(getPublishedFileInfo).mockResolvedValue(null)

		const result = await callTool('user_3', 'get_board_info', { boardId: 'missing' })
		expect(result.isError).toBe(true)
		expect(result.content[0].text).toContain('No board was found with this id')
	})

	// A board that resolves but whose snapshot read fails is not an empty board. Saying "no saved
	// content" would tell the caller the board is fine and simply blank, and would leave the real
	// failure with no trace. The caller hears that the read failed — but in bounded words: pg errors
	// carry the database host, port, and username, none of which is the caller's business.
	it('surfaces a failed snapshot read without leaking the underlying error', async () => {
		mockPublishedBoard()
		// `Once` so the rejection can't leak into later tests (clearAllMocks resets call history, not
		// implementations).
		vi.mocked(getPublishedRoomSnapshot).mockRejectedValueOnce(
			new Error('connect ECONNREFUSED 10.0.0.5:5432')
		)

		const result = await callTool('user_4', 'get_board_info', { boardId: 'abc' })
		expect(result.isError).toBe(true)
		expect(result.content[0].text).toBe(
			"Could not read board info: the board's saved content could not be read."
		)
		expect(result.content[0].text).not.toContain('no saved content')
	})

	it('errors for a shared file with no saved content', async () => {
		vi.mocked(hasReadAccessToFile).mockResolvedValue(true)
		vi.mocked(getSharedFileInfo).mockResolvedValue({ id: 'e', shared: true, isDeleted: false })

		const result = await callTool(
			'user_9',
			'get_board_info',
			{ boardId: 'e' },
			makeEnv({ ROOMS: makeFakeRoomsBucket(null) })
		)

		expect(result.isError).toBe(true)
		expect(result.content[0].text).toContain('no saved content')
		// An empty file the caller can see is still their board: it must not fall through to the
		// published lookup and get misreported as not found.
		expect(result.content[0].text).not.toContain('No board was found')
		expect(getPublishedFileInfo).not.toHaveBeenCalled()
	})

	// A board un-shared between the resolve and the snapshot read trips the gate the reader
	// re-checks. That is not told apart from any other read failure here — the race is a few
	// milliseconds wide — so the caller gets the same bounded read-failure message, and Sentry gets
	// the original.
	it('reports a board that goes private mid-request as a read failure', async () => {
		vi.mocked(hasReadAccessToFile).mockResolvedValue(true)
		vi.mocked(getSharedFileInfo).mockResolvedValue({ id: 'f', shared: true, isDeleted: false })
		vi.mocked(getSharedFileRoomSnapshot).mockRejectedValueOnce(new Error('not shared'))

		const result = await callTool(
			'user_5',
			'get_board_info',
			{ boardId: 'f' },
			makeEnv({ ROOMS: makeFakeRoomsBucket() })
		)
		expect(result.isError).toBe(true)
		expect(result.content[0].text).toBe(
			"Could not read board info: the board's saved content could not be read."
		)
	})
})

describe('page and cluster info', () => {
	it('lists one cluster per top-level shape', async () => {
		mockPublishedBoard()
		const result = await callTool('user_6', 'get_page_info', { boardId: 'abc', page: 'page:a' })
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
		const env = makeEnv()
		const clusterId = await firstClusterId(env, 'user_7', 'abc')
		const result = await callTool('user_7', 'get_cluster_info', { boardId: 'abc', clusterId }, env)
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

		const clusterId = await firstClusterId(env, 'user_8', 'abc')
		const result = await callTool('user_8', 'get_cluster_info', { boardId: 'abc', clusterId }, env)
		const shape = JSON.parse(result.content[0].text).shapes[0]

		expect(shape.props.text).toBe('Checkout total')
		expect(shape.props.richText).toBeUndefined()
		// Everything else about the record is passed through untouched.
		expect(shape).toMatchObject({ id: 'shape:page:a-0', typeName: 'shape' })
		expect(shape.plainText).toBeUndefined()
	})
})

// Only the tools that spend Browser Run are limited — get_board_info is not, since it renders
// nothing. The budgets themselves live in config.ts, and they are per account: the auth layer is
// what made that identity trustworthy, where the per-IP keys this replaced were evaded by a proxy
// pool and shared across a NAT.
describe('rate limits', () => {
	it('does not limit get_board_info, which spends no Browser Run', async () => {
		mockPublishedBoard()
		const env = makeEnv()
		for (let i = 0; i < MCP_PER_USER_RATE_LIMIT + 4; i++) {
			const result = await callTool('user_50', 'get_board_info', { boardId: 'abc' }, env)
			expect(result.isError).toBeUndefined()
		}
	})

	it('limits a clustering tool, which does', async () => {
		mockPublishedBoard()
		const env = makeEnv()
		const outcomes: (boolean | undefined)[] = []
		for (let i = 0; i < MCP_PER_USER_RATE_LIMIT + 2; i++) {
			outcomes.push((await callTool('user_51', 'get_page_info', { boardId: 'abc' }, env)).isError)
		}
		expect(outcomes.some(Boolean)).toBe(true)
	})

	// Pins the configured per-user budget, not merely that some limit eventually fires. Each call
	// uses a distinct board so the per-board limiter can never be what trips, and the run stops one
	// call past the budget so it stays below the global cap — otherwise a passing test could not say
	// which of the three limits it had actually exercised.
	it(`allows ${MCP_PER_USER_RATE_LIMIT} screenshots per account per minute, then rate limits`, async () => {
		mockPublishedBoard()
		const env = makeEnv()
		const clusterId = await firstClusterId(env, 'user_helper', 'board-0')

		const results = []
		for (let i = 0; i <= MCP_PER_USER_RATE_LIMIT; i++) {
			results.push(
				await callTool(
					'user_20',
					'get_cluster_screenshot',
					{ boardId: `board-${i}`, clusterIds: [clusterId] },
					env
				)
			)
		}

		expect(results.slice(0, MCP_PER_USER_RATE_LIMIT).map((r) => r.isError)).toEqual(
			Array(MCP_PER_USER_RATE_LIMIT).fill(undefined)
		)
		const blocked = results[MCP_PER_USER_RATE_LIMIT]
		expect(blocked.isError).toBe(true)
		// The per-user message specifically, so this can't pass on the global cap firing instead.
		expect(blocked.content[0].text).toContain('per minute per account')
		expect(failureBlobsOf(env)).toContain('failure:rate_limited_user')
	})

	// The point of re-keying off IP: a second account gets its own budget, and one account
	// exhausting its own does not touch it. Under the old key both callers behind one NAT shared a
	// single budget, and one caller with a proxy pool had as many as it liked.
	it('gives each account its own budget', async () => {
		mockPublishedBoard()
		const env = makeEnv()
		const clusterId = await firstClusterId(env, 'user_helper', 'board-0')

		for (let i = 0; i <= MCP_PER_USER_RATE_LIMIT; i++) {
			await callTool(
				'user_noisy',
				'get_cluster_screenshot',
				{ boardId: `board-${i}`, clusterIds: [clusterId] },
				env
			)
		}
		expect(failureBlobsOf(env)).toContain('failure:rate_limited_user')

		const other = await callTool(
			'user_quiet',
			'get_cluster_screenshot',
			{ boardId: 'board-0', clusterIds: [clusterId] },
			env
		)
		expect(other.isError).toBeUndefined()
	})

	// Per-board is deliberately far tighter than per-account: this blocks on the third capture of
	// one board while the same account still has plenty of budget left.
	//
	// Note what this can and cannot check. Tests run with no rate limit bindings, so both budgets
	// take the isolate-local fallback and only the key and the fallback limit matter here — the part
	// that makes different numbers possible in a *deployment* is per-board having its own Cloudflare
	// binding (MCP_SERVER_BOARD_RATE_LIMITER), and no unit test can see that. wrangler.toml is the
	// only place that goes wrong, and the only place to check it.
	const PER_BOARD_RATE_LIMIT = 2
	it(`allows ${PER_BOARD_RATE_LIMIT} captures per board per minute, well inside the per-account budget`, async () => {
		mockPublishedBoard()
		const env = makeEnv()
		// Distinct cache keys on one board: two pages, then the first page again in the other theme.
		const coverCluster = await firstClusterId(env, 'user_helper', 'abc', 0)
		const ideasCluster = await firstClusterId(env, 'user_helper', 'abc', 1)
		const calls = [
			{ boardId: 'abc', page: 0, clusterIds: [coverCluster] },
			{ boardId: 'abc', page: 1, clusterIds: [ideasCluster] },
			{ boardId: 'abc', page: 0, clusterIds: [coverCluster], theme: 'dark' },
		]

		const results = []
		for (const args of calls) {
			results.push(await callTool('user_21', 'get_cluster_screenshot', args, env))
		}

		expect(results.slice(0, PER_BOARD_RATE_LIMIT).map((r) => r.isError)).toEqual(
			Array(PER_BOARD_RATE_LIMIT).fill(undefined)
		)
		const blocked = results[PER_BOARD_RATE_LIMIT]
		expect(blocked.isError).toBe(true)
		expect(blocked.content[0].text).toContain('This board is being screenshotted too frequently')
		expect(failureBlobsOf(env)).toContain('failure:rate_limited_board')
		// Only 3 captures in, so neither the per-user (10) nor the global (20) budget can be what
		// fired.
		expect(failureBlobsOf(env)).not.toContain('failure:rate_limited_user')
		expect(failureBlobsOf(env)).not.toContain('failure:rate_limited_global')
		// The board guard fires after the measure the cache key required — that session is on the
		// spend ledger even though the request was blocked.
		expect(sessionsOf(env).at(-1)).toMatchObject({ mode: 'measure', outcome: 'ok' })
	})
})

describe('shape screenshots', () => {
	it('renders a cluster and signs only that cluster’s shape ids into the render job', async () => {
		mockPublishedBoard()
		const env = makeEnv()
		const clusterId = await firstClusterId(env, 'user_60', 'abc')

		const result = await callTool(
			'user_60',
			'get_cluster_screenshot',
			{ boardId: 'abc', clusterIds: [clusterId] },
			env
		)
		expect(result.content).toEqual([
			{ type: 'text', text: 'Cover' },
			{ type: 'image', data: 'AQID', mimeType: 'image/png' },
		])

		const job = await verifyThumbnailRenderToken(env, jobTokenOfCall(env, -1))
		expect(job).toMatchObject({ pageId: 'page:a', shapeIds: ['shape:page:a-0'], camera: 'content' })
		// Every render — the measures included — targets the pinned render origin, never the
		// user-facing board URL: the browser session only ever visits the tldraw-owned render page.
		for (const call of screenshotOf(env).mock.calls) {
			const url = (call[1] as { url: string }).url
			expect(url).toContain('https://render.example')
			expect(url).not.toContain('www.tldraw.com')
		}
		// Cached under the shape-set key in the MCP bucket, whose keys carry the content version and
		// age out — not in THUMBNAILS, whose keys live forever.
		const bucket = env.MCP_DATA_BUCKET as unknown as { store: Map<string, unknown> }
		expect([...bucket.store.keys()]).toEqual([
			expect.stringMatching(/^mcp\/published\/abc\/1751234567890\/1200x630\/light\/shapes-/),
		])
	})

	// The point of taking more than one id: seeing how those clusters sit relative to each other in
	// a single framed image, rather than one call per cluster.
	it('renders several clusters into one image, signing the union of their shapes', async () => {
		mockPublishedBoard()
		const env = makeEnv()
		const pageResult = await callTool('user_61', 'get_page_info', { boardId: 'abc' }, env)
		const clusterIds = JSON.parse(pageResult.content[0].text)
			.clusters.slice(0, 2)
			.map((cluster: any) => cluster.id)
		expect(clusterIds).toHaveLength(2)

		const result = await callTool(
			'user_61',
			'get_cluster_screenshot',
			{ boardId: 'abc', clusterIds },
			env
		)
		expect(result.isError).toBeUndefined()

		const job = await verifyThumbnailRenderToken(env, jobTokenOfCall(env, -1))
		expect(job!.shapeIds!.length).toBe(2)
	})

	it('rejects unknown cluster ids rather than rendering a subset', async () => {
		mockPublishedBoard()
		const env = makeEnv()

		const missing = await callTool(
			'user_62',
			'get_cluster_screenshot',
			{ boardId: 'abc', clusterIds: ['cluster:nope'] },
			env
		)
		expect(missing.isError).toBe(true)
	})

	// A cache hit skips the capture but not the measure: the shape-set cache key cannot be built
	// before the cluster ids are resolved against the page, and that resolution is the measure.
	it('serves a cached shape set without capturing again', async () => {
		mockPublishedBoard()
		const env = makeEnv()
		const clusterId = await firstClusterId(env, 'user_63', 'abc')

		await callTool(
			'user_63',
			'get_cluster_screenshot',
			{ boardId: 'abc', clusterIds: [clusterId] },
			env
		)
		const second = await callTool(
			'user_64',
			'get_cluster_screenshot',
			{ boardId: 'abc', clusterIds: [clusterId] },
			env
		)

		expect(second.content).toEqual([
			{ type: 'text', text: 'Cover' },
			{ type: 'image', data: 'AQID', mimeType: 'image/png' },
		])
		// helper measure (1) + first call's measure and capture (2) + second call's measure only (1).
		expect(screenshotOf(env)).toHaveBeenCalledTimes(4)
		// The hit's request row records only the cache outcome; the measure it unavoidably ran is a
		// session on its own ledger, so the spend is neither lost nor smuggled into a cache row.
		expect(blobsWithPrefix(env, 'cache:').at(-1)).toBe('cache:hit')
		expect(sessionsOf(env).map((s) => `${s.mode}:${s.outcome}`)).toEqual([
			'measure:ok',
			'measure:ok',
			'screenshot:ok',
			'measure:ok',
		])
	})

	it('records the measure session of get_page_info on the spend ledger', async () => {
		mockPublishedBoard()
		const env = makeEnv()

		const result = await callTool(
			'user_pi_spend',
			'get_page_info',
			{ boardId: 'abc', page: 0 },
			env
		)

		expect(result.isError).toBeUndefined()
		// The request row has no cache to report on; the spend lives on the session row.
		expect(blobsWithPrefix(env, 'cache:')).toEqual(['cache:none'])
		expect(failureBlobsOf(env)).toEqual(['failure:none'])
		expect(sessionsOf(env)).toEqual([
			{
				source: 'mcp',
				mode: 'measure',
				outcome: 'ok',
				reason: 'none',
				durationMs: expect.any(Number),
			},
		])
	})

	it('records the measure session of get_cluster_info on the spend ledger', async () => {
		mockPublishedBoard()
		const env = makeEnv()
		const clusterId = await firstClusterId(env, 'user_ci_spend', 'abc')

		const result = await callTool(
			'user_ci_spend',
			'get_cluster_info',
			{ boardId: 'abc', clusterId },
			env
		)

		expect(result.isError).toBeUndefined()
		// One session from the firstClusterId helper's get_page_info, one from this call.
		expect(sessionsOf(env).map((s) => s.mode)).toEqual(['measure', 'measure'])
	})

	it('writes a telemetry row when get_page_info cannot resolve the board', async () => {
		vi.mocked(hasReadAccessToFile).mockResolvedValue(false)
		vi.mocked(getSharedFileInfo).mockResolvedValue(null)
		vi.mocked(getPublishedFileInfo).mockResolvedValue(null)
		const env = makeEnv({ ROOMS: makeFakeRoomsBucket() })

		const result = await callTool('user_pi_nf', 'get_page_info', { boardId: 'nope', page: 0 }, env)

		expect(result.isError).toBe(true)
		expect(failureBlobsOf(env)).toEqual(['failure:not_found'])
		// The refusal came before the measure: no session existed, so none is on the ledger.
		expect(sessionsOf(env)).toEqual([])
	})

	it('errors when the page is out of range, without spending a render', async () => {
		mockPublishedBoard()
		const env = makeEnv()

		const result = await callTool(
			'user_65',
			'get_cluster_screenshot',
			{ boardId: 'abc', page: 9, clusterIds: ['cluster:any'] },
			env
		)
		expect(result.isError).toBe(true)
		expect(result.content[0].text).toContain('out of range')
		expect(screenshotOf(env)).not.toHaveBeenCalled()
		// The documented reason vocabulary keeps selector mistakes distinct from missing boards —
		// `failure:not_found` here would send a dashboard reader hunting for deleted boards.
		expect(failureBlobsOf(env)).toContain('failure:page_out_of_range')
	})

	it('reports an empty board as board_empty in telemetry, not as a missing board', async () => {
		vi.mocked(hasReadAccessToFile).mockResolvedValue(true)
		vi.mocked(getSharedFileInfo).mockResolvedValue({ id: 'e', shared: true, isDeleted: false })
		const env = makeEnv({ ROOMS: makeFakeRoomsBucket(null) })

		const result = await callTool(
			'user_empty_board',
			'get_cluster_screenshot',
			{ boardId: 'e', clusterIds: ['cluster:any'] },
			env
		)

		expect(result.isError).toBe(true)
		expect(result.content[0].text).toContain('no saved content')
		expect(failureBlobsOf(env)).toContain('failure:board_empty')
	})

	it('reports a board with no pages as no_pages in telemetry', async () => {
		mockPublishedBoard(makeSnapshot([]))
		const env = makeEnv()

		const result = await callTool(
			'user_no_pages',
			'get_cluster_screenshot',
			{ boardId: 'abc', clusterIds: ['cluster:any'] },
			env
		)

		expect(result.isError).toBe(true)
		expect(result.content[0].text).toContain('no pages')
		expect(failureBlobsOf(env)).toContain('failure:no_pages')
	})

	it('waits on either terminal selector and captures a success-only element so failed renders fail fast', async () => {
		mockPublishedBoard()
		const env = makeEnv()
		const clusterId = await firstClusterId(env, 'user_66', 'abc')

		await callTool(
			'user_66',
			'get_cluster_screenshot',
			{ boardId: 'abc', clusterIds: [clusterId] },
			env
		)

		const calls = screenshotOf(env).mock.calls
		const body = calls.at(-1)![1] as {
			gotoOptions: { waitUntil: string }
			waitForSelector: { selector: string }
			selector: string
		}
		// Navigation must not wait for `load`. It doesn't fire until every subresource settles, so one
		// stalled image request holds it open for the whole timeout and the quick action fails before
		// the selector wait below is reached — even though the page marked itself ready long earlier.
		// The selector is the completion signal; navigation just has to get the page running.
		expect(body.gotoOptions.waitUntil).toBe('domcontentloaded')
		// Waits on ready OR error, so an errored render returns instead of burning the full timeout.
		expect(body.waitForSelector.selector).toBe(
			'[data-thumbnail-ready="true"], [data-thumbnail-error]'
		)
		// Captures a success-only element, so a failed render has nothing to screenshot and the Quick
		// Action errors out immediately rather than screenshotting the error page.
		expect(body.selector).toBe('body[data-thumbnail-ready="true"]')
	})

	// The counterpart to get_board_info's empty-board answer: a snapshot read that fails must not
	// land in the same place an empty board does, and telemetry gets its own reason code so a
	// database outage is distinguishable from a browser one on the dashboard.
	it('reports a failed snapshot read as a read failure, not a render failure, without rendering', async () => {
		vi.mocked(hasReadAccessToFile).mockResolvedValue(true)
		vi.mocked(getSharedFileInfo).mockResolvedValue({ id: 'f', shared: true, isDeleted: false })
		vi.mocked(getSharedFileRoomSnapshot).mockRejectedValueOnce(
			new Error('R2 GET failed: internal-bucket.example')
		)
		const env = makeEnv({ ROOMS: makeFakeRoomsBucket() })

		const result = await callTool(
			'user_67',
			'get_cluster_screenshot',
			{ boardId: 'f', clusterIds: ['cluster:any'] },
			env
		)
		expect(result.isError).toBe(true)
		expect(result.content[0].text).toBe(
			"Screenshot failed: the board's saved content could not be read."
		)
		// The caller must not learn anything about our infrastructure from a failure.
		expect(result.content[0].text).not.toContain('internal-bucket')
		expect(failureBlobsOf(env)).toEqual(['failure:snapshot_read_error'])
		expect(screenshotOf(env)).not.toHaveBeenCalled()
	})

	it('surfaces a render failure in bounded words when the browser call fails', async () => {
		mockPublishedBoard()
		const env = makeEnv({
			BROWSER: makeBrowserBinding(async () => new Response('nope', { status: 500 })),
		})

		const result = await callTool(
			'user_68',
			'get_cluster_screenshot',
			{ boardId: 'abc', clusterIds: ['cluster:any'] },
			env
		)
		expect(result.isError).toBe(true)
		// One bounded reason code drives both the caller's message and the telemetry blob, so the raw
		// error string reaches neither: it would blow up the blob's cardinality, and callers have no
		// business seeing it.
		expect(result.content[0].text).toBe('Screenshot failed: the render failed.')
		expect(failureBlobsOf(env)).toContain('failure:browser_failed')
		expect(failureBlobsOf(env).some((b) => b.includes('(500)'))).toBe(false)
	})

	// The cache write happens after the render, so a failure there means we are holding a PNG that
	// already cost Browser Run capacity and a slot of the caller's rate-limit budget. Returning it is
	// the only sensible outcome — the cache is an optimization, and the image is exactly what was
	// asked for. Note what this pins: the write must stay outside the render's try block, or an R2
	// outage turns every successful screenshot into a tool error.
	it('returns the screenshot even when the cache write fails', async () => {
		mockPublishedBoard()
		const bucket = makeFakeThumbnailsBucket()
		bucket.put = async () => {
			throw new Error('R2 PUT failed: internal-bucket.example')
		}
		const env = makeEnv({ MCP_DATA_BUCKET: bucket })
		const clusterId = await firstClusterId(env, 'user_69', 'abc')

		const result = await callTool(
			'user_69',
			'get_cluster_screenshot',
			{ boardId: 'abc', clusterIds: [clusterId] },
			env
		)

		expect(result.isError).toBeUndefined()
		expect(result.content).toEqual([
			{ type: 'text', text: 'Cover' },
			{ type: 'image', data: 'AQID', mimeType: 'image/png' },
		])
		// The render itself succeeded, so this is not recorded as a screenshot failure. Two rows:
		// the firstClusterId helper's get_page_info measure, then the screenshot — neither failed.
		expect(failureBlobsOf(env)).toEqual(['failure:none', 'failure:none'])
	})

	it('records the hashed account only on failures, not on successful screenshots', async () => {
		mockPublishedBoard()
		const successEnv = makeEnv()
		const clusterId = await firstClusterId(successEnv, 'user_70', 'abc')
		await callTool(
			'user_70',
			'get_cluster_screenshot',
			{ boardId: 'abc', clusterIds: [clusterId] },
			successEnv
		)
		// Both successful rows — the helper's get_page_info measure and the screenshot — omit the
		// caller: the per-client dimension must stay off the common success path for every tool.
		expect(callerBlobsOf(successEnv)).toEqual(['caller:none', 'caller:none'])

		vi.mocked(getSharedFileInfo).mockResolvedValue(null)
		vi.mocked(getPublishedFileInfo).mockResolvedValue(null)
		const failEnv = makeEnv()
		await callTool(
			'user_71',
			'get_cluster_screenshot',
			{ boardId: 'missing', clusterIds: ['cluster:any'] },
			failEnv
		)
		const callerBlobs = callerBlobsOf(failEnv)
		expect(callerBlobs).toHaveLength(1)
		// Hashed, not the raw user id: the dataset can attribute spend without carrying identities.
		expect(callerBlobs[0]).toMatch(/^caller:[0-9a-f]{64}$/)
		expect(callerBlobs[0]).not.toContain('user_71')
	})
})

// The behaviour authenticating this server was for: the gate is "can this caller see this board"
// rather than "is this board public", which is what makes a user's own private files reachable.
describe('per-user board access', () => {
	const PRIVATE_FILE = { id: 'mine', shared: false, isDeleted: false }

	function mockPrivateBoard() {
		vi.mocked(hasReadAccessToFile).mockResolvedValue(true)
		vi.mocked(getSharedFileInfo).mockResolvedValue(PRIVATE_FILE)
		vi.mocked(getSharedFileRoomSnapshot).mockResolvedValue(makeSnapshot(PAGES))
	}

	it("renders a caller's own unshared board, minting recorded render tokens", async () => {
		mockPrivateBoard()
		const env = makeEnv({ ROOMS: makeFakeRoomsBucket() })
		const clusterId = await firstClusterId(env, 'user_owner', 'mine')

		const result = await callTool(
			'user_owner',
			'get_cluster_screenshot',
			{ boardId: 'mine', clusterIds: [clusterId] },
			env
		)

		expect(result.isError).toBeUndefined()
		expect(hasReadAccessToFile).toHaveBeenCalledWith(env, 'user_owner', 'mine')
		// `render`, not `public`: `public` re-applies the anonymous share gate at snapshot-read time,
		// which an unshared board cannot pass. The tokens are recorded and short-lived to compensate —
		// and that covers the measure job as much as the screenshot job, since a measure token reads
		// the same private document through the same route.
		const measureJob = await verifyThumbnailRenderToken(env, jobTokenOfCall(env, 0))
		expect(measureJob).toMatchObject({
			kind: 'shared_file',
			slug: 'mine',
			mode: 'measure',
			access: 'render',
			surface: 'mcp',
		})
		const screenshotJob = await verifyThumbnailRenderToken(env, jobTokenOfCall(env, -1))
		expect(screenshotJob).toMatchObject({
			kind: 'shared_file',
			slug: 'mine',
			access: 'render',
			surface: 'mcp',
		})
	})

	// The reason the check runs before the cache read rather than only before the render: `mcp/` keys
	// carry no viewer dimension, so a private board cached for its owner is one object that anyone
	// naming the right board id would otherwise be handed.
	it('does not serve a cached private board to a caller who cannot see it', async () => {
		mockPrivateBoard()
		const bucket = makeFakeThumbnailsBucket()
		const env = makeEnv({ ROOMS: makeFakeRoomsBucket(), MCP_DATA_BUCKET: bucket })

		// The owner populates the cache.
		const clusterId = await firstClusterId(env, 'user_owner', 'mine')
		await callTool(
			'user_owner',
			'get_cluster_screenshot',
			{ boardId: 'mine', clusterIds: [clusterId] },
			env
		)
		expect(bucket.store.size).toBe(1)

		// Someone else asks for the same board. The cached object is right there, keyed only by board
		// and shapes.
		vi.mocked(hasReadAccessToFile).mockResolvedValue(false)
		vi.mocked(getPublishedFileInfo).mockResolvedValue(null)
		const result = await callTool(
			'user_stranger',
			'get_cluster_screenshot',
			{ boardId: 'mine', clusterIds: [clusterId] },
			env
		)

		expect(result.isError).toBe(true)
		expect(result.content[0].text).toContain('No board was found with this id')
		expect(result.content.some((part: any) => part.type === 'image')).toBe(false)
	})

	// The refusal happens at resolution, before pickShapes runs the paid measure render — a stranger
	// probing board ids must cost telemetry rows, not Browser Run sessions.
	it("spends no Browser Run on someone else's private file", async () => {
		vi.mocked(hasReadAccessToFile).mockResolvedValue(false)
		vi.mocked(getSharedFileInfo).mockResolvedValue(PRIVATE_FILE)
		vi.mocked(getPublishedFileInfo).mockResolvedValue(null)
		const env = makeEnv({ ROOMS: makeFakeRoomsBucket() })

		const result = await callTool(
			'user_stranger',
			'get_cluster_screenshot',
			{ boardId: 'mine', clusterIds: ['cluster:any'] },
			env
		)

		expect(result.isError).toBe(true)
		expect(result.content[0].text).toContain('No board was found with this id')
		expect(screenshotOf(env)).not.toHaveBeenCalled()
	})

	// The try-file-then-published fallback would otherwise answer differently for "this id belongs to
	// a board you cannot see" and "this id belongs to nothing", which turns a tool anyone can call
	// into a way to test whether a given file id exists.
	it('answers the same for an inaccessible board and a nonexistent one', async () => {
		vi.mocked(hasReadAccessToFile).mockResolvedValue(false)
		vi.mocked(getPublishedFileInfo).mockResolvedValue(null)
		const env = makeEnv({ ROOMS: makeFakeRoomsBucket() })

		vi.mocked(getSharedFileInfo).mockResolvedValue(PRIVATE_FILE)
		const inaccessible = await callTool('user_a', 'get_board_info', { boardId: 'mine' }, env)

		vi.mocked(getSharedFileInfo).mockResolvedValue(null)
		const nonexistent = await callTool(
			'user_a',
			'get_board_info',
			{ boardId: 'no-such-board' },
			env
		)

		expect(inaccessible).toEqual(nonexistent)
	})

	// Published boards keep the anonymous gate. The published slug is the whole capability, so no user
	// check narrows or widens it — and minting `public` is what keeps them out of the token records.
	it('still resolves published boards under the public gate', async () => {
		mockPublishedBoard()
		vi.mocked(hasReadAccessToFile).mockResolvedValue(false)
		const env = makeEnv()
		const clusterId = await firstClusterId(env, 'user_anyone', 'abc')

		await callTool(
			'user_anyone',
			'get_cluster_screenshot',
			{ boardId: 'abc', clusterIds: [clusterId] },
			env
		)

		const job = await verifyThumbnailRenderToken(env, jobTokenOfCall(env, -1))
		expect(job).toMatchObject({ kind: 'published', access: 'public', surface: 'mcp' })
	})
})
