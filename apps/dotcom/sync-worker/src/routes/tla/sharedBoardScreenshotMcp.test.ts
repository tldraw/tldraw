import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	buildBrowserRunThumbnailUrl,
	parseSharedBoardScreenshotInput,
	resolveSharedBoardUrl,
	sharedBoardScreenshotMcp,
} from './sharedBoardScreenshotMcp'

afterEach(() => {
	vi.unstubAllGlobals()
})

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

	it('clamps dimensions to the prototype bounds', () => {
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
			fixture: 'snapshot-example',
		})
	})

	it('rejects arbitrary external URLs', () => {
		expect(() => resolveSharedBoardUrl('https://example.com/p/abc')).toThrow(
			'Only tldraw.com board URLs are accepted'
		)
	})

	it('rejects private and invite-only file URLs until the production resolver exists', () => {
		expect(() => resolveSharedBoardUrl('https://www.tldraw.com/f/private-file')).toThrow(
			'production resolver'
		)
		expect(() => resolveSharedBoardUrl('https://www.tldraw.com/invite/token')).toThrow(
			'production resolver'
		)
	})
})

describe('buildBrowserRunThumbnailUrl', () => {
	it('builds the fixed tldraw-owned render target', () => {
		const url = new URL(
			buildBrowserRunThumbnailUrl(
				'https://preview.example',
				{ kind: 'published', slug: 'abc', fixture: 'snapshot-example' },
				{
					url: 'https://www.tldraw.com/p/abc',
					viewport: { x: 10, y: 20, z: 0.75 },
					width: 1200,
					height: 630,
					theme: 'dark',
				}
			)
		)

		expect(url.origin).toBe('https://preview.example')
		expect(url.pathname).toBe('/dev/browser-run-thumbnail')
		expect(url.searchParams.get('source')).toBe('mcp')
		expect(url.searchParams.get('boardSlug')).toBe('abc')
		expect(url.searchParams.get('x')).toBe('10')
		expect(url.searchParams.get('theme')).toBe('dark')
	})
})

describe('sharedBoardScreenshotMcp', () => {
	it('returns image content from Browser Run without screenshotting the user URL', async () => {
		const fetch = vi.fn(async () => {
			return new Response(new Uint8Array([1, 2, 3]), {
				headers: {
					'content-type': 'image/png',
					'X-Browser-Ms-Used': '123',
				},
			})
		})
		vi.stubGlobal('fetch', fetch)

		const response = await sharedBoardScreenshotMcp(
			new Request('https://sync.tldraw.xyz/app/mcp', {
				method: 'POST',
				headers: { 'cf-connecting-ip': '203.0.113.1' },
				body: JSON.stringify({
					jsonrpc: '2.0',
					id: 1,
					method: 'tools/call',
					params: {
						name: 'get_shared_board_screenshot',
						arguments: {
							url: 'https://www.tldraw.com/p/abc',
							viewport: { x: 10, y: 20, z: 0.75 },
						},
					},
				}),
			}) as any,
			{
				CLOUDFLARE_ACCOUNT_ID: 'account-id',
				CLOUDFLARE_API_TOKEN: 'api-token',
				MCP_SCREENSHOT_RENDER_ORIGIN: 'https://render.example',
				MEASURE: { writeDataPoint: vi.fn() },
			} as any
		)

		const body = (await response.json()) as any
		expect(body.result.content).toEqual([
			{
				type: 'image',
				data: 'AQID',
				mimeType: 'image/png',
			},
		])

		const browserRunRequest = JSON.parse(fetch.mock.calls[0]![1]!.body as string)
		expect(browserRunRequest.url).toContain('https://render.example/dev/browser-run-thumbnail?')
		expect(browserRunRequest.url).toContain('source=mcp')
		expect(browserRunRequest.url).not.toContain('www.tldraw.com%2Fp%2Fabc')
		expect(browserRunRequest.viewport).toEqual({
			width: 1200,
			height: 630,
			deviceScaleFactor: 1,
		})
	})

	it('returns a JSON-RPC tool error instead of crashing when the render origin is not configured', async () => {
		const fetch = vi.fn()
		vi.stubGlobal('fetch', fetch)

		const response = await sharedBoardScreenshotMcp(
			new Request('https://sync.tldraw.xyz/app/mcp', {
				method: 'POST',
				headers: { 'cf-connecting-ip': '203.0.113.2' },
				body: JSON.stringify({
					jsonrpc: '2.0',
					id: 2,
					method: 'tools/call',
					params: {
						name: 'get_shared_board_screenshot',
						arguments: {
							url: 'https://www.tldraw.com/p/abc',
							viewport: { x: 10, y: 20, z: 0.75 },
						},
					},
				}),
			}) as any,
			{
				CLOUDFLARE_ACCOUNT_ID: 'account-id',
				CLOUDFLARE_API_TOKEN: 'api-token',
				MEASURE: { writeDataPoint: vi.fn() },
			} as any
		)

		expect(response.status).toBe(200)
		const body = (await response.json()) as any
		expect(body.result.isError).toBe(true)
		expect(body.result.content[0].text).toContain('MCP_SCREENSHOT_RENDER_ORIGIN')
		expect(fetch).not.toHaveBeenCalled()
	})
})
