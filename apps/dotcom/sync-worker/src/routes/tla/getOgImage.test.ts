import { afterEach, describe, expect, it, vi } from 'vitest'
import { Environment } from '../../types'
import { verifyThumbnailRenderToken } from '../../utils/renderTokens'
import { getOgHtml, getOgImage, getOgImageCacheKey } from './getOgImage'
import { getPublishedFileInfo } from './getPublishedFile'
import { getSharedFileInfo } from './getSharedFile'

vi.mock('./getPublishedFile', () => ({
	getPublishedFileInfo: vi.fn(),
}))

vi.mock('./getSharedFile', async (importOriginal) => ({
	...(await importOriginal<typeof import('./getSharedFile')>()),
	getSharedFileInfo: vi.fn(),
}))

afterEach(() => {
	vi.useRealTimers()
	vi.unstubAllGlobals()
	vi.clearAllMocks()
})

function makeFakeThumbnailsBucket() {
	const store = new Map<
		string,
		{ body: ArrayBuffer; customMetadata?: Record<string, string>; uploaded: Date }
	>()
	return {
		store,
		async get(key: string) {
			const value = store.get(key)
			if (!value) return null
			return {
				customMetadata: value.customMetadata,
				uploaded: value.uploaded,
				arrayBuffer: async () => value.body,
			}
		},
		async put(
			key: string,
			body: ArrayBuffer,
			options?: { customMetadata?: Record<string, string> }
		) {
			store.set(key, {
				body,
				customMetadata: options?.customMetadata,
				uploaded: new Date(Date.now()),
			})
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

function makeEnv(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		CLOUDFLARE_ACCOUNT_ID: 'account-id',
		BROWSER_RENDERING_API_TOKEN: 'api-token',
		MCP_SCREENSHOT_RENDER_ORIGIN: 'https://www.tldraw.com',
		MCP_SCREENSHOT_TOKEN_SECRET: 'test-secret',
		MEASURE: { writeDataPoint: vi.fn() },
		...overrides,
	} as unknown as Environment
}

function makeRequest(kind: string, slug: string) {
	return Object.assign(new Request(`https://sync.tldraw.xyz/app/og-image/${kind}/${slug}`), {
		params: { kind, slug },
	}) as any
}

function stubBrowserRunFetch(bytes = [1, 2, 3]) {
	const fetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
		return new Response(new Uint8Array(bytes), {
			headers: {
				'content-type': 'image/png',
				'X-Browser-Ms-Used': '123',
			},
		})
	})
	vi.stubGlobal('fetch', fetch)
	return fetch
}

describe('getOgImage', () => {
	it('captures a published board with a content-fit render token', async () => {
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1751234567890,
		})
		const fetch = stubBrowserRunFetch()
		const bucket = makeFakeThumbnailsBucket()
		const env = makeEnv({ THUMBNAILS: bucket })

		const response = await getOgImage(makeRequest('p', 'published-board'), env)

		expect(response.status).toBe(200)
		expect(response.headers.get('content-type')).toBe('image/png')
		expect(response.headers.get('x-tldraw-og-cache')).toBe('miss')
		expect(await response.arrayBuffer()).toEqual(new Uint8Array([1, 2, 3]).buffer)

		const browserRunRequest = JSON.parse(fetch.mock.calls[0]![1]!.body as string)
		const renderUrl = new URL(browserRunRequest.url)
		const job = await verifyThumbnailRenderToken(env, renderUrl.searchParams.get('token')!)
		expect(job).toMatchObject({
			kind: 'published',
			slug: 'published-board',
			fileId: 'file-1',
			version: 1751234567890,
			camera: 'content',
			width: 1200,
			height: 630,
		})
		expect(
			bucket.store.get('og/published/published-board/1200x630/light.png')?.customMetadata
		).toEqual({
			version: '1751234567890',
			createdAt: expect.any(String),
		})
	})

	it('serves cached OG images until the board changed and the minimum age has passed', async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1,
		})
		const fetch = stubBrowserRunFetch([1, 2, 3])
		const bucket = makeFakeThumbnailsBucket()
		const env = makeEnv({ THUMBNAILS: bucket })

		await getOgImage(makeRequest('p', 'cached-board'), env)
		expect(fetch).toHaveBeenCalledTimes(1)

		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 2,
		})
		vi.setSystemTime(new Date('2026-01-01T00:30:00Z'))

		const staleButYoung = await getOgImage(makeRequest('p', 'cached-board'), env)
		expect(staleButYoung.headers.get('x-tldraw-og-cache')).toBe('hit')
		expect(fetch).toHaveBeenCalledTimes(1)

		vi.setSystemTime(new Date('2026-01-01T01:01:00Z'))
		await getOgImage(makeRequest('p', 'cached-board'), env)
		expect(fetch).toHaveBeenCalledTimes(2)
		expect(
			bucket.store.get(getOgImageCacheKey({ kind: 'published', slug: 'cached-board' }))
				?.customMetadata?.version
		).toBe('2')
	})

	it('captures shared files and keys their version on the room etag', async () => {
		vi.mocked(getSharedFileInfo).mockResolvedValue({
			id: 'shared-file',
			shared: true,
			isDeleted: false,
		})
		const fetch = stubBrowserRunFetch()
		const env = makeEnv({
			ROOMS: makeFakeRoomsBucket('etag-1'),
			THUMBNAILS: makeFakeThumbnailsBucket(),
		})

		const response = await getOgImage(makeRequest('f', 'shared-file'), env)

		expect(response.status).toBe(200)
		const browserRunRequest = JSON.parse(fetch.mock.calls[0]![1]!.body as string)
		const renderUrl = new URL(browserRunRequest.url)
		const job = await verifyThumbnailRenderToken(env, renderUrl.searchParams.get('token')!)
		expect(job).toMatchObject({
			kind: 'shared_file',
			slug: 'shared-file',
			fileId: 'shared-file',
			version: 'etag-1',
			camera: 'content',
		})
	})

	it('redirects private or unknown boards to the default tldraw OG image', async () => {
		vi.mocked(getSharedFileInfo).mockResolvedValue({
			id: 'private-file',
			shared: false,
			isDeleted: false,
		})
		const fetch = vi.fn()
		vi.stubGlobal('fetch', fetch)

		const response = await getOgImage(
			makeRequest('f', 'private-file'),
			makeEnv({ ROOMS: makeFakeRoomsBucket() })
		)

		expect(response.status).toBe(302)
		expect(response.headers.get('location')).toBe('https://www.tldraw.com/social-og.png')
		expect(fetch).not.toHaveBeenCalled()
	})
})

describe('getOgHtml', () => {
	it('returns crawler metadata pointing at the board-specific OG image endpoint', async () => {
		const response = await getOgHtml(
			Object.assign(
				new Request('https://sync.tldraw.xyz/app/og-html/p/abc', {
					headers: {
						'x-forwarded-host': 'www.tldraw.com',
						'x-forwarded-proto': 'https',
					},
				}),
				{ params: { kind: 'p', slug: 'abc' } }
			) as any,
			makeEnv()
		)

		expect(response.status).toBe(200)
		const html = await response.text()
		expect(html).toContain(
			'property="og:image" content="https://www.tldraw.com/api/app/og-image/p/abc"'
		)
		expect(html).toContain('property="og:url" content="https://www.tldraw.com/p/abc"')
	})
})
