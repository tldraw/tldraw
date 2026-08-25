import { THUMBNAIL_RENDER_GLOBAL } from '@tldraw/dotcom-shared'
import { THUMBNAIL_RENDER_TIMEOUT_MS } from '@tldraw/dotcom-shared'
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
	blobValuesOf,
	blobsWithPrefix,
	callerBlobsOf,
	datapointsNamed,
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
	normalizeMcpClient,
	resetRateLimitFallbackForTests,
	sharedBoardScreenshotMcp,
} from './sharedBoardScreenshotMcp'
import { resetInlineRenderPageForTests } from './thumbnailRender'

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

// The check hands back the row it read, so the resolution re-applies the gate to it rather than
// dialling Postgres for the same row again. The granted row is derived from the id asked about, so it
// stays consistent with the board under test the way the real one would.
function grantReadAccess() {
	vi.mocked(hasReadAccessToFile).mockImplementation(async (_env, _userId, fileId) => ({
		ok: true,
		file: { id: fileId, shared: true, isDeleted: false },
	}))
}

function denyReadAccess() {
	vi.mocked(hasReadAccessToFile).mockResolvedValue({ ok: false })
}

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
	denyReadAccess()
})

afterEach(() => {
	vi.useRealTimers()
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
let requestId = 0

// A limiter binding that never refuses, for tests that are about one *other* limit and must not be
// able to pass on this one firing instead. Load-bearing for the global limiter now that a measure
// counts against it: one cluster screenshot spends two browser sessions, so a per-user run of ten
// would exhaust the isolate-local global fallback before the per-user budget was reached.
const UNLIMITED_LIMITER = { limit: async () => ({ success: true }) }

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
function makeRpcRequest(
	method: string,
	params?: unknown,
	{ userAgent, userId = 'user_default' }: { userAgent?: string; userId?: string } = {}
) {
	return new Request('https://sync.tldraw.xyz/app/mcp', {
		method: 'POST',
		headers: {
			'cf-connecting-ip': `203.0.113.${++requestId}`,
			'x-test-user': userId,
			...(userAgent ? { 'user-agent': userAgent } : {}),
		},
		body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
	}) as any
}

function makeToolCall(name: string, args: object, userId = 'user_default') {
	return makeRpcRequest('tools/call', { name, arguments: args }, { userId })
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

// `userId` is who the mocked auth layer will report for this request — the key the per-user rate
// limits and the board access check both work from. Defaulted, so only tests that care about
// caller identity have to name one.
async function callTool(name: string, args: object, env = makeEnv(), userId = 'user_default') {
	return rpcResult(await sharedBoardScreenshotMcp(makeToolCall(name, args, userId), env))
}

// Kept as an alias so the pre-merge assertions that read a result off a raw response still read
// naturally alongside main's rpcResult/rpcError pair.
const resultOf = rpcResult

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
	const pageResult = await callTool('get_page_info', { boardId, page }, env, userId)
	return JSON.parse(pageResult.content[0].text).clusters[0].id as string
}

// Measures are exempt from the worker-side capture deadline (abandonAtRenderTimeout): the render
// page POSTs its result before signalling ready and the result route accepts any unexpired signed
// token, so a measure abandoned mid-flight would let that POST land after the cleanup that deletes
// the result key — stranding an object in a bucket with no lifecycle rule. The deadline exists for
// the OG pipeline's invariants, which never price a measure; a measure stays bounded by the quick
// action's own per-phase timers.
describe('measure deadline exemption', () => {
	it('does not abandon a measure at the render timeout', async () => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
		mockPublishedBoard()
		const env = makeEnv()
		const measuring = makeMeasuringBrowserBinding(() => env)
		// The quick action outlives the worker deadline — only its own per-phase timers bound it.
		;(env as any).BROWSER = {
			quickAction: vi.fn(async (action: string, body: any) => {
				await new Promise((resolve) => setTimeout(resolve, THUMBNAIL_RENDER_TIMEOUT_MS + 5000))
				return measuring.quickAction(action, body)
			}),
		}

		const call = callTool('get_page_info', { boardId: 'abc' }, env, 'user_slow_measure')
		while (vi.getTimerCount() === 0) {
			await new Promise((resolve) => setImmediate(resolve))
		}
		await vi.advanceTimersByTimeAsync(THUMBNAIL_RENDER_TIMEOUT_MS + 5001)
		const result = await call

		expect(result.isError).not.toBe(true)
		expect(JSON.parse(result.content[0].text).clusters.length).toBeGreaterThan(0)
	})
})

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
			await sharedBoardScreenshotMcp(
				makeRpcRequest('tools/list', undefined, { userId: 'user_1' }),
				makeEnv()
			)
		)
		expect(result.tools.map((tool: any) => tool.name)).toEqual([
			'get_board_info',
			'get_page_info',
			'get_cluster_info',
			'get_cluster_screenshot',
		])
	})
})

