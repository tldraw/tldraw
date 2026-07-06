import { afterEach, describe, expect, it, vi } from 'vitest'
import { Environment } from '../../types'
import { verifyThumbnailRenderToken } from '../../utils/renderTokens'
import { getPublishedFileInfo } from './getPublishedFile'
import {
	buildThumbnailRenderUrl,
	getThumbnailCacheKey,
	parseSharedBoardScreenshotInput,
	resolveSharedBoardUrl,
	sharedBoardScreenshotMcp,
} from './sharedBoardScreenshotMcp'

vi.mock('./getPublishedFile', () => ({
	getPublishedFileInfo: vi.fn(),
}))

afterEach(() => {
	vi.unstubAllGlobals()
	vi.clearAllMocks()
})

function makeFakeThumbnailsBucket() {
	const store = new Map<string, ArrayBuffer>()
	return {
		store,
		async get(key: string) {
			const value = store.get(key)
			if (!value) return null
			return { arrayBuffer: async () => value }
		},
		async put(key: string, value: ArrayBuffer) {
			store.set(key, value)
		},
	}
}

function makeEnv(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		CLOUDFLARE_ACCOUNT_ID: 'account-id',
		BROWSER_RENDERING_API_TOKEN: 'api-token',
		MCP_SCREENSHOT_RENDER_ORIGIN: 'https://render.example',
		MCP_SCREENSHOT_TOKEN_SECRET: 'test-secret',
		MEASURE: { writeDataPoint: vi.fn() },
		...overrides,
	} as unknown as Environment
}

function makeToolCallRequest(ip: string, url = 'https://www.tldraw.com/p/abc') {
	return new Request('https://sync.tldraw.xyz/app/mcp', {
		method: 'POST',
		headers: { 'cf-connecting-ip': ip },
		body: JSON.stringify({
			jsonrpc: '2.0',
			id: 1,
			method: 'tools/call',
			params: {
				name: 'get_shared_board_screenshot',
				arguments: {
					url,
					viewport: { x: 10, y: 20, z: 0.75 },
				},
			},
		}),
	}) as any
}

function stubBrowserRunFetch() {
	const fetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
		return new Response(new Uint8Array([1, 2, 3]), {
			headers: {
				'content-type': 'image/png',
				'X-Browser-Ms-Used': '123',
			},
		})
	})
	vi.stubGlobal('fetch', fetch)
	return fetch
}

describe('parseSharedBoardScreenshotInput', () => {
	it('defaults dimensions and theme', () => {
		expect(
			parseSharedBoardScreenshotInput({
				url: 'https://www.tldraw.com/p/abc',
				viewport: { x: 1, y: 2, z: 0.5 },
			})
		).toEqual({
			url: 'https://www.tldraw.com/p/abc',
			viewport: { x: 1, y: 2, z: 0.5 },
			width: 1200,
			height: 630,
			theme: 'light',
		})
	})

	it('clamps dimensions to the allowed bounds', () => {
		expect(
			parseSharedBoardScreenshotInput({
				url: 'https://www.tldraw.com/p/abc',
				viewport: { x: 1, y: 2, z: 0.5 },
				width: 10_000,
				height: 1,
				theme: 'dark',
			})
		).toMatchObject({
			width: 1600,
			height: 200,
			theme: 'dark',
		})
	})
})

describe('resolveSharedBoardUrl', () => {
	it('accepts published tldraw.com URLs', () => {
		expect(resolveSharedBoardUrl('https://www.tldraw.com/p/abc')).toEqual({
			kind: 'published',
			slug: 'abc',
		})
	})

	it('rejects arbitrary external URLs', () => {
		expect(() => resolveSharedBoardUrl('https://example.com/p/abc')).toThrow(
			'Only tldraw.com board URLs are accepted'
		)
	})

	it('rejects private and invite-only file URLs', () => {
		expect(() => resolveSharedBoardUrl('https://www.tldraw.com/f/private-file')).toThrow(
			'not supported'
		)
		expect(() => resolveSharedBoardUrl('https://www.tldraw.com/invite/token')).toThrow(
			'not supported'
		)
	})
})

describe('getThumbnailCacheKey', () => {
	it('includes board identity, published version, dimensions, theme, and viewport', () => {
		expect(
			getThumbnailCacheKey({
				kind: 'published',
				slug: 'abc',
				fileId: 'file-1',
				version: 1751234567890,
				x: 10,
				y: 20,
				z: 0.75,
				width: 1200,
				height: 630,
				theme: 'dark',
			})
		).toBe('mcp/published/abc/1751234567890/1200x630/dark/10_20_0.75.png')
	})
})

