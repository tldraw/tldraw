import { afterEach, describe, expect, it, vi } from 'vitest'
import { Environment } from '../../types'
import { verifyThumbnailRenderToken } from '../../utils/renderTokens'
import { getPublishedFileInfo, getPublishedRoomSnapshot } from './getPublishedFile'
import { getSharedFileInfo, getSharedFileRoomSnapshot } from './getSharedFile'
import {
	buildThumbnailRenderUrl,
	enumerateBoardPages,
	getThumbnailPageCacheKey,
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

// Builds a room snapshot with the given pages and per-page shape counts. Shapes are parented
// directly to their page, which is what enumerateBoardPages checks for "has content".
function makeSnapshot(
	pages: Array<{ id: string; name: string; index: string; shapes: number }>,
	boardName: string | null = 'My Board'
) {
	const documents: Array<{ state: any }> = [
		{ state: { typeName: 'document', id: 'document:document', name: boardName ?? '' } },
	]
	for (const p of pages) {
		documents.push({ state: { typeName: 'page', id: p.id, name: p.name, index: p.index } })
		for (let i = 0; i < p.shapes; i++) {
			documents.push({ state: { typeName: 'shape', id: `shape:${p.id}-${i}`, parentId: p.id } })
		}
	}
	return { documents, schema: { schemaVersion: 2, sequences: {} } } as any
}

const THREE_PAGES = [
	{ id: 'page:a', name: 'Cover', index: 'a1', shapes: 2 },
	{ id: 'page:b', name: 'Ideas', index: 'a2', shapes: 1 },
	{ id: 'page:c', name: 'Blank', index: 'a3', shapes: 0 },
]

function makeFakeThumbnailsBucket() {
	const store = new Map<string, { body: ArrayBuffer; customMetadata?: Record<string, string> }>()
	return {
		store,
		async get(key: string) {
			const value = store.get(key)
			if (!value) return null
			return { customMetadata: value.customMetadata, arrayBuffer: async () => value.body }
		},
		async put(
			key: string,
			body: ArrayBuffer,
			options?: { customMetadata?: Record<string, string> }
		) {
			store.set(key, { body, customMetadata: options?.customMetadata })
		},
	}
}

function makeFakeRoomsBucket(etag: string | null = 'room-etag-1') {
	return {
		async head(_key: string) {
			return etag === null ? null : { etag }
		},
	}
}

// The BROWSER binding's `.quickAction('screenshot', body)` returns a Response whose body is the PNG
// bytes. [1,2,3] base64-encodes to AQID. Pass a custom impl to simulate failures.
function makeBrowserBinding(
	screenshot: (body: any) => Promise<Response> = async () =>
		new Response(new Uint8Array([1, 2, 3]), { status: 200 })
) {
	return { quickAction: vi.fn((_action: string, body: any) => screenshot(body)) }
}

function makeEnv(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		BROWSER: makeBrowserBinding(),
		MCP_SCREENSHOT_RENDER_ORIGIN: 'https://render.example',
		MCP_SCREENSHOT_TOKEN_SECRET: 'test-secret',
		MEASURE: { writeDataPoint: vi.fn() },
		...overrides,
	} as unknown as Environment
}

function screenshotOf(env: Environment) {
	return (env.BROWSER as any).quickAction as ReturnType<typeof vi.fn>
}