// The premise of the whole change: there is no anonymous tier on this endpoint. The 401/403 logic
// itself is tested a layer down in mcpAuth.test.ts — what is tested here is the *wiring*, which
// nothing else covered. Move the two auth lines below the `initialize` early return and every other
// test in this file still passes while initialize, server/discover and tools/list quietly go
// anonymous again.
describe('authentication', () => {
	const REFUSAL = { error: 'unauthorized' }

	function refuseAuth(reason = 'no_token') {
		vi.mocked(authenticateMcpRequest).mockResolvedValue({
			ok: false,
			reason: reason as any,
			response: Response.json(REFUSAL, {
				status: 401,
				headers: { 'WWW-Authenticate': 'Bearer resource_metadata="https://example/meta"' },
			}),
		})
	}

	// `initialize` included, which is the one that looks like it could be exempt: MCP's authorization
	// flow *expects* the unauthenticated opening call to answer 401 with a pointer to the metadata,
	// because that is how a client discovers it has to sign the user in at all.
	it.each([
		['initialize', () => makeRpcRequest('initialize')],
		['server/discover', () => makeRpcRequest('server/discover')],
		['tools/list', () => makeRpcRequest('tools/list')],
		['tools/call', () => makeToolCall('get_board_info', { boardId: 'abc' })],
	])('returns the refusal verbatim for %s', async (_method, makeRequest) => {
		refuseAuth()
		mockPublishedBoard()
		const env = makeEnv()

		const response = await sharedBoardScreenshotMcp(makeRequest(), env)

		expect(response.status).toBe(401)
		expect(await response.json()).toEqual(REFUSAL)
		// Passed through rather than rebuilt, so the pointer a client needs to start signing in survives.
		expect(response.headers.get('WWW-Authenticate')).toContain('resource_metadata=')
	})

	// Refused before anything is spent or read: no board lookup, no browser session, and nothing that
	// would tell an unauthenticated caller whether a board exists.
	it('does no board lookup and opens no browser session', async () => {
		refuseAuth()
		mockPublishedBoard()
		const env = makeEnv()

		await sharedBoardScreenshotMcp(makeToolCall('get_cluster_screenshot', { boardId: 'abc' }), env)

		expect(getPublishedFileInfo).not.toHaveBeenCalled()
		expect(getSharedFileInfo).not.toHaveBeenCalled()
		expect(hasReadAccessToFile).not.toHaveBeenCalled()
		expect(screenshotOf(env)).not.toHaveBeenCalled()
	})

	// The one number that matters most during a flag-gated rollout, and nothing recorded it: the
	// per-call event is written by the tools/call dispatcher, which a refused request never reaches.
	it('records the refusal with its reason', async () => {
		refuseAuth('not_allowlisted')
		const env = makeEnv()

		await sharedBoardScreenshotMcp(makeRpcRequest('tools/list'), env)

		expect(blobValuesOf(env, 'mcp_server_auth_refusal', 'reason')).toEqual(['not_allowlisted'])
		expect(datapointsNamed(env, TOOL_CALL_EVENT)).toEqual([])
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
			makeToolCall(
				'get_cluster_screenshot',
				{ boardId: 'abc', clusterIds: ['cluster:any'] },
				'user_40'
			),
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
			makeRpcRequest('initialize', undefined, { userId: 'user_41' }),
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
			_meta: { 'io.modelcontextprotocol/serverInfo': { version: '3.0.0' } },
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
		const env = makeEnv()
		const result = await rpcResult(
			await sharedBoardScreenshotMcp(
				makeModernRpcRequest('tools/call', {
					name: 'get_board_info',
					arguments: { boardId: 'abc' },
				}),
				env
			)
		)
		expect(result.resultType).toBe('complete')
		expect(JSON.parse(result.content[0].text).pageCount).toBe(3)
		expect(blobValuesOf(env, 'mcp_server_tool_call', 'tool')).toEqual(['get_board_info'])
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

describe('get_board_info', () => {
	it('returns the board name, page count, and stable page ids as well as indexes', async () => {
		mockPublishedBoard()
		const result = await callTool('get_board_info', { boardId: 'abc' }, undefined, 'user_1')

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
		grantReadAccess()
		vi.mocked(getSharedFileInfo).mockResolvedValue({ id: 'f1', shared: true, isDeleted: false })
		vi.mocked(getSharedFileRoomSnapshot).mockResolvedValue(makeSnapshot(PAGES))
		const env = makeEnv({ ROOMS: makeFakeRoomsBucket() })

		const result = await callTool('get_board_info', { boardId: 'f1' }, env, 'user_2')

		expect(JSON.parse(result.content[0].text).pageCount).toBe(3)
		expect(getPublishedFileInfo).not.toHaveBeenCalled()
		expect(screenshotOf(env)).not.toHaveBeenCalled()
	})

	// Every tool call already dials Postgres twice — once for the access check, once to resolve the
	// board. The snapshot read must not make it three: getSharedFileRoomSnapshot falls back to its own
	// getSharedFileInfo when no row is handed to it, so the resolved row is passed through instead.
	// Asserted on the argument rather than a call count, because these tests mock the room-snapshot
	// reader outright and its internal fallback never runs here.
	it('hands the resolved file row to the snapshot read instead of re-fetching it', async () => {
		const file = { id: 'f1', shared: true, isDeleted: false }
		grantReadAccess()
		vi.mocked(getSharedFileInfo).mockResolvedValue(file)
		vi.mocked(getSharedFileRoomSnapshot).mockResolvedValue(makeSnapshot(PAGES))

		await callTool('get_board_info', { boardId: 'f1' }, makeEnv({ ROOMS: makeFakeRoomsBucket() }))

		expect(getSharedFileRoomSnapshot).toHaveBeenCalledWith(
			expect.anything(),
			'f1',
			expect.objectContaining({ file })
		)
	})

	it('errors when no board resolves for this caller', async () => {
		vi.mocked(getSharedFileInfo).mockResolvedValue(null)
		vi.mocked(getPublishedFileInfo).mockResolvedValue(null)

		const result = await callTool('get_board_info', { boardId: 'missing' }, undefined, 'user_3')
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

		const result = await callTool('get_board_info', { boardId: 'abc' }, undefined, 'user_4')
		expect(result.isError).toBe(true)
		expect(result.content[0].text).toBe(
			"Could not read board info: the board's saved content could not be read."
		)
		expect(result.content[0].text).not.toContain('no saved content')
	})

	it('errors for a shared file with no saved content', async () => {
		grantReadAccess()
		vi.mocked(getSharedFileInfo).mockResolvedValue({ id: 'e', shared: true, isDeleted: false })

		const result = await callTool(
			'get_board_info',
			{ boardId: 'e' },
			makeEnv({ ROOMS: makeFakeRoomsBucket(null) }),
			'user_9'
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
		grantReadAccess()
		vi.mocked(getSharedFileInfo).mockResolvedValue({ id: 'f', shared: true, isDeleted: false })
		vi.mocked(getSharedFileRoomSnapshot).mockRejectedValueOnce(new Error('not shared'))

		const result = await callTool(
			'get_board_info',
			{ boardId: 'f' },
			makeEnv({ ROOMS: makeFakeRoomsBucket() }),
			'user_5'
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
		const result = await callTool(
			'get_page_info',
			{ boardId: 'abc', page: 'page:a' },
			undefined,
			'user_6'
		)
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
		const result = await callTool('get_cluster_info', { boardId: 'abc', clusterId }, env, 'user_7')
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
		const result = await callTool('get_cluster_info', { boardId: 'abc', clusterId }, env, 'user_8')
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
			const result = await callTool('get_board_info', { boardId: 'abc' }, env, 'user_50')
			expect(result.isError).toBeUndefined()
		}
	})

	it('limits a clustering tool, which does', async () => {
		mockPublishedBoard()
		const env = makeEnv()
		const outcomes: (boolean | undefined)[] = []
		for (let i = 0; i < MCP_PER_USER_RATE_LIMIT + 2; i++) {
			outcomes.push((await callTool('get_page_info', { boardId: 'abc' }, env, 'user_51')).isError)
		}
		expect(outcomes.some(Boolean)).toBe(true)
	})

	// Pins the configured per-user budget, not merely that some limit eventually fires. Each call
	// uses a distinct board so the per-board limiter can never be what trips, and the run stops one
	// call past the budget so it stays below the global cap — otherwise a passing test could not say
	// which of the three limits it had actually exercised.
	it(`allows ${MCP_PER_USER_RATE_LIMIT} screenshots per account per minute, then rate limits`, async () => {
		mockPublishedBoard()
		const env = makeEnv({ MCP_SERVER_BROWSER_RATE_LIMITER: UNLIMITED_LIMITER })
		const clusterId = await firstClusterId(env, 'user_helper', 'board-0')

		const results = []
		for (let i = 0; i <= MCP_PER_USER_RATE_LIMIT; i++) {
			results.push(
				await callTool(
					'get_cluster_screenshot',
					{ boardId: `board-${i}`, clusterIds: [clusterId] },
					env,
					'user_20'
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
		const env = makeEnv({ MCP_SERVER_BROWSER_RATE_LIMITER: UNLIMITED_LIMITER })
		const clusterId = await firstClusterId(env, 'user_helper', 'board-0')

		for (let i = 0; i <= MCP_PER_USER_RATE_LIMIT; i++) {
			await callTool(
				'get_cluster_screenshot',
				{ boardId: `board-${i}`, clusterIds: [clusterId] },
				env,
				'user_noisy'
			)
		}
		expect(failureBlobsOf(env)).toContain('failure:rate_limited_user')

		const other = await callTool(
			'get_cluster_screenshot',
			{ boardId: 'board-0', clusterIds: [clusterId] },
			env,
			'user_quiet'
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
			results.push(await callTool('get_cluster_screenshot', args, env, 'user_21'))
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
			'get_cluster_screenshot',
			{ boardId: 'abc', clusterIds: [clusterId] },
			env,
			'user_60'
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
		const pageResult = await callTool('get_page_info', { boardId: 'abc' }, env, 'user_61')
		const clusterIds = JSON.parse(pageResult.content[0].text)
			.clusters.slice(0, 2)
			.map((cluster: any) => cluster.id)
		expect(clusterIds).toHaveLength(2)

		const result = await callTool(
			'get_cluster_screenshot',
			{ boardId: 'abc', clusterIds },
			env,
			'user_61'
		)
		expect(result.isError).toBeUndefined()

		const job = await verifyThumbnailRenderToken(env, jobTokenOfCall(env, -1))
		expect(job!.shapeIds!.length).toBe(2)
	})

	it('rejects unknown cluster ids rather than rendering a subset', async () => {
		mockPublishedBoard()
		const env = makeEnv()

		const missing = await callTool(
			'get_cluster_screenshot',
			{ boardId: 'abc', clusterIds: ['cluster:nope'] },
			env,
			'user_62'
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
			'get_cluster_screenshot',
			{ boardId: 'abc', clusterIds: [clusterId] },
			env,
			'user_63'
		)
		const second = await callTool(
			'get_cluster_screenshot',
			{ boardId: 'abc', clusterIds: [clusterId] },
			env,
			'user_64'
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
			'get_page_info',
			{ boardId: 'abc', page: 0 },
			env,
			'user_pi_spend'
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
			'get_cluster_info',
			{ boardId: 'abc', clusterId },
			env,
			'user_ci_spend'
		)

		expect(result.isError).toBeUndefined()
		// One session from the firstClusterId helper's get_page_info, one from this call.
		expect(sessionsOf(env).map((s) => s.mode)).toEqual(['measure', 'measure'])
	})

	it('writes a telemetry row when get_page_info cannot resolve the board', async () => {
		denyReadAccess()
		vi.mocked(getSharedFileInfo).mockResolvedValue(null)
		vi.mocked(getPublishedFileInfo).mockResolvedValue(null)
		const env = makeEnv({ ROOMS: makeFakeRoomsBucket() })

		const result = await callTool('get_page_info', { boardId: 'nope', page: 0 }, env, 'user_pi_nf')

		expect(result.isError).toBe(true)
		expect(failureBlobsOf(env)).toEqual(['failure:not_found'])
		// The refusal came before the measure: no session existed, so none is on the ledger.
		expect(sessionsOf(env)).toEqual([])
	})

	it('errors when the page is out of range, without spending a render', async () => {
		mockPublishedBoard()
		const env = makeEnv()

		const result = await callTool(
			'get_cluster_screenshot',
			{ boardId: 'abc', page: 9, clusterIds: ['cluster:any'] },
			env,
			'user_65'
		)
		expect(result.isError).toBe(true)
		expect(result.content[0].text).toContain('out of range')
		expect(screenshotOf(env)).not.toHaveBeenCalled()
		// The documented reason vocabulary keeps selector mistakes distinct from missing boards —
		// `failure:not_found` here would send a dashboard reader hunting for deleted boards.
		expect(failureBlobsOf(env)).toContain('failure:page_not_found')
	})

	it('reports an empty board as board_empty in telemetry, not as a missing board', async () => {
		grantReadAccess()
		vi.mocked(getSharedFileInfo).mockResolvedValue({ id: 'e', shared: true, isDeleted: false })
		const env = makeEnv({ ROOMS: makeFakeRoomsBucket(null) })

		const result = await callTool(
			'get_cluster_screenshot',
			{ boardId: 'e', clusterIds: ['cluster:any'] },
			env,
			'user_empty_board'
		)

		expect(result.isError).toBe(true)
		expect(result.content[0].text).toContain('no saved content')
		expect(failureBlobsOf(env)).toContain('failure:board_empty')
	})

	it('reports a board with no pages as board_empty in telemetry', async () => {
		mockPublishedBoard(makeSnapshot([]))
		const env = makeEnv()

		const result = await callTool(
			'get_cluster_screenshot',
			{ boardId: 'abc', clusterIds: ['cluster:any'] },
			env,
			'user_no_pages'
		)

		expect(result.isError).toBe(true)
		expect(result.content[0].text).toContain('no pages')
		expect(failureBlobsOf(env)).toContain('failure:board_empty')
	})

	it('waits on either terminal selector and captures a success-only element so failed renders fail fast', async () => {
		mockPublishedBoard()
		const env = makeEnv()
		const clusterId = await firstClusterId(env, 'user_66', 'abc')

		await callTool(
			'get_cluster_screenshot',
			{ boardId: 'abc', clusterIds: [clusterId] },
			env,
			'user_66'
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
		grantReadAccess()
		vi.mocked(getSharedFileInfo).mockResolvedValue({ id: 'f', shared: true, isDeleted: false })
		vi.mocked(getSharedFileRoomSnapshot).mockRejectedValueOnce(
			new Error('R2 GET failed: internal-bucket.example')
		)
		const env = makeEnv({ ROOMS: makeFakeRoomsBucket() })

		const result = await callTool(
			'get_cluster_screenshot',
			{ boardId: 'f', clusterIds: ['cluster:any'] },
			env,
			'user_67'
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
			'get_cluster_screenshot',
			{ boardId: 'abc', clusterIds: ['cluster:any'] },
			env,
			'user_68'
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
			'get_cluster_screenshot',
			{ boardId: 'abc', clusterIds: [clusterId] },
			env,
			'user_69'
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

	// With an execution context the write rides waitUntil, so the caller's response is not held for
	// an R2 round trip after a render they already waited seconds for — and the write still lands.
	it('writes the cache through waitUntil when an execution context exists', async () => {
		mockPublishedBoard()
		const env = makeEnv()
		const clusterId = await firstClusterId(env, 'user_wu_1', 'abc')
		const extended: Promise<unknown>[] = []
		const ctx = {
			waitUntil: (promise: Promise<unknown>) => extended.push(promise),
		} as unknown as ExecutionContext

		const result = await rpcResult(
			await sharedBoardScreenshotMcp(
				makeToolCall(
					'get_cluster_screenshot',
					{ boardId: 'abc', clusterIds: [clusterId] },
					'user_wu_2'
				),
				env,
				ctx
			)
		)

		expect(result.isError).toBeUndefined()
		expect(extended.length).toBeGreaterThan(0)
		await Promise.all(extended)
		const cachedKeys = [...(env.MCP_DATA_BUCKET as any).store.keys()].filter((key) =>
			(key as string).startsWith('mcp/')
		)
		expect(cachedKeys).toHaveLength(1)
	})

	it('records the hashed account only on rate-limited rows', async () => {
		mockPublishedBoard()
		const successEnv = makeEnv()
		const clusterId = await firstClusterId(successEnv, 'user_70', 'abc')
		await callTool(
			'get_cluster_screenshot',
			{ boardId: 'abc', clusterIds: [clusterId] },
			successEnv,
			'user_70'
		)
		// Both successful rows — the helper's get_page_info measure and the screenshot — omit the
		// caller: the per-client dimension must stay off the common success path for every tool.
		expect(callerBlobsOf(successEnv)).toEqual(['caller:none', 'caller:none'])

		// An ordinary failure omits it too, which is the narrower part of the rule. A board id that
		// resolves to nothing is the commonest mistake a model makes, so recording a caller for it
		// would put a distinct blob value on very nearly every user — the cardinality this gate exists
		// to avoid, just reached one wrong id at a time instead of one request at a time.
		vi.mocked(getSharedFileInfo).mockResolvedValue(null)
		vi.mocked(getPublishedFileInfo).mockResolvedValue(null)
		const failEnv = makeEnv()
		await callTool(
			'get_cluster_screenshot',
			{ boardId: 'missing', clusterIds: ['cluster:any'] },
			failEnv,
			'user_71'
		)
		expect(callerBlobsOf(failEnv)).toEqual(['caller:none'])

		// A rate-limited row keeps it: that is the caller worth naming when spend spikes. Distinct
		// boards each time, so the per-board budget can't be what fires first.
		mockPublishedBoard()
		const limitedEnv = makeEnv()
		const limitedCluster = await firstClusterId(limitedEnv, 'user_helper', 'board-0')
		for (let i = 0; i <= MCP_PER_USER_RATE_LIMIT; i++) {
			await callTool(
				'get_cluster_screenshot',
				{ boardId: `board-${i}`, clusterIds: [limitedCluster] },
				limitedEnv,
				'user_72'
			)
		}
		expect(failureBlobsOf(limitedEnv)).toContain('failure:rate_limited_user')
		const named = callerBlobsOf(limitedEnv).filter((blob) => blob !== 'caller:none')
		expect(named).not.toHaveLength(0)
		// Hashed, not the raw user id: the dataset can attribute spend without carrying identities.
		expect(named[0]).toMatch(/^caller:[0-9a-f]{64}$/)
		expect(named[0]).not.toContain('user_72')
	})
})

// The behaviour authenticating this server was for: the gate is "can this caller see this board"
// rather than "is this board public", which is what makes a user's own private files reachable.
describe('per-user board access', () => {
	const PRIVATE_FILE = { id: 'mine', shared: false, isDeleted: false }

	function mockPrivateBoard() {
		grantReadAccess()
		vi.mocked(getSharedFileInfo).mockResolvedValue(PRIVATE_FILE)
		vi.mocked(getSharedFileRoomSnapshot).mockResolvedValue(makeSnapshot(PAGES))
	}

	it("renders a caller's own unshared board, minting recorded render tokens", async () => {
		mockPrivateBoard()
		const env = makeEnv({ ROOMS: makeFakeRoomsBucket() })
		const clusterId = await firstClusterId(env, 'user_owner', 'mine')

		const result = await callTool(
			'get_cluster_screenshot',
			{ boardId: 'mine', clusterIds: [clusterId] },
			env,
			'user_owner'
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
			'get_cluster_screenshot',
			{ boardId: 'mine', clusterIds: [clusterId] },
			env,
			'user_owner'
		)
		expect(bucket.store.size).toBe(1)

		// Someone else asks for the same board. The cached object is right there, keyed only by board
		// and shapes.
		denyReadAccess()
		vi.mocked(getPublishedFileInfo).mockResolvedValue(null)
		const result = await callTool(
			'get_cluster_screenshot',
			{ boardId: 'mine', clusterIds: [clusterId] },
			env,
			'user_stranger'
		)

		expect(result.isError).toBe(true)
		expect(result.content[0].text).toContain('No board was found with this id')
		expect(result.content.some((part: any) => part.type === 'image')).toBe(false)
	})

	// The refusal happens at resolution, before pickShapes runs the paid measure render — a stranger
	// probing board ids must cost telemetry rows, not Browser Run sessions.
	it("spends no Browser Run on someone else's private file", async () => {
		denyReadAccess()
		vi.mocked(getSharedFileInfo).mockResolvedValue(PRIVATE_FILE)
		vi.mocked(getPublishedFileInfo).mockResolvedValue(null)
		const env = makeEnv({ ROOMS: makeFakeRoomsBucket() })

		const result = await callTool(
			'get_cluster_screenshot',
			{ boardId: 'mine', clusterIds: ['cluster:any'] },
			env,
			'user_stranger'
		)

		expect(result.isError).toBe(true)
		expect(result.content[0].text).toContain('No board was found with this id')
		expect(screenshotOf(env)).not.toHaveBeenCalled()
	})

	// The try-file-then-published fallback would otherwise answer differently for "this id belongs to
	// a board you cannot see" and "this id belongs to nothing", which turns a tool anyone can call
	// into a way to test whether a given file id exists.
	it('answers the same for an inaccessible board and a nonexistent one', async () => {
		denyReadAccess()
		vi.mocked(getPublishedFileInfo).mockResolvedValue(null)
		const env = makeEnv({ ROOMS: makeFakeRoomsBucket() })

		vi.mocked(getSharedFileInfo).mockResolvedValue(PRIVATE_FILE)
		const inaccessible = await callTool('get_board_info', { boardId: 'mine' }, env, 'user_a')

		vi.mocked(getSharedFileInfo).mockResolvedValue(null)
		const nonexistent = await callTool(
			'get_board_info',
			{ boardId: 'no-such-board' },
			env,
			'user_a'
		)

		expect(inaccessible).toEqual(nonexistent)
	})

	// Published boards keep the anonymous gate. The published slug is the whole capability, so no user
	// check narrows or widens it — and minting `public` is what keeps them out of the token records.
	it('still resolves published boards under the public gate', async () => {
		mockPublishedBoard()
		denyReadAccess()
		const env = makeEnv()
		const clusterId = await firstClusterId(env, 'user_anyone', 'abc')

		await callTool(
			'get_cluster_screenshot',
			{ boardId: 'abc', clusterIds: [clusterId] },
			env,
			'user_anyone'
		)

		const job = await verifyThumbnailRenderToken(env, jobTokenOfCall(env, -1))
		expect(job).toMatchObject({ kind: 'published', access: 'public', surface: 'mcp' })
	})
})

// The render ledger (mcp_shared_board_screenshot) only fires when a screenshot is attempted, so on its
// own it cannot see the info tools, the early failures, or who is calling. These datapoints are that
// missing half: one per tools/call, plus the calling application's own name at initialize.
const TOOL_CALL_EVENT = 'mcp_server_tool_call'
// The request ledger: one row per request that reached a tool, answering cache and refusal questions.
const SCREENSHOT_EVENT = 'mcp_shared_board_screenshot'
const INITIALIZE_EVENT = 'mcp_server_initialize'

describe('protocol telemetry', () => {
	it('records one datapoint per tool call, with the tool, outcome and duration', async () => {
		mockPublishedBoard()
		const env = makeEnv()
		await callTool('get_board_info', { boardId: 'abc' }, env)

		const points = datapointsNamed(env, TOOL_CALL_EVENT)
		expect(points).toHaveLength(1)
		expect(blobValuesOf(env, TOOL_CALL_EVENT, 'tool')).toEqual(['get_board_info'])
		expect(blobValuesOf(env, TOOL_CALL_EVENT, 'outcome')).toEqual(['ok'])
		expect(blobValuesOf(env, TOOL_CALL_EVENT, 'reason')).toEqual(['none'])
		expect(points[0].doubles![0]).toBeGreaterThanOrEqual(0)
	})

	// The info tools do reach the request-level event, recording cache:none rather than a hit or a
	// miss — they consult no PNG cache, and keeping those rows out of hit/miss is what lets a
	// hit-rate-by-source panel read cache health instead of refusal volume.
	it('records the info tools on both ledgers, with no cache verdict', async () => {
		mockPublishedBoard()
		const env = makeEnv()
		await callTool('get_page_info', { boardId: 'abc' }, env)

		expect(blobValuesOf(env, TOOL_CALL_EVENT, 'tool')).toEqual(['get_page_info'])
		expect(blobsWithPrefix(env, 'cache:')).toEqual(['cache:none'])
	})

	it('records the reason a call failed, and never reports a failure as ok', async () => {
		mockPublishedBoard()
		const env = makeEnv()
		// Missing boardId, then a tool that does not exist.
		await callTool('get_board_info', {}, env)
		await callTool('get_nothing', {}, env)

		expect(blobValuesOf(env, TOOL_CALL_EVENT, 'tool')).toEqual(['get_board_info', 'unknown'])
		expect(blobValuesOf(env, TOOL_CALL_EVENT, 'outcome')).toEqual(['error', 'error'])
		expect(blobValuesOf(env, TOOL_CALL_EVENT, 'reason')).toEqual(['invalid_input', 'unknown_tool'])
	})

	// Every tool that appears on the request ledger files a rejected call there, not just the
	// screenshot one — which is all that used to, leaving the ledger silently under-counting the info
	// tools' refusals. `get_board_info` is absent by design: it spends no Browser Run and writes to
	// that ledger at all, which is why the per-call event below is the one that covers it.
	it('files bad arguments on the request ledger for every tool that is on it', async () => {
		mockPublishedBoard()
		for (const tool of ['get_page_info', 'get_cluster_info', 'get_cluster_screenshot']) {
			const env = makeEnv()
			// Missing boardId, which every one of these requires.
			const result = await callTool(tool, {}, env)

			expect(result.isError).toBe(true)
			expect(blobValuesOf(env, SCREENSHOT_EVENT, 'failure')).toEqual(['invalid_input'])
			expect(blobValuesOf(env, TOOL_CALL_EVENT, 'reason')).toEqual(['invalid_input'])
		}
	})

	it('keeps get_board_info off the screenshot ledger even when its arguments are bad', async () => {
		mockPublishedBoard()
		const env = makeEnv()

		await callTool('get_board_info', {}, env)

		expect(datapointsNamed(env, SCREENSHOT_EVENT)).toEqual([])
		expect(blobValuesOf(env, TOOL_CALL_EVENT, 'reason')).toEqual(['invalid_input'])
	})

	// The per-user limit on the clustering tools rejects callers silently: it returns a tool error
	// without reaching the render path that writes the screenshot ledger. Every call names the same
	// user, since the budget is per account and the default caller would otherwise be shared with
	// whatever else ran in this file.
	it('records a rate-limited info call', async () => {
		mockPublishedBoard()
		const env = makeEnv()
		for (let i = 0; i < MCP_PER_USER_RATE_LIMIT + 2; i++) {
			await callTool('get_page_info', { boardId: 'abc' }, env, 'user_rl_info')
		}

		expect(blobValuesOf(env, TOOL_CALL_EVENT, 'reason')).toContain('rate_limited_user')
	})

	// A limiter binding that rejects is an outage on our side, not a caller mistake. The rate limit
	// check used to sit outside the handler's try, so that rejection escaped and reached the client as
	// an unparseable 500 — the one failure on this route that did not come back as MCP. Now it is
	// caught where every other failure is. The dispatcher's own catch stays as a backstop for a handler
	// that throws despite its try, which nothing here can now reach on purpose.
	it('turns a failing rate limiter into a structured error rather than a 500', async () => {
		mockPublishedBoard()
		const env = makeEnv({
			MCP_SCREENSHOT_RATE_LIMITER: {
				limit: async () => {
					throw new Error('limiter unavailable')
				},
			},
		})

		const result = await callTool('get_page_info', { boardId: 'abc' }, env)

		expect(result.isError).toBe(true)
		expect(blobValuesOf(env, TOOL_CALL_EVENT, 'outcome')).toEqual(['error'])
	})

	// The tool name comes straight off the wire, so the lookup must not resolve inherited names. A
	// plain object would hand back Object.prototype's own methods and call them as tools: `constructor`
	// would echo the caller's arguments back as a successful result, and `__proto__` would 500.
	it('reports inherited property names as unknown tools rather than calling them', async () => {
		for (const name of ['constructor', 'toString', '__proto__', 'valueOf', 'hasOwnProperty']) {
			const env = makeEnv()
			const response = await sharedBoardScreenshotMcp(
				makeToolCall(name, { secret: 'echo-me' }),
				env
			)
			const body = (await response.json()) as any

			expect(body.error, name).toMatchObject({ code: -32602 })
			expect(body.result, name).toBeUndefined()
			expect(blobValuesOf(env, TOOL_CALL_EVENT, 'tool'), name).toEqual(['unknown'])
			expect(blobValuesOf(env, TOOL_CALL_EVENT, 'reason'), name).toEqual(['unknown_tool'])
		}
	})

	// clientInfo is whatever the client put in the body. Before the telemetry existed, initialize
	// ignored params entirely, so a loose serializer sending a non-string name still connected.
	it('handles a non-string clientInfo.name at initialize', async () => {
		for (const name of [123, true, ['a'], { x: 1 }, null]) {
			const env = makeEnv()
			const response = await sharedBoardScreenshotMcp(
				makeRpcRequest('initialize', { clientInfo: { name } }),
				env
			)

			expect(response.status, String(name)).toBe(200)
			expect((await response.json()) as any, String(name)).toMatchObject({
				result: { protocolVersion: expect.any(String) },
			})
			expect(blobValuesOf(env, INITIALIZE_EVENT, 'client'), String(name)).toEqual(['none'])
			expect(blobValuesOf(env, INITIALIZE_EVENT, 'raw'), String(name)).toEqual(['none'])
		}
	})

	it('records the client family from the user agent', async () => {
		mockPublishedBoard()
		const env = makeEnv()
		await sharedBoardScreenshotMcp(
			makeRpcRequest(
				'tools/call',
				{ name: 'get_board_info', arguments: { boardId: 'abc' } },
				{ userAgent: 'python-httpx/0.27.0' }
			),
			env
		)

		expect(blobValuesOf(env, TOOL_CALL_EVENT, 'client')).toEqual(['python'])
	})

	it('records the calling application named at initialize', async () => {
		const env = makeEnv()
		await sharedBoardScreenshotMcp(
			makeRpcRequest('initialize', { clientInfo: { name: 'Claude', version: '1.0' } }),
			env
		)

		expect(blobValuesOf(env, INITIALIZE_EVENT, 'client')).toEqual(['claude'])
		// The raw name is kept alongside the family, so a client we do not recognize yet can be found.
		expect(blobValuesOf(env, INITIALIZE_EVENT, 'raw')).toEqual(['Claude'])
		expect(blobValuesOf(env, INITIALIZE_EVENT, 'ua')).toEqual(['none'])
	})

	it('normalizes client strings into a bounded set of families', () => {
		expect(normalizeMcpClient('claude-ai/1.0')).toBe('claude')
		// A Claude user agent also says Mozilla, so the more specific match has to win.
		expect(normalizeMcpClient('Mozilla/5.0 (Macintosh) Claude/1.2')).toBe('claude')
		expect(normalizeMcpClient('python-httpx/0.27.0')).toBe('python')
		expect(normalizeMcpClient('Mozilla/5.0 (Macintosh)')).toBe('browser')
		// Unrecognized agents collapse to one value rather than becoming a new dimension each.
		expect(normalizeMcpClient('some-new-agent/1.0')).toBe('other')
		expect(normalizeMcpClient(null)).toBe('none')
	})
})

// Push is the whole point of the spike, and it fails silently in the most convincing way: if the
// payload never reaches the render page, the page just fetches one and every render still succeeds.
// So these assert on the request body the binding was handed, not on the PNG coming back.
describe('pushed snapshots', () => {
	function screenshotBody(env: Environment) {
		// The clustering tools measure before they capture, so the screenshot is the last call.
		const calls = screenshotOf(env).mock.calls
		return calls.at(-1)![1] as {
			url: string
			addScriptTag?: Array<{ content: string }>
		}
	}

	function pushedPayload(env: Environment) {
		const content = screenshotBody(env).addScriptTag?.[0]?.content
		if (!content) return null
		// Evaluated the way the browser will, which also proves the escaping produces valid JS.
		// `window` is supplied rather than global because these tests run in node.
		return new Function('window', `${content}; return window.${THUMBNAIL_RENDER_GLOBAL}`)({})
	}

	it('injects the snapshot and tells the page to expect it', async () => {
		mockPublishedBoard()
		const env = makeEnv()
		const clusterId = await firstClusterId(env, 'user_push_1', 'abc')

		await callTool(
			'get_cluster_screenshot',
			{ boardId: 'abc', clusterIds: [clusterId] },
			env,
			'user_push_2'
		)

		const body = screenshotBody(env)
		expect(body.addScriptTag).toHaveLength(1)
		// Without this the page cannot tell a push is coming and would fetch immediately, so the
		// injected payload would arrive too late to be used.
		expect(new URL(body.url).searchParams.get('push')).toBe('1')
	})

	it('pushes only the requested cluster, not the whole board', async () => {
		mockPublishedBoard()
		const env = makeEnv()
		const clusterId = await firstClusterId(env, 'user_push_3', 'abc')

		await callTool(
			'get_cluster_screenshot',
			{ boardId: 'abc', clusterIds: [clusterId] },
			env,
			'user_push_4'
		)

		const payload = pushedPayload(env)
		expect(payload).not.toBeNull()

		const pushedIds = payload.records.map((record: any) => record.id)
		// Every page but the one being drawn is gone, and with it that page's shapes.
		expect(pushedIds).not.toContain('page:b')
		expect(pushedIds.some((id: string) => id.startsWith('shape:'))).toBe(true)
		// The render params ride along, so the page needs nothing from the token to draw this.
		expect(payload.renderParams.pageId).toBe('page:a')
		expect(payload.error).toBe(false)
	})

	// The token is still minted and still on the URL even when pushing: it is what lets the page
	// recover if the injected tag never runs.
	it('keeps the token available as a fallback', async () => {
		mockPublishedBoard()
		const env = makeEnv()
		const clusterId = await firstClusterId(env, 'user_push_5', 'abc')

		await callTool(
			'get_cluster_screenshot',
			{ boardId: 'abc', clusterIds: [clusterId] },
			env,
			'user_push_6'
		)

		expect(new URL(screenshotBody(env).url).searchParams.get('token')).toBeTruthy()
	})
})

// The html-mode transport: the whole self-contained page rides inside the Browser Run request.
// Asserted at the request-body layer, like push — a broken inline path degrades silently into the
// url modes, so only the body the binding received proves which transport ran.
describe('inline html captures', () => {
	beforeEach(() => resetInlineRenderPageForTests())
	afterEach(() => vi.restoreAllMocks())

	function stubArtifactFetch(html: string) {
		const realFetch = globalThis.fetch
		vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: any, init?: any) => {
			if (String(input).endsWith('/thumbnail-render-inline.html')) {
				return new Response(html, { status: 200 })
			}
			return realFetch(input, init)
		})
	}

	it('sends the spliced page as html, with no url and both globals ahead of the module script', async () => {
		stubArtifactFetch(
			`<!doctype html><html><head><script>${THUMBNAIL_RENDER_GLOBAL}</script></head><body></body></html>`
		)
		mockPublishedBoard()
		const env = makeEnv({ THUMBNAIL_RENDER_INLINE: '1' })
		const clusterId = await firstClusterId(env, 'user_inline_1', 'abc')

		await callTool(
			'get_cluster_screenshot',
			{ boardId: 'abc', clusterIds: [clusterId] },
			env,
			'user_inline_2'
		)

		const calls = screenshotOf(env).mock.calls
		const body = calls.at(-1)![1] as { url?: string; html?: string }
		expect(body.url).toBeUndefined()
		expect(body.html).toBeTruthy()
		// The payload and the page config both sit in <head>, before any page script runs.
		const head = body.html!.slice(0, body.html!.indexOf('</head>'))
		expect(head).toContain(`window.${THUMBNAIL_RENDER_GLOBAL}=`)
		expect(head).toContain('__TLDRAW_RENDER_CONFIG__')
		expect(head).toContain('"apiOrigin"')
	})

	it('falls back to the url-mode push when the artifact cannot be fetched', async () => {
		vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: any) => {
			if (String(input).endsWith('/thumbnail-render-inline.html')) {
				return new Response('nope', { status: 404 })
			}
			throw new Error(`unexpected fetch ${input}`)
		})
		mockPublishedBoard()
		const env = makeEnv({ THUMBNAIL_RENDER_INLINE: '1' })
		const clusterId = await firstClusterId(env, 'user_inline_3', 'abc')

		await callTool(
			'get_cluster_screenshot',
			{ boardId: 'abc', clusterIds: [clusterId] },
			env,
			'user_inline_4'
		)

		const body = screenshotOf(env).mock.calls.at(-1)![1] as { url?: string; addScriptTag?: unknown }
		expect(body.url).toContain('push=1')
		expect(body.addScriptTag).toBeTruthy()
	})

	// The whole window between a worker flagged on and the client deploy that publishes the artifact
	// would otherwise pay a doomed origin fetch on every render — the negative result is cached
	// (briefly) like a success is.
	it('caches a missing artifact instead of refetching it per render', async () => {
		let artifactFetches = 0
		vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: any) => {
			if (String(input).endsWith('/thumbnail-render-inline.html')) {
				artifactFetches++
				return new Response('nope', { status: 404 })
			}
			throw new Error(`unexpected fetch ${input}`)
		})
		mockPublishedBoard()
		const env = makeEnv({ THUMBNAIL_RENDER_INLINE: '1' })
		// Distinct boards per call, or the PNG cache would answer the second call with no capture.
		const clusterId = await firstClusterId(env, 'user_negcache_1', 'abc')

		await callTool(
			'get_cluster_screenshot',
			{ boardId: 'abc', clusterIds: [clusterId] },
			env,
			'user_negcache_2'
		)
		await callTool(
			'get_cluster_screenshot',
			{ boardId: 'def', clusterIds: [clusterId] },
			env,
			'user_negcache_3'
		)

		expect(artifactFetches).toBe(1)
	})

	// The artifact bundles the SDK, so an isolate that outlives a client deploy must not keep
	// splicing snapshots into the pre-deploy page forever. Stale-while-revalidate: past the TTL the
	// cached copy is still served (the refetch must not sit on any render's path) and the fresh one
	// takes over from the next render.
	it('refreshes the cached artifact in the background once the TTL passes', async () => {
		vi.useFakeTimers({ toFake: ['Date'] })
		let artifactVersion = 'ARTIFACT_V1'
		const realFetch = globalThis.fetch
		vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: any, init?: any) => {
			if (String(input).endsWith('/thumbnail-render-inline.html')) {
				// A real origin round trip takes a beat (timers are real; only Date is faked). The
				// delay is what pins that a TTL refresh serves the stale copy instead of making any
				// render wait on the refetch.
				await new Promise((resolve) => setTimeout(resolve, 25))
				return new Response(
					`<!doctype html><html><head><script>${THUMBNAIL_RENDER_GLOBAL}</script><!--${artifactVersion}--></head><body></body></html>`,
					{ status: 200 }
				)
			}
			return realFetch(input, init)
		})
		mockPublishedBoard()
		const env = makeEnv({ THUMBNAIL_RENDER_INLINE: '1' })
		// Distinct boards per call: the PNG cache would otherwise answer the later calls and no
		// capture (and no artifact use) would happen at all.
		const clusterId = await firstClusterId(env, 'user_swr_1', 'abc')
		const lastHtml = () => (screenshotOf(env).mock.calls.at(-1)![1] as { html?: string }).html

		await callTool(
			'get_cluster_screenshot',
			{ boardId: 'abc', clusterIds: [clusterId] },
			env,
			'user_swr_2'
		)
		expect(lastHtml()).toContain('ARTIFACT_V1')

		// A client deploy publishes a new artifact, and the isolate's copy passes its TTL.
		artifactVersion = 'ARTIFACT_V2'
		vi.setSystemTime(Date.now() + 6 * 60_000)

		await callTool(
			'get_cluster_screenshot',
			{ boardId: 'def', clusterIds: [clusterId] },
			env,
			'user_swr_3'
		)
		expect(lastHtml()).toContain('ARTIFACT_V1')

		// Let the background refetch land (it takes the mock's 25ms; timers are real).
		await new Promise((resolve) => setTimeout(resolve, 50))
		await callTool(
			'get_cluster_screenshot',
			{ boardId: 'ghi', clusterIds: [clusterId] },
			env,
			'user_swr_4'
		)
		expect(lastHtml()).toContain('ARTIFACT_V2')
	})

	// The binding measures the bytes of its own serialization where the worker's guard counts UTF-16
	// units, so a body can beat the guard and still be refused — and each refusal must step down a
	// rung (inline, url-mode push, plain fetch) rather than the retry's own refusal escaping as the
	// render's failure.
	it('walks an oversize refusal down the whole ladder: inline, push, then the fetch', async () => {
		stubArtifactFetch(
			`<!doctype html><html><head><script>${THUMBNAIL_RENDER_GLOBAL}</script></head><body></body></html>`
		)
		mockPublishedBoard()
		const env = makeEnv({ THUMBNAIL_RENDER_INLINE: '1' })
		const measuring = (env as any).BROWSER
		;(env as any).BROWSER = {
			quickAction: vi.fn(async (action: string, body: any) => {
				// Refuse every payload-carrying form the way the binding does; only the plain fetch
				// body goes through.
				if (body.html || body.addScriptTag) {
					throw new Error('Serialized RPC arguments or return values are limited to 32 MiB')
				}
				return measuring.quickAction(action, body)
			}),
		}
		const clusterId = await firstClusterId(env, 'user_ladder_1', 'abc')

		const result = await callTool(
			'get_cluster_screenshot',
			{ boardId: 'abc', clusterIds: [clusterId] },
			env,
			'user_ladder_2'
		)

		expect(result.isError).not.toBe(true)
		const bodies = screenshotOf(env).mock.calls.map((call) => call[1] as any)
		const inlineAt = bodies.findIndex((body) => body.html)
		expect(inlineAt).toBeGreaterThanOrEqual(0)
		expect(bodies[inlineAt + 1]?.addScriptTag).toBeTruthy()
		// The rung that rendered: the plain fetch, with no payload and no push announcement.
		const finalBody = bodies.at(-1)!
		expect(bodies.length).toBe(inlineAt + 3)
		expect(finalBody.html).toBeUndefined()
		expect(finalBody.addScriptTag).toBeUndefined()
		expect(new URL(finalBody.url).searchParams.get('push')).toBeNull()
		expect(blobValuesOf(env, 'browser_run_session', 'transport').at(-1)).toBe('push_fallback')
	})
})

// Live capture rides inside the signed job and the pushed render params, gated on its own flag.
describe('live capture flag', () => {
	beforeEach(() => resetInlineRenderPageForTests())
	afterEach(() => vi.restoreAllMocks())

	it('stamps capture: live into the pushed render params when enabled', async () => {
		vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: any) => {
			if (String(input).endsWith('/thumbnail-render-inline.html')) {
				return new Response(
					`<!doctype html><html><head><script>${THUMBNAIL_RENDER_GLOBAL}</script></head><body></body></html>`,
					{ status: 200 }
				)
			}
			throw new Error(`unexpected fetch ${input}`)
		})
		mockPublishedBoard()
		const env = makeEnv({ THUMBNAIL_RENDER_INLINE: '1', THUMBNAIL_RENDER_LIVE_CAPTURE: '1' })
		const clusterId = await firstClusterId(env, 'user_live_1', 'abc')

		await callTool(
			'get_cluster_screenshot',
			{ boardId: 'abc', clusterIds: [clusterId] },
			env,
			'user_live_2'
		)

		const body = screenshotOf(env).mock.calls.at(-1)![1] as { html?: string }
		expect(body.html).toContain('"capture":"live"')
	})

	it('leaves capture out when the flag is off', async () => {
		mockPublishedBoard()
		const env = makeEnv()
		const clusterId = await firstClusterId(env, 'user_live_3', 'abc')

		await callTool(
			'get_cluster_screenshot',
			{ boardId: 'abc', clusterIds: [clusterId] },
			env,
			'user_live_4'
		)

		const body = screenshotOf(env).mock.calls.at(-1)![1] as {
			url?: string
			addScriptTag?: { content: string }[]
		}
		expect(body.addScriptTag?.[0]?.content ?? '').not.toContain('"capture"')
	})

	// Live capture must not survive a fall back to the fetch: the snapshot response is the whole
	// board, and rasterizing the live canvas against it would draw every neighbour inside the
	// fitted viewport. So the pushed params carry it and the signed job — what the fetch path
	// re-derives its params from — does not.
	it('keeps capture out of the signed job, so a fetch fallback exports', async () => {
		mockPublishedBoard()
		const env = makeEnv({ THUMBNAIL_RENDER_LIVE_CAPTURE: '1' })
		const clusterId = await firstClusterId(env, 'user_live_5', 'abc')

		await callTool(
			'get_cluster_screenshot',
			{ boardId: 'abc', clusterIds: [clusterId] },
			env,
			'user_live_6'
		)

		const body = screenshotOf(env).mock.calls.at(-1)![1] as {
			url: string
			addScriptTag?: { content: string }[]
		}
		expect(body.addScriptTag?.[0]?.content ?? '').toContain('"capture":"live"')
		const job = await verifyThumbnailRenderToken(env, new URL(body.url).searchParams.get('token')!)
		expect(job).not.toBeNull()
		expect((job as any)?.capture).toBeUndefined()
	})
})