describe('buildThumbnailRenderUrl', () => {
	it('builds the render page URL with the token', () => {
		const url = new URL(buildThumbnailRenderUrl('https://render.example', 'the-token'))
		expect(url.origin).toBe('https://render.example')
		expect(url.pathname).toBe('/__thumbnail-render')
		expect(url.searchParams.get('token')).toBe('the-token')
	})
})

describe('sharedBoardScreenshotMcp', () => {
	it('captures a published board through a signed render job, not the user URL', async () => {
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1751234567890,
		})
		const fetch = stubBrowserRunFetch()
		const env = makeEnv()

		const response = await sharedBoardScreenshotMcp(makeToolCallRequest('203.0.113.1'), env)

		const body = (await response.json()) as any
		expect(body.result.content).toEqual([
			{
				type: 'image',
				data: 'AQID',
				mimeType: 'image/png',
			},
		])

		const browserRunRequest = JSON.parse(fetch.mock.calls[0]![1]!.body as string)
		const renderUrl = new URL(browserRunRequest.url)
		expect(renderUrl.origin).toBe('https://render.example')
		expect(renderUrl.pathname).toBe('/__thumbnail-render')
		expect(browserRunRequest.url).not.toContain('www.tldraw.com')

		// the render token round-trips to the resolved board and requested render params
		const job = await verifyThumbnailRenderToken(env, renderUrl.searchParams.get('token')!)
		expect(job).toMatchObject({
			kind: 'published',
			slug: 'abc',
			fileId: 'file-1',
			version: 1751234567890,
			x: 10,
			y: 20,
			z: 0.75,
			width: 1200,
			height: 630,
			theme: 'light',
		})

		expect(browserRunRequest.viewport).toEqual({
			width: 1200,
			height: 630,
			deviceScaleFactor: 1,
		})
	})

	it('serves repeat requests from the thumbnail cache without invoking Browser Run again', async () => {
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1751234567890,
		})
		const fetch = stubBrowserRunFetch()
		const bucket = makeFakeThumbnailsBucket()
		const env = makeEnv({ THUMBNAILS: bucket })

		const first = await sharedBoardScreenshotMcp(
			makeToolCallRequest('203.0.113.10', 'https://www.tldraw.com/p/cached-board'),
			env
		)
		const second = await sharedBoardScreenshotMcp(
			makeToolCallRequest('203.0.113.11', 'https://www.tldraw.com/p/cached-board'),
			env
		)

		const firstBody = (await first.json()) as any
		const secondBody = (await second.json()) as any
		expect(firstBody.result.content[0].type).toBe('image')
		expect(secondBody.result.content).toEqual(firstBody.result.content)
		expect(fetch).toHaveBeenCalledTimes(1)
		expect(bucket.store.size).toBe(1)
		expect([...bucket.store.keys()][0]).toContain('mcp/published/cached-board/')
	})

	it('returns a tool error for boards that are not published', async () => {
		vi.mocked(getPublishedFileInfo).mockResolvedValue(null)
		const fetch = vi.fn()
		vi.stubGlobal('fetch', fetch)

		const response = await sharedBoardScreenshotMcp(
			makeToolCallRequest('203.0.113.20', 'https://www.tldraw.com/p/missing'),
			makeEnv()
		)

		const body = (await response.json()) as any
		expect(body.result.isError).toBe(true)
		expect(body.result.content[0].text).toContain('No published board')
		expect(fetch).not.toHaveBeenCalled()
	})

	it('returns a JSON-RPC tool error instead of crashing when the render origin is not configured', async () => {
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1751234567890,
		})
		const fetch = vi.fn()
		vi.stubGlobal('fetch', fetch)

		const response = await sharedBoardScreenshotMcp(
			makeToolCallRequest('203.0.113.30'),
			makeEnv({ MCP_SCREENSHOT_RENDER_ORIGIN: undefined })
		)

		expect(response.status).toBe(200)
		const body = (await response.json()) as any
		expect(body.result.isError).toBe(true)
		expect(body.result.content[0].text).toContain('MCP_SCREENSHOT_RENDER_ORIGIN')
		expect(fetch).not.toHaveBeenCalled()
	})

	it('enforces the per-IP rate limit', async () => {
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1751234567890,
		})
		stubBrowserRunFetch()
		const env = makeEnv()

		let lastBody: any
		for (let i = 0; i < 21; i++) {
			const response = await sharedBoardScreenshotMcp(
				makeToolCallRequest('203.0.113.40', `https://www.tldraw.com/p/board-${i}`),
				env
			)
			lastBody = await response.json()
		}

		expect(lastBody.result.isError).toBe(true)
		expect(lastBody.result.content[0].text).toContain('Rate limited')
	})
})
