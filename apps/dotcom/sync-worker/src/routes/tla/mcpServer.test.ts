import {
	TabRenderReadRequest,
	TabRenderRequest,
	TabRenderScreenshotRequest,
	ThumbnailShapeMeasurement,
	findMcpPage,
	toShapeMeasurements,
} from '@tldraw/dotcom-shared'
import { RoomSnapshot } from '@tldraw/sync-core'
import { isPage } from '@tldraw/tlschema'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	MCP_CREATE_PER_USER_RATE_LIMIT,
	MCP_RENAME_PER_USER_RATE_LIMIT,
	MCP_SEARCH_PER_USER_RATE_LIMIT,
	MCP_TAB_PER_USER_RATE_LIMIT,
} from '../../config'
import { TabRenderOutcome } from '../../tabRenderBroker'
import { Environment } from '../../types'
import { hasReadAccessToFile } from '../../utils/tla/getAuth'
import {
	CLUSTER_INFO_MAX_IDS,
	McpBoardUser,
	parseBoardInfoInput,
	parseClusterInfoInput,
	parseClusterScreenshotInput,
	encodePageInfoCursor,
	parsePageInfoInput,
	readSnapshotPage,
} from './boardTools'
import { createBoardForUser } from './createBoard'
import { getPublishedFileInfo, getPublishedRoomSnapshot } from './getPublishedFile'
import { getSharedFileInfo, getSharedFileRoomSnapshot } from './getSharedFile'
import { listWorkspacesForUser } from './listWorkspaces'
import { authenticateMcpRequest } from './mcpAuth'
import { normalizeMcpClient, resetRateLimitFallbackForTests, mcpServer } from './mcpServer'
import { readPageCommentRows, writeCommentForUser } from './pageComments'
import { renameBoardForUser } from './renameBoard'
import {
	blobValuesOf,
	datapointsNamed,
	failureBlobsOf,
	makeFakeFileDurableObjectNamespace,
	makeFakeRoomsBucket,
	makeFakeThumbnailsBucket,
	blobsWithPrefix,
	makeScreenshotTestEnv,
	makeSnapshot,
} from './screenshotTestHelpers'
import { searchAccessibleBoards } from './searchBoards'

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
function grantReadAccess(name = 'My Board') {
	vi.mocked(hasReadAccessToFile).mockImplementation(async (_env, _userId, fileId) => ({
		ok: true,
		file: { id: fileId, name, shared: true, isDeleted: false },
	}))
}

function mockSharedBoard(snapshot = makeSnapshot(PAGES)) {
	grantReadAccess()
	vi.mocked(getSharedFileInfo).mockResolvedValue({ id: 'abc', shared: true, isDeleted: false })
	vi.mocked(getSharedFileRoomSnapshot).mockResolvedValue(snapshot)
}

function denyReadAccess() {
	vi.mocked(hasReadAccessToFile).mockResolvedValue({ ok: false })
}

// Same for authentication: every case below runs as an already-authorized caller, and the token and
// flag handling that produces that verdict is covered in mcpAuth.test.ts. The user id is read back
// off the request so a test can act as more than one caller — which the per-user rate limit needs.
vi.mock('./mcpAuth', () => ({ authenticateMcpRequest: vi.fn() }))

vi.mock('./searchBoards', () => ({ searchAccessibleBoards: vi.fn() }))

// The database half is covered in createBoard.test.ts; these tests are about the dispatch around it.
vi.mock('./createBoard', () => ({ createBoardForUser: vi.fn() }))
vi.mock('./listWorkspaces', () => ({ listWorkspacesForUser: vi.fn() }))
vi.mock('./renameBoard', () => ({ renameBoardForUser: vi.fn() }))
// Postgres and the file's Durable Object are covered in pageComments.test.ts and
// mcpCommentWrite.test.ts; these tests are about the dispatch around them.
vi.mock('./pageComments', () => ({ readPageCommentRows: vi.fn(), writeCommentForUser: vi.fn() }))

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
// render-token records.
// The clustering tools measure the page in a render before they can group anything, so the fake
// browser plays the render page's part and posts a measure result.
let requestId = 0

function makeEnv({
	tab = openTab(),
	boardUsers = [],
	...overrides
}: Partial<Record<string, unknown>> & { tab?: FakeTab; boardUsers?: McpBoardUser[] } = {}) {
	return makeScreenshotTestEnv({
		MCP_SCREENSHOT_RENDER_ORIGIN: 'https://render.example',
		THUMBNAILS: makeFakeThumbnailsBucket(),
		ROOMS: makeFakeRoomsBucket(),
		TLDR_DOC: makeFakeFileDurableObjectNamespace(tab, {
			getMcpBoardUsers: async () => ({ status: 'ok', users: boardUsers, anonymousViewers: 0 }),
		}),
		...overrides,
	})
}

type FakeTab = { closed?: boolean } & ReturnType<
	typeof vi.fn<(userId: string, request: TabRenderRequest) => Promise<TabRenderOutcome>>
>

const PNG = 'iVBORw0KGgoTAB'

// A tab with the board open, which is what every tool that needs an editor runs against now.
function openTab(shapes: Record<string, ThumbnailShapeMeasurement> = {}): FakeTab {
	return vi.fn(async (_userId: string, request: TabRenderRequest): Promise<TabRenderOutcome> => {
		switch (request.mode) {
			case 'read':
				return readInTab(request, shapes)
			case 'screenshot':
				return { status: 'captured', base64: PNG }
			case 'apply_ops':
				return {
					status: 'applied',
					pageId: 'page:a',
					pageName: 'Cover',
					result: { batchId: 'batch', applied: request.ops.length, errors: [] },
				}
			case 'user_state':
				return {
					status: 'user_state',
					pageId: 'page:a',
					pageName: 'Cover',
					selectedShapeIds: ['shape:picked'],
					viewport: { x: 0, y: 0, w: 1000, h: 800 },
				}
		}
	})
}

// What the tab would read, worked out from the board the test mocked: the same snapshot mock the
// persisted read uses stands in for the tab's store.
async function readInTab(
	request: TabRenderReadRequest,
	shapes: Record<string, ThumbnailShapeMeasurement>
): Promise<TabRenderOutcome> {
	const snapshot = (await getSharedFileRoomSnapshot({} as Environment, 'abc', {
		access: 'render',
	})) as RoomSnapshot
	const lookup = findMcpPage(snapshot.documents.map((d) => d.state).filter(isPage), request.page)
	if (!lookup.ok) {
		return { status: 'page_not_found', reason: lookup.reason, pageCount: lookup.pageCount }
	}
	const read = readSnapshotPage(
		snapshot,
		request.page,
		toShapeMeasurements(shapes),
		request.clusterIds
	)
	if (!read.ok) throw new Error('expected the page to read')
	return { status: 'page_read', read: read.read }
}