function tokenFromScreenshot(env: Environment): string {
	// quickAction is called as quickAction('screenshot', body); the body (with the render URL) is arg 1.
	const body = screenshotOf(env).mock.calls[0]![1] as { url: string }
	return new URL(body.url).searchParams.get('token')!
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

describe('enumerateBoardPages', () => {
	it('lists pages in fractional-index order with names and content flags', () => {
		const pages = enumerateBoardPages(
			makeSnapshot([
				{ id: 'page:b', name: 'Ideas', index: 'a2', shapes: 1 },
				{ id: 'page:a', name: 'Cover', index: 'a1', shapes: 2 },
				{ id: 'page:c', name: '', index: 'a3', shapes: 0 },
			])
		)
		expect(pages).toEqual([
			{ index: 0, id: 'page:a', name: 'Cover', hasContent: true },
			{ index: 1, id: 'page:b', name: 'Ideas', hasContent: true },
			{ index: 2, id: 'page:c', name: 'Page 3', hasContent: false },
		])
	})
})

describe('buildThumbnailRenderUrl', () => {
	it('builds the render page URL with the token', () => {
		const url = new URL(buildThumbnailRenderUrl('https://render.example', 'the-token'))
		expect(url.pathname).toBe('/__thumbnail-render')
		expect(url.searchParams.get('token')).toBe('the-token')
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
		const env = makeEnv({ THUMBNAILS: bucket })

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
		const env = makeEnv({ THUMBNAILS: makeFakeThumbnailsBucket() })

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

	it('serves a cached page without screenshotting again', async () => {
		mockPublishedBoard()
		const bucket = makeFakeThumbnailsBucket()
		const env = makeEnv({ THUMBNAILS: bucket })

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
		const env = makeEnv({ THUMBNAILS: makeFakeThumbnailsBucket() })

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
		const env = makeEnv({ ROOMS: makeFakeRoomsBucket(), THUMBNAILS: makeFakeThumbnailsBucket() })

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
			THUMBNAILS: makeFakeThumbnailsBucket(),
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

	it('surfaces a render failure when the screenshot call fails', async () => {
		mockPublishedBoard()
		const env = makeEnv({
			THUMBNAILS: makeFakeThumbnailsBucket(),
			BROWSER: makeBrowserBinding(async () => new Response('nope', { status: 500 })),
		})

		const result = await resultOf(
			await sharedBoardScreenshotMcp(
				makeToolCall('203.0.113.17', 'get_shared_board_screenshot', { boardId: 'abc' }),
				env
			)
		)
		expect(result.isError).toBe(true)
		// The caller sees the specific message, but telemetry gets a bounded reason code — the raw
		// error string never reaches the failure blob (which would blow up its cardinality).
		expect(result.content[0].text).toContain('Screenshot failed')
		expect(failureBlobsOf(env)).toContain('failure:browser_failed')
		expect(failureBlobsOf(env).some((b) => b.includes('(500)'))).toBe(false)
	})

	it('enforces the per-IP rate limit', async () => {
		mockPublishedBoard()
		const env = makeEnv({ THUMBNAILS: makeFakeThumbnailsBucket() })

		let lastResult: any
		for (let i = 0; i < 21; i++) {
			lastResult = await resultOf(
				await sharedBoardScreenshotMcp(
					makeToolCall('203.0.113.20', 'get_shared_board_screenshot', { boardId: `board-${i}` }),
					env
				)
			)
		}
		expect(lastResult.isError).toBe(true)
		expect(lastResult.content[0].text).toContain('Rate limited')
	})

	// Pulls the `<prefix>:…` telemetry blob out of every writeDataPoint call, so tests can assert on
	// the low-cardinality dimensions (failure reason codes, and IP only on failures).
	function blobsWithPrefix(env: Environment, prefix: string): string[] {
		return (env.MEASURE as any).writeDataPoint.mock.calls
			.map((call: any[]) => (call[0].blobs as string[]).find((b) => b.startsWith(prefix)))
			.filter(Boolean)
	}
	function ipBlobsOf(env: Environment) {
		return blobsWithPrefix(env, 'ip:')
	}
	function failureBlobsOf(env: Environment) {
		return blobsWithPrefix(env, 'failure:')
	}

	it('records the hashed ip only on failures, not on successful screenshots', async () => {
		mockPublishedBoard()
		const successEnv = makeEnv({ THUMBNAILS: makeFakeThumbnailsBucket() })
		await sharedBoardScreenshotMcp(
			makeToolCall('203.0.113.30', 'get_shared_board_screenshot', { boardId: 'abc' }),
			successEnv
		)
		expect(ipBlobsOf(successEnv)).toEqual(['ip:none'])

		vi.mocked(getSharedFileInfo).mockResolvedValue(null)
		vi.mocked(getPublishedFileInfo).mockResolvedValue(null)
		const failEnv = makeEnv({ THUMBNAILS: makeFakeThumbnailsBucket() })
		await sharedBoardScreenshotMcp(
			makeToolCall('203.0.113.31', 'get_shared_board_screenshot', { boardId: 'missing' }),
			failEnv
		)
		const ipBlobs = ipBlobsOf(failEnv)
		expect(ipBlobs).toHaveLength(1)
		expect(ipBlobs[0]).toMatch(/^ip:[0-9a-f]{64}$/)
	})
})
