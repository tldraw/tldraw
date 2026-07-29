import { afterEach, describe, expect, it, vi } from 'vitest'
import { verifyThumbnailRenderToken } from '../../utils/renderTokens'
import { getPublishedFileInfo, getPublishedRoomSnapshot } from './getPublishedFile'
import { getSharedFileInfo, getSharedFileRoomSnapshot } from './getSharedFile'
import {
	failureBlobsOf,
	ipBlobsOf,
	makeBrowserBinding,
	makeFakeRoomsBucket,
	makeFakeThumbnailsBucket,
	makeScreenshotTestEnv,
	makeSnapshot,
	screenshotOf,
	tokenFromScreenshot,
} from './screenshotTestHelpers'
import {
	getThumbnailPageCacheKey,
	isMcpScreenshotEnabled,
	parseBoardInfoInput,
	parseSharedBoardScreenshotInput,
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

afterEach(() => {
	vi.clearAllMocks()
	resetRateLimitFallbackForTests()
})

const THREE_PAGES = [
	{ id: 'page:a', name: 'Cover', index: 'a1', shapes: 2 },
	{ id: 'page:b', name: 'Ideas', index: 'a2', shapes: 1 },
	{ id: 'page:c', name: 'Blank', index: 'a3', shapes: 0 },
]

// The MCP tests assert the render URL against a render origin that is deliberately not the client's
// real origin, so pin a distinct one here rather than using the shared default.
function makeEnv(overrides: Partial<Record<string, unknown>> = {}) {
	return makeScreenshotTestEnv({
		MCP_SCREENSHOT_RENDER_ORIGIN: 'https://render.example',
		...overrides,
	})
}

function makeToolCall(ip: string, name: string, args: object) {
	return new Request('https://sync.tldraw.xyz/app/mcp', {
		method: 'POST',
		headers: { 'cf-connecting-ip': ip },
		body: JSON.stringify({
			jsonrpc: '2.0',
			id: 1,
			method: 'tools/call',
			params: { name, arguments: args },
		}),
	}) as any
}

async function resultOf(response: Response) {
	return ((await response.json()) as any).result
}

describe('parseSharedBoardScreenshotInput', () => {
	it('defaults page to 0 and theme to light', () => {
		expect(parseSharedBoardScreenshotInput({ boardId: 'abc' })).toEqual({
			boardId: 'abc',
			page: 0,
			theme: 'light',
		})
		expect(parseSharedBoardScreenshotInput({ boardId: 'abc', page: 2, theme: 'dark' })).toEqual({
			boardId: 'abc',
			page: 2,
			theme: 'dark',
		})
	})

	it('rejects missing board ids, URLs, and bad page ordinals', () => {
		expect(() => parseSharedBoardScreenshotInput({})).toThrow('boardId is required')
		expect(() => parseSharedBoardScreenshotInput({ boardId: 'https://x/f/a' })).toThrow('not a URL')
		expect(() => parseSharedBoardScreenshotInput({ boardId: 'a', page: -1 })).toThrow(
			'page must be'
		)
		expect(() => parseSharedBoardScreenshotInput({ boardId: 'a', page: 1.5 })).toThrow(
			'page must be'
		)
	})

	// An unrecognized theme is rejected rather than silently rendered as light, so a caller that
	// asks for something the tool doesn't support hears about it instead of getting a plausible
	// image back with its argument quietly dropped.
	it('rejects an unrecognized theme', () => {
		expect(() => parseSharedBoardScreenshotInput({ boardId: 'a', theme: 'blue' })).toThrow(
			'theme must be'
		)
		expect(() => parseSharedBoardScreenshotInput({ boardId: 'a', theme: 1 })).toThrow(
			'theme must be'
		)
		expect(parseSharedBoardScreenshotInput({ boardId: 'a', theme: null }).theme).toBe('light')
	})
})

describe('parseBoardInfoInput', () => {
	it('accepts a board id and rejects missing/URL ids', () => {
		expect(parseBoardInfoInput({ boardId: 'abc' })).toEqual({ boardId: 'abc' })
		expect(() => parseBoardInfoInput({})).toThrow('boardId is required')
		expect(() => parseBoardInfoInput({ boardId: 'https://x/p/a' })).toThrow('not a URL')
	})
})

describe('getThumbnailPageCacheKey', () => {
	it('includes board identity, version, fixed dimensions, theme, and page ordinal', () => {
		expect(
			getThumbnailPageCacheKey(
				{ kind: 'published', slug: 'abc', version: 1751234567890 },
				'dark',
				2
			)
		).toBe('mcp/published/abc/1751234567890/1200x630/dark/page-2.png')
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
		vi.mocked(getSharedFileInfo).mockResolvedValue(null)
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1751234567890,
		})
		vi.mocked(getPublishedRoomSnapshot).mockResolvedValue(makeSnapshot(THREE_PAGES))
		const env = makeEnv({
			MCP_SCREENSHOT_ENABLED: 'false',
			MCP_SCREENSHOTS: makeFakeThumbnailsBucket(),
		})

		const response = await sharedBoardScreenshotMcp(
			makeToolCall('203.0.113.40', 'get_shared_board_screenshot', { boardId: 'abc' }),
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
			new Request('https://sync.tldraw.xyz/app/mcp', {
				method: 'POST',
				body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' }),
			}) as any,
			makeEnv({ MCP_SCREENSHOT_ENABLED: 'false' })
		)

		expect(response.status).toBe(404)
	})
})