function tabAnswering(outcome: TabRenderOutcome): FakeTab {
	const tab: FakeTab = vi.fn(async () => outcome)
	tab.closed = outcome.status === 'no_tab'
	return tab
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
	return rpcResult(await mcpServer(makeToolCall(name, args, userId), env))
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

// Cluster ids are content-derived hashes and every fixture board shares one snapshot, so an id
// fetched once names the same cluster on every board. Fetched by a helper user where the test is
// about budgets, so the lookup spends nobody's budget but the helper's.
async function firstClusterId(env: Environment, userId: string, boardId: string, page?: unknown) {
	const pageResult = await callTool('get_page_info', { boardId, page }, env, userId)
	return JSON.parse(pageResult.content[0].text).clusters[0].id as string
}

describe('tool inputs', () => {
	it('reads a get_page_info cursor, and refuses one it cannot use', () => {
		const page = { kind: 'id', id: 'page:b' } as const
		const cursor = encodePageInfoCursor(40, page)
		expect(parsePageInfoInput({ boardId: 'abc', page: 'page:b', cursor }).cursor).toBe(40)
		expect(() => parsePageInfoInput({ boardId: 'abc', page: 'page:c', cursor })).toThrow(
			'cursor is from a different page'
		)
		for (const bad of ['not base64!', btoa('x:y'), btoa('12'), 12]) {
			expect(() => parsePageInfoInput({ boardId: 'abc', cursor: bad })).toThrow(
				'cursor is not valid'
			)
		}
	})

	it('parses board and page selectors', () => {
		expect(parseBoardInfoInput({ boardId: 'abc' })).toEqual({ boardId: 'abc' })
		expect(parsePageInfoInput({ boardId: 'abc' })).toEqual({
			boardId: 'abc',
			page: { kind: 'ordinal', ordinal: 0 },
			cursor: null,
		})
		expect(parsePageInfoInput({ boardId: 'abc', page: 'page:b' })).toEqual({
			boardId: 'abc',
			page: { kind: 'id', id: 'page:b' },
			cursor: null,
		})
		expect(() => parsePageInfoInput({ boardId: 'abc', page: -1 })).toThrow('page must be')
		expect(() => parsePageInfoInput({ boardId: 'abc', page: 1.5 })).toThrow('page must be')
		expect(() => parseBoardInfoInput({})).toThrow('boardId is required')
		expect(() => parseBoardInfoInput({ boardId: 'https://tldraw.com/p/abc' })).toThrow('not a URL')
	})

	it('parses cluster arguments, accepting one id or several', () => {
		expect(
			parseClusterInfoInput({ boardId: 'abc', page: 1, clusterIds: ['cluster:one', 'cluster:two'] })
		).toMatchObject({ boardId: 'abc', clusterIds: ['cluster:one', 'cluster:two'] })
		expect(parseClusterInfoInput({ boardId: 'abc', clusterIds: 'cluster:one' })).toMatchObject({
			clusterIds: ['cluster:one'],
		})
		// The argument the tool took before it took several, still sent by clients holding the old list.
		expect(parseClusterInfoInput({ boardId: 'abc', clusterId: 'cluster:one' })).toMatchObject({
			clusterIds: ['cluster:one'],
		})
		// A repeated id is answered once, in the place it was first asked for.
		expect(
			parseClusterInfoInput({ boardId: 'abc', clusterIds: ['cluster:b', 'cluster:a', 'cluster:b'] })
				.clusterIds
		).toEqual(['cluster:b', 'cluster:a'])
		expect(() => parseClusterInfoInput({ boardId: 'abc' })).toThrow('clusterIds is required')
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

	// Naming the argument the caller sent: "clusterId is required" sent models looking for an argument
	// they had never passed.
	it('refuses a cluster id list with a bad entry, naming clusterIds', () => {
		for (const clusterIds of [[42], [''], ['cluster:a', null]]) {
			expect(() => parseClusterInfoInput({ boardId: 'abc', clusterIds })).toThrow(
				'clusterIds must each be a cluster id from get_page_info'
			)
			expect(() => parseClusterScreenshotInput({ boardId: 'abc', clusterIds })).toThrow(
				'clusterIds must each be a cluster id from get_page_info'
			)
		}
	})

	it('refuses more cluster ids than could fit in one get_cluster_info call', () => {
		const ids = (count: number) => Array.from({ length: count }, (_, i) => `cluster:${i}`)
		expect(
			parseClusterInfoInput({ boardId: 'abc', clusterIds: ids(CLUSTER_INFO_MAX_IDS) }).clusterIds
		).toHaveLength(CLUSTER_INFO_MAX_IDS)
		expect(() =>
			parseClusterInfoInput({ boardId: 'abc', clusterIds: ids(CLUSTER_INFO_MAX_IDS + 1) })
		).toThrow(`at most ${CLUSTER_INFO_MAX_IDS} ids in one call. Split them across several calls.`)
	})

	// A cursor passed on with other clusterIds would point into clusters the caller never saw the start
	// of, and one that can't be read would otherwise restart silently.
	it('reads back a get_cluster_info cursor only for the clusterIds it came from', () => {
		const cursor = btoa(`1:7:${encodeURIComponent('cluster:a,cluster:b')}`)
		expect(
			parseClusterInfoInput({ boardId: 'abc', clusterIds: ['cluster:a', 'cluster:b'], cursor })
				.cursor
		).toEqual({ cluster: 1, shape: 7 })
		expect(() =>
			parseClusterInfoInput({ boardId: 'abc', clusterIds: ['cluster:a'], cursor })
		).toThrow('cursor is from a different set of clusterIds')
		for (const bad of ['not base64!', btoa('1:x:cluster:a'), btoa('1:2'), 42]) {
			expect(() =>
				parseClusterInfoInput({ boardId: 'abc', clusterIds: ['cluster:a'], cursor: bad })
			).toThrow('cursor is not valid')
		}
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
			await mcpServer(makeRpcRequest('tools/list', undefined, { userId: 'user_1' }), makeEnv())
		)
		expect(result.tools.map((tool: any) => tool.name)).toEqual([
			'search_boards',
			'list_workspaces',
			'create_board',
			'rename_board',
			'get_board_info',
			'get_page_info',
			'get_cluster_info',
			'get_cluster_screenshot',
			'apply_ops',
			'get_user_state',
			'get_board_users',
			'read_page_comments',
			'write_comment',
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

		const response = await mcpServer(makeRequest(), env)

		expect(response.status).toBe(401)
		expect(await response.json()).toEqual(REFUSAL)
		// Passed through rather than rebuilt, so the pointer a client needs to start signing in survives.
		expect(response.headers.get('WWW-Authenticate')).toContain('resource_metadata=')
	})

	// Refused before anything is read: nothing that would tell an unauthenticated caller whether a
	// board exists.
	it('does no board lookup', async () => {
		refuseAuth()
		mockPublishedBoard()
		const env = makeEnv()

		await mcpServer(makeToolCall('get_cluster_screenshot', { boardId: 'abc' }), env)

		expect(getPublishedFileInfo).not.toHaveBeenCalled()
		expect(getSharedFileInfo).not.toHaveBeenCalled()
		expect(hasReadAccessToFile).not.toHaveBeenCalled()
	})

	// The one number that matters most during a flag-gated rollout, and nothing recorded it: the
	// per-call event is written by the tools/call dispatcher, which a refused request never reaches.
	it('records the refusal with its reason', async () => {
		refuseAuth('not_allowlisted')
		const env = makeEnv()

		await mcpServer(makeRpcRequest('tools/list'), env)

		expect(blobValuesOf(env, 'mcp_server_auth_refusal', 'reason')).toEqual(['not_allowlisted'])
		expect(blobValuesOf(env, 'mcp_server_auth_refusal', 'route')).toEqual(['mcp'])
		expect(datapointsNamed(env, TOOL_CALL_EVENT)).toEqual([])
	})
})

describe('request shape', () => {
	it('answers anything but POST with 405', async () => {
		const response = await mcpServer(
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
			await mcpServer(makeModernRpcRequest('server/discover'), makeEnv())
		)
		expect(result).toMatchObject({
			resultType: 'complete',
			supportedVersions: [MODERN_VERSION, LEGACY_VERSION],
			capabilities: { tools: {} },
			cacheScope: 'public',
			_meta: {
				'io.modelcontextprotocol/serverInfo': { name: 'tldraw-boards' },
			},
		})
	})

	it('answers server/discover even when the request names a version it does not speak', async () => {
		// Refusing here would leave the client no way to find a version we have in common.
		const response = await mcpServer(
			makeModernRpcRequest('server/discover', undefined, { version: '2024-11-05' }),
			makeEnv()
		)
		expect(response.status).toBe(200)
		expect((await rpcResult(response)).supportedVersions).toEqual([MODERN_VERSION, LEGACY_VERSION])
	})

	it('rejects a version it does not speak, naming the ones it does', async () => {
		const response = await mcpServer(
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
			await mcpServer(makeRpcRequest('initialize', { protocolVersion: '2024-11-05' }), makeEnv())
		)
		expect(result.protocolVersion).toBe(LEGACY_VERSION)
	})

	it('serves a request with no version header as legacy', async () => {
		// Clients are meant to send the header and plenty don't, so it's served rather than rejected.
		const response = await mcpServer(makeRpcRequest('ping'), makeEnv())
		expect(response.status).toBe(200)
		expect(await rpcResult(response)).toEqual({})
	})

	it('envelopes modern results and leaves legacy ones alone', async () => {
		const modern = await rpcResult(await mcpServer(makeModernRpcRequest('tools/list'), makeEnv()))
		expect(modern).toMatchObject({
			resultType: 'complete',
			cacheScope: 'public',
			_meta: { 'io.modelcontextprotocol/serverInfo': { version: '3.10.0' } },
		})
		expect(modern.ttlMs).toBeGreaterThan(0)

		const legacy = await rpcResult(await mcpServer(makeRpcRequest('tools/list'), makeEnv()))
		expect(legacy.resultType).toBeUndefined()
		expect(legacy.ttlMs).toBeUndefined()
		expect(legacy._meta).toBeUndefined()
		// Same tools either way — only the envelope differs.
		expect(legacy.tools).toEqual(modern.tools)
	})

	it('drops ping for modern callers, which no longer have it', async () => {
		const response = await mcpServer(makeModernRpcRequest('ping'), makeEnv())
		expect(response.status).toBe(404)
		expect((await rpcError(response)).code).toBe(-32601)
	})

	it('runs a tool under the modern envelope', async () => {
		mockPublishedBoard()
		const env = makeEnv()
		const result = await rpcResult(
			await mcpServer(
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
		const response = await mcpServer(
			makeModernRpcRequest('tools/list', undefined, { headers: { 'mcp-method': 'tools/call' } }),
			makeEnv()
		)
		expect(response.status).toBe(400)
		expect(await rpcError(response)).toMatchObject({ code: -32020 })
	})

	it('rejects a tool call whose name header disagrees with the body', async () => {
		const response = await mcpServer(
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
		const response = await mcpServer(request, makeEnv())
		expect(response.status).toBe(400)
		expect(await rpcError(response)).toMatchObject({ code: -32020 })
	})

	it('decodes a base64-wrapped name header before comparing it', async () => {
		// Tool names are only *recommended* to be header-safe, so a conforming client may wrap one.
		mockPublishedBoard()
		const encoded = `=?base64?${btoa('get_board_info')}?=`
		const result = await rpcResult(
			await mcpServer(
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

describe('search_boards', () => {
	const ROW = {
		id: 'board-1',
		name: 'Roadmap',
		// A board the caller made: arrival and creation are the same moment.
		arrivedAt: 1_700_000_000_000,
		createdAt: 1_700_000_000_000,
		updatedAt: 1_700_000_500_000,
		workspaceName: 'My workspace',
		source: 'owned' as const,
	}

	it('returns matching boards for the calling account', async () => {
		vi.mocked(searchAccessibleBoards).mockResolvedValue([ROW])
		const result = await callTool('search_boards', { query: 'road' }, makeEnv(), 'user_abc')
		expect(searchAccessibleBoards).toHaveBeenCalledWith(expect.anything(), 'user_abc', {
			terms: ['road'],
			cursor: null,
		})
		expect(JSON.parse(result.content[0].text)).toMatchObject({
			boardCount: 1,
			boards: [
				{
					boardId: 'board-1',
					name: 'Roadmap',
					source: 'owned',
					createdAt: '2023-11-14T22:13:20.000Z',
				},
			],
		})
	})

	// The cursor a caller hands back must reach the query, or every page is page one.
	it('passes a decoded cursor through to the query', async () => {
		vi.mocked(searchAccessibleBoards).mockResolvedValue([])
		await callTool('search_boards', { cursor: btoa('1700000000000:board-9:') })
		expect(searchAccessibleBoards).toHaveBeenCalledWith(expect.anything(), expect.any(String), {
			terms: [],
			cursor: { arrivedAt: 1_700_000_000_000, id: 'board-9' },
		})
	})

	it('refuses a malformed cursor with a message that says what to do', async () => {
		const result = await callTool('search_boards', { cursor: 'not-a-cursor' })
		expect(result.isError).toBe(true)
		expect(result.content[0].text).toContain('cursor is not valid')
	})

	// initialize is read before any tool call, so instructions promising name search are acted on
	// before the tool definition can correct them — the same failure one step earlier.
	it('tells the handshake that name search is unavailable when it is', async () => {
		const off = await rpcResult(
			await mcpServer(
				makeRpcRequest('initialize'),
				makeEnv({ MCP_SEARCH_NAME_MATCHING_ENABLED: 'false' })
			)
		)
		expect(off.instructions).toContain('not available on this deployment')
		expect(off.instructions).not.toContain('find a board by name')

		const on = await rpcResult(await mcpServer(makeRpcRequest('initialize'), makeEnv()))
		expect(on.instructions).toContain('find a board by name')

		for (const instructions of [off.instructions, on.instructions]) {
			expect(instructions).toContain('read_page_comments')
			expect(instructions).toContain('write_comment')
		}
	})

	// Production runs with name matching off while the unindexed ILIKE scan is being watched. The
	// terms have to be refused rather than dropped: a model that asked for "roadmap" and got this
	// account's twenty most recent boards would read them as twenty matches.
	it('refuses a name query when name matching is disabled', async () => {
		vi.mocked(searchAccessibleBoards).mockResolvedValue([])
		const env = makeEnv({ MCP_SEARCH_NAME_MATCHING_ENABLED: 'false' })
		const result = await callTool('search_boards', { query: 'roadmap' }, env)
		expect(result.isError).toBe(true)
		expect(result.content[0].text).toContain('not available on this deployment')
		expect(searchAccessibleBoards).not.toHaveBeenCalled()
	})

	it('still lists boards when name matching is disabled', async () => {
		vi.mocked(searchAccessibleBoards).mockResolvedValue([ROW])
		const env = makeEnv({ MCP_SEARCH_NAME_MATCHING_ENABLED: 'false' })
		const result = await callTool('search_boards', {}, env)
		expect(result.isError).toBeUndefined()
		expect(JSON.parse(result.content[0].text).boardCount).toBe(1)
	})

	// A query the caller must not send has no business in the schema — offer it and a model will use
	// it, then be refused.
	it('advertises no query argument when name matching is disabled', async () => {
		const off = await rpcResult(
			await mcpServer(
				makeRpcRequest('tools/list'),
				makeEnv({ MCP_SEARCH_NAME_MATCHING_ENABLED: 'false' })
			)
		)
		const search = off.tools.find((tool: any) => tool.name === 'search_boards')
		expect(Object.keys(search.inputSchema.properties)).toEqual(['cursor'])
		expect(search.description).toContain('not available on this deployment')

		const on = await rpcResult(await mcpServer(makeRpcRequest('tools/list'), makeEnv()))
		const searchOn = on.tools.find((tool: any) => tool.name === 'search_boards')
		expect(Object.keys(searchOn.inputSchema.properties)).toEqual(['query', 'cursor'])
	})

	// Matching nothing is a normal answer. Flagged as an error, a model retries it.
	it('answers an empty search without isError', async () => {
		vi.mocked(searchAccessibleBoards).mockResolvedValue([])
		const result = await callTool('search_boards', { query: 'nothing' })
		expect(result.isError).toBeUndefined()
		expect(JSON.parse(result.content[0].text).boardCount).toBe(0)
	})

	// The wire-legal call a model makes by following the tool's own description literally: MCP's
	// `arguments` is optional, and this tool has `required: []`, so a real client can
	// send `params: {name: "search_boards"}` with no `arguments` key at all. Built with
	// makeRpcRequest, not makeToolCall/callTool, because those always supply an `arguments` key —
	// which is exactly why this case was missed before.
	it('answers a tools/call with no arguments key at all, rather than erroring', async () => {
		vi.mocked(searchAccessibleBoards).mockResolvedValue([ROW])
		const request = makeRpcRequest('tools/call', { name: 'search_boards' }, { userId: 'user_abc' })
		const result = await rpcResult(await mcpServer(request, makeEnv()))
		expect(result.isError).toBeUndefined()
		expect(searchAccessibleBoards).toHaveBeenCalledWith(expect.anything(), 'user_abc', {
			terms: [],
			cursor: null,
		})
	})

	// The failure classifier reads render failures; this tool starts none, and a pool timeout would
	// otherwise be recorded as a browser timeout.
	it('reports a database failure as a lookup error', async () => {
		vi.mocked(searchAccessibleBoards).mockRejectedValue(new Error('connection refused'))
		const result = await callTool('search_boards', {})
		expect(result.isError).toBe(true)
		expect(result.content[0].text).toBe(
			'Could not search boards: the board database could not be reached.'
		)
	})
})

describe('list_workspaces', () => {
	it('lists every workspace, personal first, with its role', async () => {
		vi.mocked(listWorkspacesForUser).mockResolvedValue([
			{ id: 'group_b', name: 'Beta', role: 'member' },
			{ id: 'user_abc', name: 'My workspace', role: 'owner' },
			{ id: 'group_a', name: 'Alpha', role: 'viewer' },
		])
		const env = makeEnv()
		const result = await callTool('list_workspaces', {}, env, 'user_abc')

		expect(listWorkspacesForUser).toHaveBeenCalledWith(env, 'user_abc')
		expect(result.isError).toBeUndefined()
		expect(JSON.parse(result.content[0].text)).toEqual({
			// A role the roles table does not know grants nothing, so its workspace is left out.
			workspaceCount: 2,
			workspaces: [
				{
					id: 'user_abc',
					name: 'My workspace',
					personal: true,
					role: 'owner',
				},
				{ id: 'group_b', name: 'Beta', personal: false, role: 'member' },
			],
		})
	})

	// Clients call a no-argument tool without an `arguments` key at all.
	it('accepts a call with no arguments key', async () => {
		vi.mocked(listWorkspacesForUser).mockResolvedValue([])
		const request = makeRpcRequest(
			'tools/call',
			{ name: 'list_workspaces' },
			{ userId: 'user_abc' }
		)
		const result = await rpcResult(await mcpServer(request, makeEnv()))
		expect(result.isError).toBeUndefined()
		expect(JSON.parse(result.content[0].text)).toEqual({ workspaceCount: 0, workspaces: [] })
	})

	it('answers a database failure as a tool error', async () => {
		vi.mocked(listWorkspacesForUser).mockRejectedValue(new Error('pool timeout'))
		const result = await callTool('list_workspaces', {})
		expect(result.isError).toBe(true)
	})
})

describe('create_board', () => {
	const PERSONAL = { id: 'user_abc', name: 'My workspace', personal: true }

	it('creates a board and links to it on the client origin', async () => {
		vi.mocked(createBoardForUser).mockResolvedValue({
			ok: true,
			boardId: 'board_new',
			workspace: PERSONAL,
		})
		const env = makeEnv()
		const result = await callTool('create_board', { name: ' Roadmap ' }, env, 'user_abc')

		expect(createBoardForUser).toHaveBeenCalledWith(
			env,
			'user_abc',
			{ name: 'Roadmap', workspace: null },
			undefined
		)
		expect(result.isError).toBeUndefined()
		expect(JSON.parse(result.content[0].text)).toEqual({
			boardId: 'board_new',
			name: 'Roadmap',
			url: 'https://render.example/f/board_new',
			nextStep: expect.stringContaining('https://render.example/f/board_new'),
			workspace: PERSONAL,
		})
	})

	it('passes a workspace refusal through with its own telemetry reason', async () => {
		vi.mocked(createBoardForUser).mockResolvedValue({
			ok: false,
			reason: 'workspace_not_found',
			result: { content: [{ type: 'text', text: 'No workspace matches' }], isError: true },
		})
		const env = makeEnv()
		const result = await callTool('create_board', { name: 'Roadmap', workspace: 'Nope' }, env)
		expect(result).toEqual({
			content: [{ type: 'text', text: 'No workspace matches' }],
			isError: true,
		})
		expect(blobValuesOf(env, 'mcp_server_tool_call', 'reason')).toEqual(['workspace_not_found'])
	})

	it('rejects a call with no name before touching the database', async () => {
		const result = await callTool('create_board', {})
		expect(result.isError).toBe(true)
		expect(result.content[0].text).toContain('name is required')
		expect(createBoardForUser).not.toHaveBeenCalled()
	})

	// Must reach the caller as MCP rather than a 500, without Postgres detail.
	it('reports a failed write as a tool error', async () => {
		vi.mocked(createBoardForUser).mockRejectedValue(new Error('connection refused'))
		const result = await callTool('create_board', { name: 'Roadmap' })
		expect(result.isError).toBe(true)
		expect(result.content[0].text).toBe('Could not create the board: the board could not be saved.')
	})

	it(`allows ${MCP_CREATE_PER_USER_RATE_LIMIT} creates per account per minute, then rate limits`, async () => {
		vi.mocked(createBoardForUser).mockResolvedValue({
			ok: true,
			boardId: 'board_new',
			workspace: PERSONAL,
		})
		const env = makeEnv()
		const results = []
		for (let i = 0; i <= MCP_CREATE_PER_USER_RATE_LIMIT; i++) {
			results.push(await callTool('create_board', { name: 'Roadmap' }, env, 'user_create'))
		}
		expect(results.slice(0, MCP_CREATE_PER_USER_RATE_LIMIT).map((r) => r.isError)).toEqual(
			Array(MCP_CREATE_PER_USER_RATE_LIMIT).fill(undefined)
		)
		const blocked = results[MCP_CREATE_PER_USER_RATE_LIMIT]
		expect(blocked.isError).toBe(true)
		expect(blocked.content[0].text).toContain('Board creation is limited')
		expect(createBoardForUser).toHaveBeenCalledTimes(MCP_CREATE_PER_USER_RATE_LIMIT)
		expect(failureBlobsOf(env)).toContain('failure:rate_limited_create')
	})
})

describe('rename_board', () => {
	it('renames the board and links to it on the client origin', async () => {
		vi.mocked(renameBoardForUser).mockResolvedValue({ ok: true, previousName: 'Old' })
		const env = makeEnv()
		const result = await callTool(
			'rename_board',
			{ boardId: 'board_abc', name: ' Roadmap ' },
			env,
			'user_abc'
		)

		expect(renameBoardForUser).toHaveBeenCalledWith(
			env,
			'user_abc',
			{ boardId: 'board_abc', name: 'Roadmap' },
			undefined
		)
		expect(result.isError).toBeUndefined()
		expect(JSON.parse(result.content[0].text)).toEqual({
			boardId: 'board_abc',
			name: 'Roadmap',
			previousName: 'Old',
			url: 'https://render.example/f/board_abc',
		})
	})

	it('passes a refusal through with its own telemetry reason', async () => {
		vi.mocked(renameBoardForUser).mockResolvedValue({
			ok: false,
			reason: 'rename_forbidden',
			result: { content: [{ type: 'text', text: 'Not yours to rename' }], isError: true },
		})
		const env = makeEnv()
		const result = await callTool('rename_board', { boardId: 'board_abc', name: 'Roadmap' }, env)
		expect(result).toEqual({
			content: [{ type: 'text', text: 'Not yours to rename' }],
			isError: true,
		})
		expect(blobValuesOf(env, 'mcp_server_tool_call', 'reason')).toEqual(['rename_forbidden'])
	})

	it('rejects a call with no name or board id before touching the database', async () => {
		const noName = await callTool('rename_board', { boardId: 'board_abc' })
		expect(noName.isError).toBe(true)
		expect(noName.content[0].text).toContain('name is required')
		const noBoard = await callTool('rename_board', { name: 'Roadmap' })
		expect(noBoard.isError).toBe(true)
		expect(noBoard.content[0].text).toContain('boardId is required')
		expect(renameBoardForUser).not.toHaveBeenCalled()
	})

	it('reports a failed write as a tool error', async () => {
		vi.mocked(renameBoardForUser).mockRejectedValue(new Error('connection refused'))
		const result = await callTool('rename_board', { boardId: 'board_abc', name: 'Roadmap' })
		expect(result.isError).toBe(true)
		expect(result.content[0].text).toBe(
			'Could not rename the board: the new name could not be saved.'
		)
	})

	it(`allows ${MCP_RENAME_PER_USER_RATE_LIMIT} renames per account per minute, then rate limits`, async () => {
		vi.mocked(renameBoardForUser).mockResolvedValue({ ok: true, previousName: 'Old' })
		const env = makeEnv()
		const results = []
		for (let i = 0; i <= MCP_RENAME_PER_USER_RATE_LIMIT; i++) {
			results.push(
				await callTool('rename_board', { boardId: 'board_abc', name: 'Roadmap' }, env, 'user_rn')
			)
		}
		expect(results.slice(0, MCP_RENAME_PER_USER_RATE_LIMIT).map((r) => r.isError)).toEqual(
			Array(MCP_RENAME_PER_USER_RATE_LIMIT).fill(undefined)
		)
		const blocked = results[MCP_RENAME_PER_USER_RATE_LIMIT]
		expect(blocked.isError).toBe(true)
		expect(blocked.content[0].text).toContain('Renaming boards is limited')
		expect(renameBoardForUser).toHaveBeenCalledTimes(MCP_RENAME_PER_USER_RATE_LIMIT)
		expect(failureBlobsOf(env)).toContain('failure:rate_limited_rename')
	})
})

describe('read_page_comments', () => {
	function grantSharedFile() {
		grantReadAccess()
		vi.mocked(getSharedFileInfo).mockResolvedValue({ id: 'f1', shared: true, isDeleted: false })
		vi.mocked(getSharedFileRoomSnapshot).mockResolvedValue(makeSnapshot(PAGES))
	}

	it('reads the threads on the requested page of the file, marking the caller’s comments', async () => {
		grantSharedFile()
		vi.mocked(readPageCommentRows).mockResolvedValue({
			threads: [
				{
					id: 'comment-thread:t',
					anchor: { type: 'shape', shapeId: 'shape:page:b-0', x: 1, y: 0, isPrecise: false },
					resolvedAt: null,
					createdAt: 1,
				},
			],
			comments: [
				{
					id: 'comment:c',
					threadId: 'comment-thread:t',
					authorId: 'user_me',
					authorName: 'Me',
					body: {
						type: 'doc',
						content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hi' }] }],
					},
					createdAt: Date.UTC(2026, 0, 1),
					meta: {},
				},
			],
		})
		const env = makeEnv({ ROOMS: makeFakeRoomsBucket() })

		const result = await callTool('read_page_comments', { boardId: 'f1', page: 1 }, env, 'user_me')

		expect(readPageCommentRows).toHaveBeenCalledWith(env, 'f1', 'page:b')
		expect(JSON.parse(result.content[0].text)).toEqual({
			pageId: 'page:b',
			pageName: 'Ideas',
			threadCount: 1,
			threads: [
				{
					threadId: 'comment-thread:t',
					resolved: false,
					anchor: { type: 'shape', shapeId: 'shape:page:b-0', shapeType: 'geo' },
					comments: [
						{
							commentId: 'comment:c',
							authorName: 'Me',
							isCurrentUser: true,
							meta: {},
							createdAt: '2026-01-01T00:00:00.000Z',
							text: 'Hi',
						},
					],
				},
			],
		})
	})

	it('refuses a published board, which has no comments', async () => {
		mockPublishedBoard()
		const env = makeEnv()
		const result = await callTool('read_page_comments', { boardId: 'pub' }, env)
		expect(result.isError).toBe(true)
		expect(result.content[0].text).toContain('published')
		expect(readPageCommentRows).not.toHaveBeenCalled()
		expect(blobValuesOf(env, 'mcp_server_tool_call', 'reason')).toEqual(['comments_unavailable'])
	})

	it('reports a failed read as a tool error', async () => {
		grantSharedFile()
		vi.mocked(readPageCommentRows).mockRejectedValue(new Error('connection refused'))
		const result = await callTool(
			'read_page_comments',
			{ boardId: 'f1' },
			makeEnv({ ROOMS: makeFakeRoomsBucket() })
		)
		expect(result.isError).toBe(true)
		expect(result.content[0].text).toBe(
			'Could not read comments: the board database could not be reached.'
		)
	})
})

describe('write_comment', () => {
	const WRITTEN = {
		ok: true as const,
		threadId: 'comment-thread:t',
		commentId: 'comment:c',
		pageId: 'page:a',
		newThread: true,
	}

	it('posts as the caller and links to the thread on the client origin', async () => {
		vi.mocked(writeCommentForUser).mockResolvedValue(WRITTEN)
		const env = makeEnv()
		const result = await callTool(
			'write_comment',
			{ boardId: 'board_abc', text: ' Too narrow? ', shapeId: 'box' },
			env,
			'user_abc'
		)

		expect(writeCommentForUser).toHaveBeenCalledWith(env, 'user_abc', {
			boardId: 'board_abc',
			text: 'Too narrow?',
			// Not named in the call, and the request's User-Agent is no client we know.
			agentName: 'Agent',
			target: { kind: 'shape', shapeId: 'shape:box' },
		})
		expect(result.isError).toBeUndefined()
		expect(JSON.parse(result.content[0].text)).toEqual({
			boardId: 'board_abc',
			threadId: 'comment-thread:t',
			commentId: 'comment:c',
			pageId: 'page:a',
			newThread: true,
			url: 'https://render.example/f/board_abc?comment=comment-thread%3At',
		})
	})

	it('passes a permission refusal through with its own telemetry reason', async () => {
		vi.mocked(writeCommentForUser).mockResolvedValue({
			ok: false,
			reason: 'comment_forbidden',
			result: { content: [{ type: 'text', text: 'View-only' }], isError: true },
		})
		const env = makeEnv()
		const result = await callTool(
			'write_comment',
			{ boardId: 'board_abc', text: 'Hi', threadId: 't' },
			env
		)
		expect(result).toEqual({ content: [{ type: 'text', text: 'View-only' }], isError: true })
		expect(blobValuesOf(env, 'mcp_server_tool_call', 'reason')).toEqual(['comment_forbidden'])
	})

	it('rejects a call with no text or no target before touching the board', async () => {
		const noText = await callTool('write_comment', { boardId: 'board_abc', threadId: 't' })
		expect(noText.isError).toBe(true)
		expect(noText.content[0].text).toContain('text is required')
		const noTarget = await callTool('write_comment', { boardId: 'board_abc', text: 'Hi' })
		expect(noTarget.isError).toBe(true)
		expect(noTarget.content[0].text).toContain('Say where the comment goes')
		expect(writeCommentForUser).not.toHaveBeenCalled()
	})

	it('reports a failed write as a tool error', async () => {
		vi.mocked(writeCommentForUser).mockRejectedValue(new Error('object reset'))
		const result = await callTool('write_comment', { boardId: 'board_abc', text: 'Hi', x: 1, y: 2 })
		expect(result.isError).toBe(true)
		expect(result.content[0].text).toBe(
			'Could not post the comment: the comment could not be saved.'
		)
	})

	it(`shares the board tools' limit of ${MCP_TAB_PER_USER_RATE_LIMIT} calls per account per minute`, async () => {
		vi.mocked(writeCommentForUser).mockResolvedValue(WRITTEN)
		const env = makeEnv()
		const results = []
		for (let i = 0; i <= MCP_TAB_PER_USER_RATE_LIMIT; i++) {
			results.push(
				await callTool('write_comment', { boardId: 'b', text: 'Hi', threadId: 't' }, env, 'user_cm')
			)
		}
		expect(results.slice(0, MCP_TAB_PER_USER_RATE_LIMIT).map((r) => r.isError)).toEqual(
			Array(MCP_TAB_PER_USER_RATE_LIMIT).fill(undefined)
		)
		const blocked = results[MCP_TAB_PER_USER_RATE_LIMIT]
		expect(blocked.isError).toBe(true)
		expect(writeCommentForUser).toHaveBeenCalledTimes(MCP_TAB_PER_USER_RATE_LIMIT)
		expect(failureBlobsOf(env)).toContain('failure:rate_limited_tab')
		const other = await callTool(
			'write_comment',
			{ boardId: 'b', text: 'Hi', threadId: 't' },
			env,
			'user_x'
		)
		expect(other.isError).toBeUndefined()
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

	it('resolves a shared file id without trying it as a published board', async () => {
		grantReadAccess()
		vi.mocked(getSharedFileInfo).mockResolvedValue({ id: 'f1', shared: true, isDeleted: false })
		vi.mocked(getSharedFileRoomSnapshot).mockResolvedValue(makeSnapshot(PAGES))
		const env = makeEnv({ ROOMS: makeFakeRoomsBucket() })

		const result = await callTool('get_board_info', { boardId: 'f1' }, env, 'user_2')

		expect(JSON.parse(result.content[0].text).pageCount).toBe(3)
		expect(getPublishedFileInfo).not.toHaveBeenCalled()
	})

	// Every tool call already dials Postgres twice — once for the access check, once to resolve the
	// board. The snapshot read must not make it three: getSharedFileRoomSnapshot falls back to its own
	// getSharedFileInfo when no row is handed to it, so the resolved row is passed through instead.
	// Asserted on the argument rather than a call count, because these tests mock the room-snapshot
	// reader outright and its internal fallback never runs here.
	it('hands the resolved file row to the snapshot read instead of re-fetching it', async () => {
		const file = { id: 'f1', name: 'My Board', shared: true, isDeleted: false }
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

	// The snapshot's `document` name is a mirror the room writes only when the file row is updated, so
	// reading it reported a board as unnamed until its row was first renamed, shared, published or
	// moved.
	describe('board name', () => {
		async function boardInfoName(fileName: string, documentName: string) {
			grantReadAccess(fileName)
			vi.mocked(getSharedFileInfo).mockResolvedValue({ id: 'f1', shared: true, isDeleted: false })
			vi.mocked(getSharedFileRoomSnapshot).mockResolvedValue(makeSnapshot(PAGES, documentName))
			const env = makeEnv({ ROOMS: makeFakeRoomsBucket() })
			const result = await callTool('get_board_info', { boardId: 'f1' }, env)
			return JSON.parse(result.content[0].text).name
		}

		it('reports the name a board was created with, before any rename', async () => {
			expect(await boardInfoName('Q4 planning scratch', '')).toBe('Q4 planning scratch')
		})

		// tldraw.com stores this on the row for a board nobody named, so it is the board's real name.
		it('reports the default name tldraw.com stored for an unnamed board', async () => {
			expect(await boardInfoName('Wed 5:38 PM', '')).toBe('Wed 5:38 PM')
		})

		// The mirror catches up only once the room persists; the row is right as soon as it commits.
		it('reports a rename from the file row, not the mirror', async () => {
			expect(await boardInfoName('Renamed', 'Old name')).toBe('Renamed')
		})

		// The same value search_boards reports for the same row, so the two tools cannot disagree.
		it('reports a blank name the way search_boards does', async () => {
			expect(await boardInfoName('  ', 'Stale mirror')).toBe('')
		})

		// Served as the published copy: viewers and the link preview see the name it was published
		// under.
		it('reads a published board’s name from its published snapshot', async () => {
			mockPublishedBoard(makeSnapshot(PAGES, 'Published title'))
			const result = await callTool('get_board_info', { boardId: 'abc' })
			expect(JSON.parse(result.content[0].text).name).toBe('Published title')
		})
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

	// The two failure tests above both go through BoardSnapshotReadError, which `recordAs` passes
	// through unchanged — so nothing else here pins the other half of the narrowing. This tool starts
	// no render, and the classifier defaults anything it does not recognise to a render failure.
	it('reports a raw board lookup failure as a database error, not a render one', async () => {
		vi.mocked(hasReadAccessToFile).mockRejectedValueOnce(
			new Error('connect ECONNREFUSED 10.0.0.5:5432')
		)

		const result = await callTool('get_board_info', { boardId: 'abc' }, undefined, 'user_5')
		expect(result.isError).toBe(true)
		expect(result.content[0].text).toBe(
			'Could not read board info: the board database could not be reached.'
		)
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
		mockSharedBoard()
		const result = await callTool(
			'get_page_info',
			{ boardId: 'abc', page: 'page:a' },
			undefined,
			'user_6'
		)
		const info = JSON.parse(result.content[0].text)

		expect(info.name).toBe('Cover')
		expect(info.clusters).toHaveLength(2)
		// The fixture's shapes carry no text, so there are no keywords, and each is labelled by what it
		// holds. Its geo records name no geo, so they read as plain geo shapes. Nothing is measured, so
		// neither has a position.
		expect(info.clusters).toEqual([
			{
				id: expect.stringMatching(/^cluster:/),
				numberOfShapes: 1,
				label: '1 geo shape',
				keywords: [],
				bounds: null,
			},
			{
				id: expect.stringMatching(/^cluster:/),
				numberOfShapes: 1,
				label: '1 geo shape',
				keywords: [],
				bounds: null,
			},
		])
	})

	it('returns the shapes in a cluster', async () => {
		mockSharedBoard()
		const env = makeEnv()
		const clusterId = await firstClusterId(env, 'user_7', 'abc')
		const result = await callTool('get_cluster_info', { boardId: 'abc', clusterId }, env, 'user_7')
		const info = JSON.parse(result.content[0].text)

		expect(info).toMatchObject({
			pageName: 'Cover',
			clusters: [{ clusterId, numberOfShapes: 1, shapes: [{ id: 'shape:page:a-0' }] }],
		})
	})

	// One agent took 44 calls to read a flowchart, one per cluster, under a limit of about ten a
	// minute. Several ids are one call, and still one measure.
	it('returns several clusters in the order asked, from one measure', async () => {
		mockSharedBoard()
		// Listed in a different env, so this one has nothing cached and has to measure.
		const listed = await callTool('get_page_info', { boardId: 'abc' }, makeEnv(), 'user_7b')
		const [first, second] = JSON.parse(listed.content[0].text).clusters.map((c: any) => c.id)
		const env = makeEnv()

		const result = await callTool(
			'get_cluster_info',
			{ boardId: 'abc', clusterIds: [second, first] },
			env,
			'user_7b'
		)

		expect(JSON.parse(result.content[0].text)).toMatchObject({
			pageName: 'Cover',
			clusters: [
				{ clusterId: second, shapes: [{ id: 'shape:page:a-1' }] },
				{ clusterId: first, shapes: [{ id: 'shape:page:a-0' }] },
			],
		})
	})

	it('refuses the whole call when any cluster id is unknown, naming the missing ones', async () => {
		mockSharedBoard()
		const env = makeEnv()
		const clusterId = await firstClusterId(env, 'user_7c', 'abc')

		const result = await callTool(
			'get_cluster_info',
			{ boardId: 'abc', clusterIds: [clusterId, 'cluster:nope'] },
			env,
			'user_7c'
		)

		expect(result).toMatchObject({
			isError: true,
			content: [
				{
					text: 'No cluster on page 0 with id "cluster:nope". Call get_page_info to list this page\'s clusters.',
				},
			],
		})
		expect(failureBlobsOf(env)).toEqual(['failure:none', 'failure:cluster_not_found'])
	})

	// A shape's rich text is a deeply nested ProseMirror document, and a geo shape's label is not on
	// the record under any key at all — so the editor's getText answer replaces it on the way out.
	it('replaces rich text with the plain text the editor reported', async () => {
		mockSharedBoard()
		const env = makeEnv({
			tab: openTab({
				'shape:page:a-0': { x: 0, y: 0, w: 10, h: 10, text: 'Checkout total' },
				'shape:page:a-1': { x: 5000, y: 0, w: 10, h: 10 },
			}),
		})

		const clusterId = await firstClusterId(env, 'user_8', 'abc')
		const result = await callTool('get_cluster_info', { boardId: 'abc', clusterId }, env, 'user_8')
		const shape = JSON.parse(result.content[0].text).clusters[0].shapes[0]

		expect(shape.props.text).toBe('Checkout total')
		expect(shape.props.richText).toBeUndefined()
		expect(shape.id).toBe('shape:page:a-0')
		expect(shape.typeName).toBeUndefined()
		expect(shape.plainText).toBeUndefined()
	})
})

describe('the open tab', () => {
	const CLUSTER_ID = 'cluster:any'

	async function screenshot(env: Environment, boardId = 'abc') {
		const pageInfo = await callTool('get_page_info', { boardId }, env, 'user_tab')
		const clusters = JSON.parse(pageInfo.content[0].text).clusters
		return callTool(
			'get_cluster_screenshot',
			{ boardId, clusterIds: [clusters[0].id] },
			env,
			'user_tab'
		)
	}

	beforeEach(() => {
		mockSharedBoard()
	})

	it('reads a page in the tab of the user who asked', async () => {
		const tab = openTab({ 'shape:page:a-0': { x: 0, y: 0, w: 10, h: 10, text: 'From the tab' } })

		const result = await callTool('get_page_info', { boardId: 'abc' }, makeEnv({ tab }), 'user_tab')

		expect(tab).toHaveBeenCalledWith('user_tab', {
			mode: 'read',
			page: { kind: 'ordinal', ordinal: 0 },
			clusterIds: [],
		})
		expect(JSON.parse(result.content[0].text).clusters.map((c: any) => c.label)).toContain(
			'From the tab'
		)
	})

	it('captures a cluster, framing only its shapes, and answers with the image', async () => {
		const tab = openTab()

		const result = await screenshot(makeEnv({ tab }))

		// This tab measured no boxes, so there is no aspect ratio to match: the size falls back to the
		// thumbnail's ratio at the full 2560px.
		expect(tab).toHaveBeenLastCalledWith('user_tab', {
			mode: 'screenshot',
			pageId: 'page:a',
			shapeIds: ['shape:page:a-0'],
			theme: 'light',
			width: 2560,
			height: 1344,
		})
		expect(result.content).toEqual([
			{ type: 'text', text: 'Cover' },
			{ type: 'image', data: PNG, mimeType: 'image/png' },
		])
	})

	it('captures several clusters into one image, asking for the union of their shapes', async () => {
		const tab = openTab()
		const env = makeEnv({ tab })
		const pageInfo = await callTool('get_page_info', { boardId: 'abc' }, env, 'user_tab')
		const clusterIds = JSON.parse(pageInfo.content[0].text)
			.clusters.slice(0, 2)
			.map((cluster: any) => cluster.id)

		await callTool('get_cluster_screenshot', { boardId: 'abc', clusterIds }, env, 'user_tab')

		const request = tab.mock.lastCall![1] as TabRenderScreenshotRequest
		expect(request.shapeIds).toHaveLength(2)
	})

	describe('sizing to the clusters', () => {
		// One wide cluster and one far-off square, so neither merges into the other.
		const measuredTab = () =>
			openTab({
				'shape:page:a-0': { x: 0, y: 0, w: 400, h: 100 },
				'shape:page:a-1': { x: 10_000, y: 10_000, w: 80, h: 80 },
			})

		async function clusterIdWithWidth(env: Environment, w: number) {
			const pageInfo = await callTool('get_page_info', { boardId: 'abc' }, env, 'user_tab')
			return JSON.parse(pageInfo.content[0].text).clusters.find(
				(cluster: any) => cluster.bounds?.w === w
			).id as string
		}

		it('asks for a smaller size when the agent does', async () => {
			const tab = measuredTab()
			const env = makeEnv({ tab })
			const clusterId = await clusterIdWithWidth(env, 400)

			await callTool(
				'get_cluster_screenshot',
				{ boardId: 'abc', clusterIds: [clusterId], size: 800 },
				env,
				'user_tab'
			)

			expect(tab.mock.lastCall![1]).toMatchObject({ width: 800, height: 200 })
		})

		it('frames several clusters on the box around all of them', async () => {
			const tab = measuredTab()
			const env = makeEnv({ tab })
			const pageInfo = await callTool('get_page_info', { boardId: 'abc' }, env, 'user_tab')
			const clusterIds = JSON.parse(pageInfo.content[0].text).clusters.map((c: any) => c.id)
			expect(clusterIds).toHaveLength(2)

			await callTool('get_cluster_screenshot', { boardId: 'abc', clusterIds }, env, 'user_tab')

			// The union runs from (0, 0) to (10080, 10080): a square.
			expect(tab.mock.lastCall![1]).toMatchObject({ width: 2560, height: 2560 })
		})
	})

	it('tells the agent to have the user open the board when no tab has it', async () => {
		const env = makeEnv({ tab: tabAnswering({ status: 'no_tab' }) })

		for (const result of [
			await callTool('get_page_info', { boardId: 'abc' }, env, 'user_tab'),
			await callTool(
				'get_cluster_info',
				{ boardId: 'abc', clusterIds: [CLUSTER_ID] },
				env,
				'user_tab'
			),
			await callTool(
				'get_cluster_screenshot',
				{ boardId: 'abc', clusterIds: [CLUSTER_ID] },
				env,
				'user_tab'
			),
		]) {
			expect(result.isError).toBe(true)
			expect(result.content[0].text).toContain('not open in a browser tab')
			expect(result.content[0].text).toContain('/f/abc')
		}
		expect(failureBlobsOf(env)).toContain('failure:tab_not_open')
	})

	it('still answers get_board_info with no tab, since it needs no editor', async () => {
		const tab = tabAnswering({ status: 'no_tab' })

		const result = await callTool(
			'get_board_info',
			{ boardId: 'abc' },
			makeEnv({ tab }),
			'user_tab'
		)

		expect(result.isError).toBeUndefined()
		expect(tab).not.toHaveBeenCalled()
	})

	it.each<[TabRenderOutcome, string]>([
		[{ status: 'ack_timeout' }, 'tab_ack_timeout'],
		[{ status: 'room_timeout' }, 'tab_room_timeout'],
		[{ status: 'work_timeout' }, 'tab_work_timeout'],
		[{ status: 'declined', reason: 'busy' }, 'tab_busy'],
		[{ status: 'declined', reason: 'page_not_current' }, 'tab_page_not_current'],
		// A reply of the wrong kind for the job.
		[{ status: 'page_not_found', reason: 'no_pages', pageCount: 0 }, 'tab_failed'],
	])('answers %j with a tool error, recorded as %s', async (outcome, reason) => {
		const open = openTab()
		const tab = vi.fn(async (userId: string, request: TabRenderRequest) =>
			request.mode === 'read' ? open(userId, request) : outcome
		) as FakeTab
		const env = makeEnv({ tab })

		const result = await screenshot(env)

		expect(result.isError).toBe(true)
		expect(failureBlobsOf(env)).toContain(`failure:${reason}`)
	})

	// A published board is a frozen copy; the room behind it holds a different, live document. Choosing
	// the refusal is a row lookup, so the published snapshot isn't read for it.
	it('does not ask a tab about a published board, and says why', async () => {
		denyReadAccess()
		mockPublishedBoard()
		const tab = openTab()

		const result = await callTool('get_page_info', { boardId: 'abc' }, makeEnv({ tab }), 'user_tab')

		expect(tab).not.toHaveBeenCalled()
		expect(getPublishedRoomSnapshot).not.toHaveBeenCalled()
		expect(result.isError).toBe(true)
		expect(result.content[0].text).toContain('published board')
	})

	it('answers with a tool error when the room cannot be reached', async () => {
		const env = makeEnv()
		const objects = env.TLDR_DOC as any
		const get = objects.get
		objects.get = (id: unknown) => ({
			...get(id),
			requestTabRender: async () => {
				throw new Error('room unavailable')
			},
		})

		const result = await callTool('get_page_info', { boardId: 'abc' }, env, 'user_tab')

		expect(result.isError).toBe(true)
		expect(failureBlobsOf(env)).toEqual(['failure:tab_error'])
	})

	it('records how each attempt went, with no board or user identity', async () => {
		const env = makeEnv({ tab: tabAnswering({ status: 'declined', reason: 'page_missing' }) })

		await callTool('get_page_info', { boardId: 'abc' }, env, 'user_tab')

		expect(datapointsNamed(env, 'mcp_tab_render').map((d: any) => d.blobs.slice(2))).toEqual([
			['mode:read', 'outcome:declined', 'reason:page_missing'],
		])
	})
})

describe('apply_ops', () => {
	const OPS = [{ op: 'add', kind: 'box', text: 'Hello', at: { x: 0, y: 0 } }]

	beforeEach(() => {
		grantReadAccess()
	})

	it('applies a batch in the tab as the verified user and reports what landed', async () => {
		const tab = openTab()

		const result = await callTool(
			'apply_ops',
			{ boardId: 'abc', ops: OPS, runId: 'run-1' },
			makeEnv({ tab }),
			'user_tab'
		)

		expect(tab).toHaveBeenCalledWith('user_tab', {
			mode: 'apply_ops',
			ops: OPS,
			attribution: { userId: 'user_tab', runId: 'run-1' },
		})
		expect(JSON.parse(result.content[0].text)).toEqual({
			pageId: 'page:a',
			pageName: 'Cover',
			batchId: 'batch',
			applied: 1,
			errors: [],
		})
	})

	// The tab keeps {created} refs to the batch itself when no run is named.
	it('names no run when the agent gives none, and passes the page along for the tab to check', async () => {
		const tab = openTab()
		const env = makeEnv({ tab })

		await callTool('apply_ops', { boardId: 'abc', ops: OPS, page: 1 }, env, 'user_tab')
		await callTool('apply_ops', { boardId: 'abc', ops: OPS, page: null }, env, 'user_tab')

		expect(tab.mock.calls.map(([, request]) => request)).toEqual([
			{
				mode: 'apply_ops',
				ops: OPS,
				page: { kind: 'ordinal', ordinal: 1 },
				attribution: { userId: 'user_tab' },
			},
			// A model that fills in every field sends null, which means the page the user is on.
			{ mode: 'apply_ops', ops: OPS, attribution: { userId: 'user_tab' } },
		])
	})

	// create_board followed by apply_ops is the obvious flow, and a new board has no snapshot to read.
	it('works on a board with nothing persisted yet', async () => {
		vi.mocked(getSharedFileRoomSnapshot).mockRejectedValue(new Error('should not be read'))

		const result = await callTool('apply_ops', { boardId: 'abc', ops: OPS }, makeEnv(), 'user_tab')

		expect(result.isError).toBeUndefined()
	})

	// A retry on a write that did land would apply it twice, so the agent has to hear the difference
	// between "nothing happened" and "we don't know".
	it.each<[TabRenderOutcome, string, boolean]>([
		[{ status: 'no_tab' }, 'tab_not_open', false],
		[{ status: 'reload_needed' }, 'tab_reload_needed', false],
		[{ status: 'ack_timeout' }, 'tab_ack_timeout', false],
		[{ status: 'declined', reason: 'read_only' }, 'tab_read_only', false],
		[{ status: 'declined', reason: 'tab_hidden' }, 'tab_tab_hidden', false],
		[{ status: 'declined', reason: 'apply_failed' }, 'tab_apply_failed', true],
		[{ status: 'work_timeout' }, 'tab_work_timeout', true],
	])('answers %j as %s', async (outcome, reason, mayHaveApplied) => {
		const env = makeEnv({ tab: tabAnswering(outcome) })

		const result = await callTool('apply_ops', { boardId: 'abc', ops: OPS }, env, 'user_tab')

		expect(result.isError).toBe(true)
		expect(blobValuesOf(env, TOOL_CALL_EVENT, 'reason')).toEqual([reason])
		expect(result.content[0].text.includes('may or may not have applied')).toBe(mayHaveApplied)
	})

	it('reports the page from the tab, not from a field in its result', async () => {
		const tab = tabAnswering({
			status: 'applied',
			pageId: 'page:a',
			pageName: 'Cover',
			result: { applied: 1, pageId: 'page:forged', pageName: 'Forged' },
		})

		const result = await callTool(
			'apply_ops',
			{ boardId: 'abc', ops: OPS },
			makeEnv({ tab }),
			'user_tab'
		)

		expect(JSON.parse(result.content[0].text)).toMatchObject({
			pageId: 'page:a',
			pageName: 'Cover',
		})
	})

	// The object can reset after a tab claimed the batch, so "nothing happened" could be false.
	it('warns that a batch may have applied when the object fails partway', async () => {
		const tab: FakeTab = vi.fn(async () => {
			throw new Error('object reset')
		})

		const result = await callTool(
			'apply_ops',
			{ boardId: 'abc', ops: OPS },
			makeEnv({ tab }),
			'user_tab'
		)

		expect(result.content[0].text).toContain('may or may not have applied')
	})

	it('hands back what the tab said was wrong with a batch', async () => {
		const env = makeEnv({
			tab: tabAnswering({
				status: 'declined',
				reason: 'invalid_ops',
				detail: '✖ Invalid op "add"',
			}),
		})

		const result = await callTool('apply_ops', { boardId: 'abc', ops: OPS }, env, 'user_tab')

		expect(result.isError).toBe(true)
		expect(result.content[0].text).toContain('nothing was applied')
		expect(result.content[0].text).toContain('Invalid op "add"')
	})

	it('answers the same for an inaccessible board as for a missing one', async () => {
		denyReadAccess()
		vi.mocked(getPublishedFileInfo).mockResolvedValue(null)
		const tab = openTab()

		const result = await callTool(
			'apply_ops',
			{ boardId: 'abc', ops: OPS },
			makeEnv({ tab }),
			'user_tab'
		)

		expect(result.content[0].text).toContain('No board was found with this id')
		expect(tab).not.toHaveBeenCalled()
	})

	it('says a published board cannot be edited, rather than that it was not found', async () => {
		denyReadAccess()
		mockPublishedBoard()

		const result = await callTool('apply_ops', { boardId: 'abc', ops: OPS }, makeEnv(), 'user_tab')

		expect(result.isError).toBe(true)
		expect(result.content[0].text).toContain('published board')
	})

	it.each([
		['no ops', { boardId: 'abc', ops: [] }, 'non-empty array'],
		['ops that are not a list', { boardId: 'abc', ops: 'add a box' }, 'non-empty array'],
		[
			'too many ops',
			{ boardId: 'abc', ops: Array.from({ length: 1001 }, () => OPS[0]) },
			'at most 1000',
		],
		['a batch too large to send', { boardId: 'abc', ops: ['x'.repeat(2_000_000)] }, 'too large'],
		['a bad runId', { boardId: 'abc', ops: OPS, runId: 7 }, 'runId'],
	])('refuses %s without reaching a tab', async (_name, args, phrase) => {
		const tab = openTab()

		const result = await callTool('apply_ops', args, makeEnv({ tab }), 'user_tab')

		expect(result.isError).toBe(true)
		expect(result.content[0].text).toContain(phrase)
		expect(tab).not.toHaveBeenCalled()
	})
})

describe('live reads', () => {
	beforeEach(() => {
		mockSharedBoard()
	})

	// An agent reading back what it just drew would otherwise wait out the persist interval.
	it('lists what the room holds now, not what R2 last saved', async () => {
		const persisted = vi.fn()
		const env = makeEnv({ ROOMS: { get: persisted, head: persisted } })

		const result = await callTool('get_page_info', { boardId: 'abc' }, env, 'user_tab')

		expect(result.isError).toBeUndefined()
		expect(persisted).not.toHaveBeenCalled()
	})
})

describe('presence', () => {
	const PEER: McpBoardUser = {
		userId: 'user_peer',
		name: 'Peer',
		pageId: 'page:a',
		selectedShapeIds: ['shape:theirs'],
		viewport: { x: 0, y: 0, w: 100, h: 100 },
		lastActiveAt: null,
	}

	beforeEach(() => {
		grantReadAccess()
	})

	it('lists who is on the board without asking a tab', async () => {
		const tab = openTab()

		const result = await callTool(
			'get_board_users',
			{ boardId: 'abc' },
			makeEnv({ tab, boardUsers: [PEER] }),
			'user_tab'
		)

		expect(JSON.parse(result.content[0].text)).toEqual({ users: [PEER], anonymousViewers: 0 })
		expect(tab).not.toHaveBeenCalled()
	})

	// A hibernating room clears selections from presence, so presence would read as nothing selected.
	it("asks the caller's own tab for their state", async () => {
		const tab = openTab()

		const result = await callTool(
			'get_user_state',
			{ boardId: 'abc' },
			makeEnv({ tab }),
			'user_tab'
		)

		expect(tab).toHaveBeenCalledWith('user_tab', { mode: 'user_state' })
		expect(JSON.parse(result.content[0].text)).toEqual({
			userId: 'user_tab',
			pageId: 'page:a',
			pageName: 'Cover',
			selectedShapeIds: ['shape:picked'],
			viewport: { x: 0, y: 0, w: 1000, h: 800 },
		})
	})

	it("reads someone else's state from presence", async () => {
		const tab = openTab()

		const result = await callTool(
			'get_user_state',
			{ boardId: 'abc', userId: 'user_peer' },
			makeEnv({ tab, boardUsers: [PEER] }),
			'user_tab'
		)

		expect(JSON.parse(result.content[0].text)).toEqual(PEER)
		expect(tab).not.toHaveBeenCalled()
	})

	it('says so when that user is not on the board', async () => {
		const result = await callTool(
			'get_user_state',
			{ boardId: 'abc', userId: 'user_gone' },
			makeEnv(),
			'user_tab'
		)

		expect(result.isError).toBe(true)
		expect(result.content[0].text).toContain('not on this board')
	})

	it('answers the same for a board the caller cannot see as for a missing one', async () => {
		denyReadAccess()
		vi.mocked(getPublishedFileInfo).mockResolvedValue(null)

		for (const name of ['get_board_users', 'get_user_state']) {
			const result = await callTool(name, { boardId: 'abc' }, makeEnv(), 'user_tab')
			expect(result.content[0].text).toContain('No board was found with this id')
		}
	})
})

// Only the tools that spend Postgres or write rows are limited. The budgets live in config.ts.
describe('rate limits', () => {
	// Search has its own budget because it bounds Postgres. Pins the configured
	// number rather than merely that something eventually refuses, and stops one call past it so a
	// pass cannot be some other limiter firing — search is checked against a binding of its own.
	it(`allows ${MCP_SEARCH_PER_USER_RATE_LIMIT} searches per account per minute, then rate limits`, async () => {
		vi.mocked(searchAccessibleBoards).mockResolvedValue([])
		const env = makeEnv()

		const results = []
		for (let i = 0; i <= MCP_SEARCH_PER_USER_RATE_LIMIT; i++) {
			results.push(await callTool('search_boards', {}, env, 'user_search'))
		}

		expect(results.slice(0, MCP_SEARCH_PER_USER_RATE_LIMIT).map((r) => r.isError)).toEqual(
			Array(MCP_SEARCH_PER_USER_RATE_LIMIT).fill(undefined)
		)
		const blocked = results[MCP_SEARCH_PER_USER_RATE_LIMIT]
		expect(blocked.isError).toBe(true)
		// The search message specifically, so this cannot pass on the Browser Run budget firing.
		expect(blocked.content[0].text).toContain('Searches are limited')
		// A limit nobody can see firing is the failure this ledger row exists to prevent.
		expect(failureBlobsOf(env)).toContain('failure:rate_limited_search')
	})

	// One budget across every tool that goes through the board's durable object, so an agent can't
	// multiply its share of the object by switching tools. A refused call must not reach the tab: that
	// load is the point.
	it(`allows ${MCP_TAB_PER_USER_RATE_LIMIT} calls through the board per account per minute, across the tools`, async () => {
		mockSharedBoard()
		const tab = openTab()
		const env = makeEnv({ tab })
		// Spends the first call of the budget.
		const clusterId = await firstClusterId(env, 'user_tab', 'abc')
		const ops = [{ op: 'add', kind: 'box', text: 'Hello', at: { x: 0, y: 0 } }]
		const calls = [
			['get_page_info', { boardId: 'abc' }],
			['get_cluster_info', { boardId: 'abc', clusterId }],
			['get_cluster_screenshot', { boardId: 'abc', clusterIds: [clusterId] }],
			['apply_ops', { boardId: 'abc', ops }],
			['get_user_state', { boardId: 'abc' }],
			['get_board_users', { boardId: 'abc' }],
		] as const

		const results = []
		for (let i = 1; i < MCP_TAB_PER_USER_RATE_LIMIT; i++) {
			const [tool, args] = calls[i % calls.length]
			results.push(await callTool(tool, args, env, 'user_tab'))
		}
		const callsWithinBudget = tab.mock.calls.length
		const blocked = []
		for (const [tool, args] of calls) blocked.push(await callTool(tool, args, env, 'user_tab'))

		expect(results.map((r) => r.isError)).toEqual(
			Array(MCP_TAB_PER_USER_RATE_LIMIT - 1).fill(undefined)
		)
		for (const result of blocked) {
			expect(result.isError).toBe(true)
			expect(result.content[0].text).toContain(
				`share a limit of about ${MCP_TAB_PER_USER_RATE_LIMIT}`
			)
		}
		expect(tab).toHaveBeenCalledTimes(callsWithinBudget)
		expect(failureBlobsOf(env)).toContain('failure:rate_limited_tab')
	})

	// Both halves matter: without the noisy caller actually being refused, the quiet one succeeding
	// says nothing, since a search nobody limits succeeds for everybody.
	it('gives each account its own search budget', async () => {
		vi.mocked(searchAccessibleBoards).mockResolvedValue([])
		const env = makeEnv()
		let noisy
		for (let i = 0; i <= MCP_SEARCH_PER_USER_RATE_LIMIT; i++) {
			noisy = await callTool('search_boards', {}, env, 'user_search_noisy')
		}
		expect(noisy?.isError).toBe(true)
		expect((await callTool('search_boards', {}, env, 'user_search_quiet')).isError).toBeUndefined()
	})
})

describe('shape screenshots', () => {
	it('rejects unknown cluster ids rather than rendering a subset', async () => {
		mockSharedBoard()
		const env = makeEnv()

		const missing = await callTool(
			'get_cluster_screenshot',
			{ boardId: 'abc', clusterIds: ['cluster:nope'] },
			env,
			'user_62'
		)
		expect(missing.isError).toBe(true)
	})

	it('writes a telemetry row when get_page_info cannot resolve the board', async () => {
		denyReadAccess()
		vi.mocked(getSharedFileInfo).mockResolvedValue(null)
		vi.mocked(getPublishedFileInfo).mockResolvedValue(null)
		const env = makeEnv({ ROOMS: makeFakeRoomsBucket() })

		const result = await callTool('get_page_info', { boardId: 'nope', page: 0 }, env, 'user_pi_nf')

		expect(result.isError).toBe(true)
		expect(failureBlobsOf(env)).toEqual(['failure:not_found'])
	})

	it('errors when the page is out of range, without spending a render', async () => {
		mockSharedBoard()
		const env = makeEnv()

		const result = await callTool(
			'get_cluster_screenshot',
			{ boardId: 'abc', page: 9, clusterIds: ['cluster:any'] },
			env,
			'user_65'
		)
		expect(result.isError).toBe(true)
		expect(result.content[0].text).toContain('out of range')
		// The documented reason vocabulary keeps selector mistakes distinct from missing boards —
		// `failure:not_found` here would send a dashboard reader hunting for deleted boards.
		expect(failureBlobsOf(env)).toContain('failure:page_not_found')
	})

	it('reports a board with no pages as board_empty in telemetry', async () => {
		mockSharedBoard(makeSnapshot([]))
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

	it("reads a caller's own unshared board through their tab", async () => {
		mockPrivateBoard()
		const tab = openTab()

		const result = await callTool(
			'get_page_info',
			{ boardId: 'mine' },
			makeEnv({ tab }),
			'user_owner'
		)

		expect(result.isError).toBeUndefined()
		expect(hasReadAccessToFile).toHaveBeenCalledWith(expect.anything(), 'user_owner', 'mine')
		expect(tab).toHaveBeenCalledWith('user_owner', {
			mode: 'read',
			page: { kind: 'ordinal', ordinal: 0 },
			clusterIds: [],
		})
	})

	it("does not reach anyone's tab for someone else's private file", async () => {
		denyReadAccess()
		vi.mocked(getSharedFileInfo).mockResolvedValue(PRIVATE_FILE)
		vi.mocked(getPublishedFileInfo).mockResolvedValue(null)
		const tab = openTab()
		const env = makeEnv({ ROOMS: makeFakeRoomsBucket(), tab })

		const result = await callTool(
			'get_cluster_screenshot',
			{ boardId: 'mine', clusterIds: ['cluster:any'] },
			env,
			'user_stranger'
		)

		expect(result.isError).toBe(true)
		expect(result.content[0].text).toContain('No board was found with this id')
		expect(tab).not.toHaveBeenCalled()
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
		mockSharedBoard()
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
	it('records the info tools on both ledgers', async () => {
		mockSharedBoard()
		const env = makeEnv()
		await callTool('get_page_info', { boardId: 'abc' }, env)

		expect(blobValuesOf(env, TOOL_CALL_EVENT, 'tool')).toEqual(['get_page_info'])
		expect(blobsWithPrefix(env, 'cache:')).toEqual(['cache:none'])
	})

	it('records the reason a call failed, and never reports a failure as ok', async () => {
		mockSharedBoard()
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
		mockSharedBoard()
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
		mockSharedBoard()
		const env = makeEnv()

		await callTool('get_board_info', {}, env)

		expect(datapointsNamed(env, SCREENSHOT_EVENT)).toEqual([])
		expect(blobValuesOf(env, TOOL_CALL_EVENT, 'reason')).toEqual(['invalid_input'])
	})

	// The same failure on the search budget, which has its own binding and so is not covered by the
	// clustering-tool case below. Its check was outside the handler's try when the limiter landed,
	// which is exactly the shape that case was written for.
	it('turns a failing search rate limiter into a structured error rather than a 500', async () => {
		vi.mocked(searchAccessibleBoards).mockResolvedValue([])
		const env = makeEnv({
			MCP_SERVER_SEARCH_RATE_LIMITER: {
				limit: async () => {
					throw new Error('limiter unavailable')
				},
			},
		})

		const result = await callTool('search_boards', {}, env, 'user_search_limiter')
		expect(result.isError).toBe(true)
		// The tool's own prefix, and the limiter clause rather than the board-database one its
		// `recordAs` would otherwise impose on every failure it sees.
		expect(result.content[0].text).toBe(
			'Could not search boards: a rate limit could not be checked.'
		)
	})

	// The tool name comes straight off the wire, so the lookup must not resolve inherited names. A
	// plain object would hand back Object.prototype's own methods and call them as tools: `constructor`
	// would echo the caller's arguments back as a successful result, and `__proto__` would 500.
	it('reports inherited property names as unknown tools rather than calling them', async () => {
		for (const name of ['constructor', 'toString', '__proto__', 'valueOf', 'hasOwnProperty']) {
			const env = makeEnv()
			const response = await mcpServer(makeToolCall(name, { secret: 'echo-me' }), env)
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
			const response = await mcpServer(makeRpcRequest('initialize', { clientInfo: { name } }), env)

			expect(response.status, String(name)).toBe(200)
			expect((await response.json()) as any, String(name)).toMatchObject({
				result: { protocolVersion: expect.any(String) },
			})
			expect(blobValuesOf(env, INITIALIZE_EVENT, 'client'), String(name)).toEqual(['none'])
			expect(blobValuesOf(env, INITIALIZE_EVENT, 'raw'), String(name)).toEqual(['none'])
		}
	})

	it('records the client family from the user agent', async () => {
		mockSharedBoard()
		const env = makeEnv()
		await mcpServer(
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
		await mcpServer(
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