describe('get_board_info', () => {
	it('returns the board name, page count, and per-page info for a published board', async () => {
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1751234567890,
		})
		vi.mocked(getPublishedRoomSnapshot).mockResolvedValue(makeSnapshot(THREE_PAGES, 'My Board'))

		const response = await sharedBoardScreenshotMcp(
			makeToolCall('203.0.113.1', 'get_board_info', { boardId: 'abc' }),
			makeEnv()
		)

		const result = await resultOf(response)
		expect(JSON.parse(result.content[0].text)).toEqual({
			name: 'My Board',
			pageCount: 3,
			pages: [
				{ index: 0, name: 'Cover', hasContent: true },
				{ index: 1, name: 'Ideas', hasContent: true },
				{ index: 2, name: 'Blank', hasContent: false },
			],
		})
	})

	it('resolves a shared file id and never spends browser capacity', async () => {
		vi.mocked(getSharedFileInfo).mockResolvedValue({ id: 'f1', shared: true, isDeleted: false })
		vi.mocked(getSharedFileRoomSnapshot).mockResolvedValue(makeSnapshot(THREE_PAGES))
		const env = makeEnv({ ROOMS: makeFakeRoomsBucket() })

		const response = await sharedBoardScreenshotMcp(
			makeToolCall('203.0.113.2', 'get_board_info', { boardId: 'f1' }),
			env
		)

		const result = await resultOf(response)
		expect(JSON.parse(result.content[0].text).pageCount).toBe(3)
		expect(getPublishedFileInfo).not.toHaveBeenCalled()
		expect(screenshotOf(env)).not.toHaveBeenCalled()
	})

	it('errors when no public board exists', async () => {
		vi.mocked(getSharedFileInfo).mockResolvedValue(null)
		vi.mocked(getPublishedFileInfo).mockResolvedValue(null)

		const result = await resultOf(
			await sharedBoardScreenshotMcp(
				makeToolCall('203.0.113.3', 'get_board_info', { boardId: 'missing' }),
				makeEnv()
			)
		)
		expect(result.isError).toBe(true)
		expect(result.content[0].text).toContain('No public board')
	})

	// A board that resolves but whose snapshot read fails is not an empty board. Saying "no saved
	// content" would tell the caller the board is fine and simply blank, and would leave the real
	// failure with no trace. The caller hears that the read failed — but in bounded words: this is an
	// anonymous endpoint, and pg errors carry the database host, port, and username.
	it('surfaces a failed snapshot read without leaking the underlying error', async () => {
		vi.mocked(getSharedFileInfo).mockResolvedValue(null)
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1751234567890,
		})
		// `Once` so the rejection can't leak into later tests (clearAllMocks resets call history, not
		// implementations).
		vi.mocked(getPublishedRoomSnapshot).mockRejectedValueOnce(
			new Error('connect ECONNREFUSED 10.0.0.5:5432')
		)

		const result = await resultOf(
			await sharedBoardScreenshotMcp(
				makeToolCall('203.0.113.4', 'get_board_info', { boardId: 'abc' }),
				makeEnv()
			)
		)
		expect(result.isError).toBe(true)
		expect(result.content[0].text).toBe(
			"Could not read board info: the board's saved content could not be read."
		)
		expect(result.content[0].text).not.toContain('no saved content')
	})

	// A board un-shared between the resolve and the snapshot read trips the gate the reader
	// re-checks. That is not told apart from any other read failure here — the race is a few
	// milliseconds wide — so the caller gets the same bounded read-failure message, and Sentry gets
	// the original.
	it('reports a board that goes private mid-request as a read failure', async () => {
		vi.mocked(getSharedFileInfo).mockResolvedValue({ id: 'f', shared: true, isDeleted: false })
		vi.mocked(getSharedFileRoomSnapshot).mockRejectedValueOnce(new Error('not shared'))

		const result = await resultOf(
			await sharedBoardScreenshotMcp(
				makeToolCall('203.0.113.5', 'get_board_info', { boardId: 'f' }),
				makeEnv({ ROOMS: makeFakeRoomsBucket() })
			)
		)
		expect(result.isError).toBe(true)
		expect(result.content[0].text).toBe(
			"Could not read board info: the board's saved content could not be read."
		)
	})
})

describe('get_shared_board_screenshot', () => {
	function mockPublishedBoard() {
		// clearAllMocks (afterEach) resets call history but not mockResolvedValue, so a shared-file
		// result set by an earlier test would leak in and make this published board resolve as a
		// shared file (then hit env.ROOMS). Explicitly clear it: a published board has no shared row.
		vi.mocked(getSharedFileInfo).mockResolvedValue(null)
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1751234567890,
		})
		vi.mocked(getPublishedRoomSnapshot).mockResolvedValue(makeSnapshot(THREE_PAGES))
	}

	it('screenshots the first page by default and caches it', async () => {
		mockPublishedBoard()
		const bucket = makeFakeThumbnailsBucket()
		const env = makeEnv({ MCP_SCREENSHOTS: bucket })

		const result = await resultOf(
			await sharedBoardScreenshotMcp(
				makeToolCall('203.0.113.10', 'get_shared_board_screenshot', { boardId: 'abc' }),
				env
			)
		)

		expect(result.content).toEqual([
			{ type: 'text', text: 'Cover' },
			{ type: 'image', data: 'AQID', mimeType: 'image/png' },
		])
		// the render token pins the first page and never carries the user's board URL
		const body = screenshotOf(env).mock.calls[0]![1] as { url: string }
		expect(body.url).not.toContain('www.tldraw.com')
		const job = await verifyThumbnailRenderToken(env, tokenFromScreenshot(env))
		expect(job).toMatchObject({
			kind: 'published',
			slug: 'abc',
			camera: 'content',
			pageId: 'page:a',
		})
		// cached under the page-0 key
		expect([...bucket.store.keys()]).toEqual([
			'mcp/published/abc/1751234567890/1200x630/light/page-0.png',
		])
	})

	it('screenshots the requested page ordinal', async () => {
		mockPublishedBoard()
		const env = makeEnv({ MCP_SCREENSHOTS: makeFakeThumbnailsBucket() })

		const result = await resultOf(
			await sharedBoardScreenshotMcp(
				makeToolCall('203.0.113.11', 'get_shared_board_screenshot', { boardId: 'abc', page: 1 }),
				env
			)
		)

		expect(result.content[0]).toEqual({ type: 'text', text: 'Ideas' })
		const job = await verifyThumbnailRenderToken(env, tokenFromScreenshot(env))
		expect(job).toMatchObject({ pageId: 'page:b' })
	})

	it('waits on either terminal selector and captures a success-only element so failed renders fail fast', async () => {
		mockPublishedBoard()
		const env = makeEnv({ MCP_SCREENSHOTS: makeFakeThumbnailsBucket() })

		await sharedBoardScreenshotMcp(
			makeToolCall('203.0.113.18', 'get_shared_board_screenshot', { boardId: 'abc' }),
			env
		)

		const body = screenshotOf(env).mock.calls[0]![1] as {
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

	it('serves a cached page without screenshotting again', async () => {
		mockPublishedBoard()
		const bucket = makeFakeThumbnailsBucket()
		const env = makeEnv({ MCP_SCREENSHOTS: bucket })

		await sharedBoardScreenshotMcp(
			makeToolCall('203.0.113.12', 'get_shared_board_screenshot', { boardId: 'abc' }),
			env
		)
		const second = await resultOf(
			await sharedBoardScreenshotMcp(
				makeToolCall('203.0.113.13', 'get_shared_board_screenshot', { boardId: 'abc' }),
				env
			)
		)

		expect(second.content).toEqual([
			{ type: 'text', text: 'Cover' },
			{ type: 'image', data: 'AQID', mimeType: 'image/png' },
		])
		expect(screenshotOf(env)).toHaveBeenCalledTimes(1)
	})

	it('errors when the page ordinal is out of range, without screenshotting', async () => {
		mockPublishedBoard()
		const env = makeEnv({ MCP_SCREENSHOTS: makeFakeThumbnailsBucket() })

		const result = await resultOf(
			await sharedBoardScreenshotMcp(
				makeToolCall('203.0.113.14', 'get_shared_board_screenshot', { boardId: 'abc', page: 9 }),
				env
			)
		)
		expect(result.isError).toBe(true)
		expect(result.content[0].text).toContain('out of range')
		expect(screenshotOf(env)).not.toHaveBeenCalled()
	})

	it('errors for a private (unshared) file without screenshotting', async () => {
		vi.mocked(getSharedFileInfo).mockResolvedValue({ id: 'p', shared: false, isDeleted: false })
		vi.mocked(getPublishedFileInfo).mockResolvedValue(null)
		const env = makeEnv({
			ROOMS: makeFakeRoomsBucket(),
			MCP_SCREENSHOTS: makeFakeThumbnailsBucket(),
		})

		const result = await resultOf(
			await sharedBoardScreenshotMcp(
				makeToolCall('203.0.113.15', 'get_shared_board_screenshot', { boardId: 'p' }),
				env
			)
		)
		expect(result.isError).toBe(true)
		expect(result.content[0].text).toContain('No public board')
		expect(screenshotOf(env)).not.toHaveBeenCalled()
	})

	it('errors for a shared file with no saved content', async () => {
		vi.mocked(getSharedFileInfo).mockResolvedValue({ id: 'e', shared: true, isDeleted: false })
		const env = makeEnv({
			ROOMS: makeFakeRoomsBucket(null),
			MCP_SCREENSHOTS: makeFakeThumbnailsBucket(),
		})

		const result = await resultOf(
			await sharedBoardScreenshotMcp(
				makeToolCall('203.0.113.16', 'get_shared_board_screenshot', { boardId: 'e' }),
				env
			)
		)
		expect(result.isError).toBe(true)
		expect(result.content[0].text).toContain('no saved content')
	})

	// The counterpart to the test above: a snapshot read that fails must not land in the same place
	// an empty board does. Telemetry would otherwise record `board_empty` for a Postgres or R2
	// outage, which reads as "this board is blank" and hides an infrastructure failure. It gets its
	// own reason code rather than `render_error`, so a database outage is distinguishable from a
	// browser one on the dashboard.
	it('reports a failed snapshot read as a read failure, not an empty board or a render failure', async () => {
		vi.mocked(getSharedFileInfo).mockResolvedValue({ id: 'f', shared: true, isDeleted: false })
		vi.mocked(getSharedFileRoomSnapshot).mockRejectedValueOnce(
			new Error('R2 GET failed: internal-bucket.example')
		)
		const env = makeEnv({
			ROOMS: makeFakeRoomsBucket(),
			MCP_SCREENSHOTS: makeFakeThumbnailsBucket(),
		})

		const result = await resultOf(
			await sharedBoardScreenshotMcp(
				makeToolCall('203.0.113.18', 'get_shared_board_screenshot', { boardId: 'f' }),
				env
			)
		)
		expect(result.isError).toBe(true)
		expect(result.content[0].text).toBe(
			"Screenshot failed: the board's saved content could not be read."
		)
		// The anonymous caller must not learn anything about our infrastructure from a failure.
		expect(result.content[0].text).not.toContain('internal-bucket')
		expect(failureBlobsOf(env)).toEqual(['failure:snapshot_read_error'])
		expect(screenshotOf(env)).not.toHaveBeenCalled()
	})

	// A board un-shared between the resolve and the snapshot read trips the gate the reader
	// re-checks, which is not told apart from any other read failure. What matters either way is that
	// it fails before the render: no Browser Run is spent on a board that can't be served.
	it('reports a board that goes private mid-request as a read failure, without screenshotting', async () => {
		vi.mocked(getSharedFileInfo).mockResolvedValue({ id: 'f', shared: true, isDeleted: false })
		vi.mocked(getSharedFileRoomSnapshot).mockRejectedValueOnce(new Error('not shared'))
		const env = makeEnv({
			ROOMS: makeFakeRoomsBucket(),
			MCP_SCREENSHOTS: makeFakeThumbnailsBucket(),
		})

		const result = await resultOf(
			await sharedBoardScreenshotMcp(
				makeToolCall('203.0.113.19', 'get_shared_board_screenshot', { boardId: 'f' }),
				env
			)
		)
		expect(result.isError).toBe(true)
		expect(result.content[0].text).toBe(
			"Screenshot failed: the board's saved content could not be read."
		)
		expect(failureBlobsOf(env)).toEqual(['failure:snapshot_read_error'])
		expect(screenshotOf(env)).not.toHaveBeenCalled()
	})

	it('surfaces a render failure when the screenshot call fails', async () => {
		mockPublishedBoard()
		const env = makeEnv({
			MCP_SCREENSHOTS: makeFakeThumbnailsBucket(),
			BROWSER: makeBrowserBinding(async () => new Response('nope', { status: 500 })),
		})

		const result = await resultOf(
			await sharedBoardScreenshotMcp(
				makeToolCall('203.0.113.17', 'get_shared_board_screenshot', { boardId: 'abc' }),
				env
			)
		)
		expect(result.isError).toBe(true)
		// One bounded reason code drives both the caller's message and the telemetry blob, so the raw
		// error string reaches neither: it would blow up the blob's cardinality, and this endpoint
		// answers anonymous callers.
		expect(result.content[0].text).toBe('Screenshot failed: the render failed.')
		expect(failureBlobsOf(env)).toContain('failure:browser_failed')
		expect(failureBlobsOf(env).some((b) => b.includes('(500)'))).toBe(false)
	})

	// The cache write happens after the render, so a failure there means we are holding a PNG that
	// already cost Browser Run capacity and a slot of the caller's rate-limit budget. Returning it is
	// the only sensible outcome — the cache is an optimization, and the image is exactly what was
	// asked for. This used to sit in the render's try block, so an R2 outage turned every successful
	// screenshot into a tool error.
	it('returns the screenshot even when the cache write fails', async () => {
		mockPublishedBoard()
		const bucket = makeFakeThumbnailsBucket()
		bucket.put = async () => {
			throw new Error('R2 PUT failed: internal-bucket.example')
		}
		const env = makeEnv({ MCP_SCREENSHOTS: bucket })

		const result = await resultOf(
			await sharedBoardScreenshotMcp(
				makeToolCall('203.0.113.32', 'get_shared_board_screenshot', { boardId: 'abc' }),
				env
			)
		)

		expect(result.isError).toBeUndefined()
		expect(result.content).toEqual([
			{ type: 'text', text: 'Cover' },
			{ type: 'image', data: 'AQID', mimeType: 'image/png' },
		])
		// The render itself succeeded, so this is not recorded as a screenshot failure.
		expect(failureBlobsOf(env)).toEqual(['failure:none'])
	})

	// Pins the configured per-IP budget, not merely that some limit eventually fires. Each call uses a
	// distinct board so the per-board limiter can never be what trips, and the run stops one call past
	// the budget so it stays below the global cap — otherwise a passing test could not say which of the
	// three limits it had actually exercised.
	const PER_IP_RATE_LIMIT = 10
	it(`allows ${PER_IP_RATE_LIMIT} screenshots per IP per minute, then rate limits`, async () => {
		mockPublishedBoard()
		const env = makeEnv({ MCP_SCREENSHOTS: makeFakeThumbnailsBucket() })

		const results = []
		for (let i = 0; i <= PER_IP_RATE_LIMIT; i++) {
			results.push(
				await resultOf(
					await sharedBoardScreenshotMcp(
						makeToolCall('203.0.113.20', 'get_shared_board_screenshot', { boardId: `board-${i}` }),
						env
					)
				)
			)
		}

		expect(results.slice(0, PER_IP_RATE_LIMIT).map((r) => r.isError)).toEqual(
			Array(PER_IP_RATE_LIMIT).fill(undefined)
		)
		const blocked = results[PER_IP_RATE_LIMIT]
		expect(blocked.isError).toBe(true)
		// The per-IP message specifically, so this can't pass on the global cap firing instead.
		expect(blocked.content[0].text).toContain('per minute per IP')
		expect(failureBlobsOf(env)).toContain('failure:rate_limited_ip')
	})

	// Per-board is deliberately far tighter than per-IP: this blocks on the third capture of one board
	// while the same IP still has plenty of budget left.
	//
	// Note what this can and cannot check. Tests run with no rate limit bindings, so both budgets take
	// the isolate-local fallback and only the key and the fallback limit matter here — the part that
	// makes different numbers possible in a *deployment* is per-board having its own Cloudflare binding
	// (MCP_SCREENSHOT_BOARD_RATE_LIMITER), and no unit test can see that. wrangler.toml is the only
	// place that goes wrong, and the only place to check it.
	const PER_BOARD_RATE_LIMIT = 2
	it(`allows ${PER_BOARD_RATE_LIMIT} captures per board per minute, well inside the per-IP budget`, async () => {
		mockPublishedBoard()
		const env = makeEnv({ MCP_SCREENSHOTS: makeFakeThumbnailsBucket() })

		// Distinct pages of one board, so every call is a cache miss on the same board key.
		const results = []
		for (let page = 0; page <= PER_BOARD_RATE_LIMIT; page++) {
			results.push(
				await resultOf(
					await sharedBoardScreenshotMcp(
						makeToolCall('203.0.113.21', 'get_shared_board_screenshot', { boardId: 'abc', page }),
						env
					)
				)
			)
		}

		expect(results.slice(0, PER_BOARD_RATE_LIMIT).map((r) => r.isError)).toEqual(
			Array(PER_BOARD_RATE_LIMIT).fill(undefined)
		)
		const blocked = results[PER_BOARD_RATE_LIMIT]
		expect(blocked.isError).toBe(true)
		expect(blocked.content[0].text).toContain('This board is being screenshotted too frequently')
		expect(failureBlobsOf(env)).toContain('failure:rate_limited_board')
		// Only 3 calls in, so neither the per-IP (10) nor the global (20) budget can be what fired.
		expect(failureBlobsOf(env)).not.toContain('failure:rate_limited_ip')
		expect(failureBlobsOf(env)).not.toContain('failure:rate_limited_global')
	})

	it('records the hashed ip only on failures, not on successful screenshots', async () => {
		mockPublishedBoard()
		const successEnv = makeEnv({ MCP_SCREENSHOTS: makeFakeThumbnailsBucket() })
		await sharedBoardScreenshotMcp(
			makeToolCall('203.0.113.30', 'get_shared_board_screenshot', { boardId: 'abc' }),
			successEnv
		)
		expect(ipBlobsOf(successEnv)).toEqual(['ip:none'])

		vi.mocked(getSharedFileInfo).mockResolvedValue(null)
		vi.mocked(getPublishedFileInfo).mockResolvedValue(null)
		const failEnv = makeEnv({ MCP_SCREENSHOTS: makeFakeThumbnailsBucket() })
		await sharedBoardScreenshotMcp(
			makeToolCall('203.0.113.31', 'get_shared_board_screenshot', { boardId: 'missing' }),
			failEnv
		)
		const ipBlobs = ipBlobsOf(failEnv)
		expect(ipBlobs).toHaveLength(1)
		expect(ipBlobs[0]).toMatch(/^ip:[0-9a-f]{64}$/)
	})
})
