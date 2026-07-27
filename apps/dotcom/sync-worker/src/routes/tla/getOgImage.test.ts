import { afterEach, describe, expect, it, vi } from 'vitest'
import { Environment } from '../../types'
import { getOgImage, getPublicOrigin, resetDefaultOgImageCacheForTests } from './getOgImage'
import { getPublishedFileInfo } from './getPublishedFile'
import { getSharedFileInfo } from './getSharedFile'
import { getOgImageCacheKey } from './ogImageQueue'
import {
	failureBlobsOf,
	makeFakeQueue,
	makeFakeRoomsBucket,
	makeFakeThumbnailsBucket,
	makeScreenshotTestEnv as makeEnv,
} from './screenshotTestHelpers'
import { resetRateLimitFallbackForTests } from './sharedBoardScreenshotMcp'

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
	resetRateLimitFallbackForTests()
	resetDefaultOgImageCacheForTests()
})

function makeRequest(prefix: string, slug: string, method = 'GET') {
	return Object.assign(
		new Request(`https://sync.tldraw.xyz/app/social-preview/${prefix}/${slug}/image`, { method }),
		{ params: { prefix, slug } }
	) as any
}

// The default OG image lives on the client origin as a static asset; the route fetches it to serve as
// fallback bytes. Returns the stub so tests can count fetches and assert the URL.
const DEFAULT_OG_IMAGE_BYTES = new Uint8Array([137, 80, 78, 71])

function stubDefaultOgImageFetch() {
	const fetch = vi.fn(async () => new Response(DEFAULT_OG_IMAGE_BYTES, { status: 200 }))
	vi.stubGlobal('fetch', fetch)
	return fetch
}

describe('getOgImage', () => {
	// A cold cache must still answer with a valid image, not a redirect: the crawlers this endpoint
	// exists for cache the first response they see for days, and X doesn't follow an og:image redirect
	// at all, so a 302 here would poison the card permanently even though the render lands seconds
	// later.
	it('enqueues a render and serves the default image bytes as a 200 on a cold cache', async () => {
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1751234567890,
		})
		const fetch = stubDefaultOgImageFetch()
		const bucket = makeFakeThumbnailsBucket()
		const queue = makeFakeQueue()
		const env = makeEnv({ THUMBNAILS: bucket, QUEUE: queue })

		const response = await getOgImage(makeRequest('p', 'published-board'), env)

		expect(response.status).toBe(200)
		expect(response.headers.get('content-type')).toBe('image/png')
		expect(response.headers.get('x-tldraw-og-cache')).toBe('fallback')
		expect(new Uint8Array(await response.arrayBuffer())).toEqual(DEFAULT_OG_IMAGE_BYTES)
		// The only fetch is for the static default image — never a Browser Run render, which happens in
		// the queue consumer.
		expect(fetch).toHaveBeenCalledExactlyOnceWith('https://www.tldraw.com/social-og.png')
		expect(queue.send).toHaveBeenCalledExactlyOnceWith({
			type: 'og-image-render',
			kind: 'published',
			slug: 'published-board',
			reason: 'crawler',
		})
		expect(failureBlobsOf(env)).toEqual(['failure:served_fallback'])
	})

	// The fallback rides on a board's own permanent OG image URL, so nothing between here and the
	// crawler may pin it: a shared cache holding the default under this URL would outlive the render it
	// is standing in for.
	it('serves the fallback with a short client-only TTL', async () => {
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1,
		})
		stubDefaultOgImageFetch()
		const env = makeEnv({ THUMBNAILS: makeFakeThumbnailsBucket(), QUEUE: makeFakeQueue() })

		const response = await getOgImage(makeRequest('p', 'board'), env)

		expect(response.headers.get('cache-control')).toBe('public, max-age=60')
	})

	it('fetches the default image once per isolate and reuses the bytes', async () => {
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1,
		})
		const fetch = stubDefaultOgImageFetch()
		const env = makeEnv({ THUMBNAILS: makeFakeThumbnailsBucket(), QUEUE: makeFakeQueue() })

		const first = await getOgImage(makeRequest('p', 'board-a'), env)
		const second = await getOgImage(makeRequest('p', 'board-b'), env)

		expect(new Uint8Array(await first.arrayBuffer())).toEqual(DEFAULT_OG_IMAGE_BYTES)
		expect(new Uint8Array(await second.arrayBuffer())).toEqual(DEFAULT_OG_IMAGE_BYTES)
		expect(fetch).toHaveBeenCalledTimes(1)
	})

	// Falling back to the old redirect is worse for the crawlers that don't follow one, but it is
	// strictly better than failing the request, and a fetch failure must not be memoized — the next
	// request retries.
	it('redirects when the default image itself cannot be fetched', async () => {
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1,
		})
		const fetch = vi.fn(async () => {
			throw new Error('network down')
		})
		vi.stubGlobal('fetch', fetch)
		const env = makeEnv({ THUMBNAILS: makeFakeThumbnailsBucket(), QUEUE: makeFakeQueue() })

		const response = await getOgImage(makeRequest('p', 'board'), env)

		expect(response.status).toBe(302)
		expect(response.headers.get('location')).toBe('https://www.tldraw.com/social-og.png')
		expect(failureBlobsOf(env)).toEqual(['failure:not_rendered_yet'])

		// Not memoized: a recovered origin serves bytes again on the next request.
		stubDefaultOgImageFetch()
		expect((await getOgImage(makeRequest('p', 'board'), env)).status).toBe(200)
	})

	it('serves fresh cache hits without enqueueing', async () => {
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1,
		})
		const bucket = makeFakeThumbnailsBucket()
		await bucket.put(
			getOgImageCacheKey({ kind: 'published', slug: 'cached-board' }),
			new Uint8Array([1, 2, 3]).buffer,
			{ customMetadata: { version: '1', createdAt: String(Date.now()) } }
		)
		const queue = makeFakeQueue()
		const env = makeEnv({ THUMBNAILS: bucket, QUEUE: queue })

		const response = await getOgImage(makeRequest('p', 'cached-board'), env)

		expect(response.status).toBe(200)
		expect(response.headers.get('content-type')).toBe('image/png')
		expect(response.headers.get('x-tldraw-og-cache')).toBe('hit')
		expect(await response.arrayBuffer()).toEqual(new Uint8Array([1, 2, 3]).buffer)
		expect(queue.send).not.toHaveBeenCalled()
	})

	it('keeps serving a stale-but-recent image as a hit so one board cannot burn render capacity', async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 2,
		})
		const bucket = makeFakeThumbnailsBucket()
		await bucket.put(
			getOgImageCacheKey({ kind: 'published', slug: 'cached-board' }),
			new Uint8Array([1, 2, 3]).buffer,
			{ customMetadata: { version: '1', createdAt: String(Date.now()) } }
		)
		const queue = makeFakeQueue()
		const env = makeEnv({ THUMBNAILS: bucket, QUEUE: queue })

		vi.setSystemTime(new Date('2026-01-01T00:30:00Z'))
		const staleButYoung = await getOgImage(makeRequest('p', 'cached-board'), env)
		expect(staleButYoung.headers.get('x-tldraw-og-cache')).toBe('hit')
		expect(queue.send).not.toHaveBeenCalled()

		vi.setSystemTime(new Date('2026-01-01T01:01:00Z'))
		const stale = await getOgImage(makeRequest('p', 'cached-board'), env)
		expect(stale.status).toBe(200)
		expect(stale.headers.get('x-tldraw-og-cache')).toBe('stale')
		expect(await stale.arrayBuffer()).toEqual(new Uint8Array([1, 2, 3]).buffer)
		expect(queue.send).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ kind: 'published', slug: 'cached-board', reason: 'crawler' })
		)
	})

	it('enqueues renders for shared files behind the share gate', async () => {
		vi.mocked(getSharedFileInfo).mockResolvedValue({
			id: 'shared-file',
			shared: true,
			isDeleted: false,
		})
		stubDefaultOgImageFetch()
		const queue = makeFakeQueue()
		const env = makeEnv({
			ROOMS: makeFakeRoomsBucket('etag-1'),
			THUMBNAILS: makeFakeThumbnailsBucket(),
			QUEUE: queue,
		})

		const response = await getOgImage(makeRequest('f', 'shared-file'), env)

		expect(response.status).toBe(200)
		expect(queue.send).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ kind: 'shared_file', slug: 'shared-file', reason: 'crawler' })
		)
	})

	it('answers HEAD probes with cache headers but no body and no render enqueue', async () => {
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1,
		})
		const bucket = makeFakeThumbnailsBucket()
		await bucket.put(
			getOgImageCacheKey({ kind: 'published', slug: 'cached-board' }),
			new Uint8Array([1, 2, 3]).buffer,
			{ customMetadata: { version: '1', createdAt: String(Date.now()) } }
		)
		const queue = makeFakeQueue()
		const env = makeEnv({ THUMBNAILS: bucket, QUEUE: queue })

		const response = await getOgImage(makeRequest('p', 'cached-board', 'HEAD'), env)

		// Same headers a GET would return, so crawlers see the cache status...
		expect(response.status).toBe(200)
		expect(response.headers.get('content-type')).toBe('image/png')
		expect(response.headers.get('x-tldraw-og-cache')).toBe('hit')
		// ...but no body is read, and no Browser Run is spent.
		expect((await response.arrayBuffer()).byteLength).toBe(0)
		expect(queue.send).not.toHaveBeenCalled()
	})

	it('answers a HEAD probe on a cold cache with the fallback headers, no body and no enqueue', async () => {
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1751234567890,
		})
		stubDefaultOgImageFetch()
		const queue = makeFakeQueue()
		const env = makeEnv({ THUMBNAILS: makeFakeThumbnailsBucket(), QUEUE: queue })

		const response = await getOgImage(makeRequest('p', 'published-board', 'HEAD'), env)

		expect(response.status).toBe(200)
		expect(response.headers.get('x-tldraw-og-cache')).toBe('fallback')
		expect((await response.arrayBuffer()).byteLength).toBe(0)
		expect(queue.send).not.toHaveBeenCalled()
	})

	it('serves private or unknown boards the default tldraw OG image without enqueueing', async () => {
		vi.mocked(getSharedFileInfo).mockResolvedValue({
			id: 'private-file',
			shared: false,
			isDeleted: false,
		})
		stubDefaultOgImageFetch()
		const queue = makeFakeQueue()

		const response = await getOgImage(
			makeRequest('f', 'private-file'),
			makeEnv({ ROOMS: makeFakeRoomsBucket(), QUEUE: queue })
		)

		expect(response.status).toBe(200)
		expect(response.headers.get('x-tldraw-og-cache')).toBe('fallback')
		expect(queue.send).not.toHaveBeenCalled()
	})
})

describe('getPublicOrigin', () => {
	function requestWithHeaders(headers: Record<string, string>) {
		return new Request('https://main-tldraw-multiplayer.workers.dev/app/social-preview/f/x/image', {
			headers,
		}) as any
	}

	it('prefers the configured origin and ignores a spoofed forwarded host', () => {
		const origin = getPublicOrigin(
			requestWithHeaders({ 'x-forwarded-host': 'evil.com', 'x-forwarded-proto': 'https' }),
			{ MCP_SCREENSHOT_RENDER_ORIGIN: 'https://www.tldraw.com' } as Environment
		)
		expect(origin).toBe('https://www.tldraw.com')
	})

	it('uses a trusted forwarded host when no origin is configured', () => {
		const origin = getPublicOrigin(
			requestWithHeaders({
				'x-forwarded-host': 'staging.tldraw.com',
				'x-forwarded-proto': 'https',
			}),
			{} as Environment
		)
		expect(origin).toBe('https://staging.tldraw.com')
	})

	it('rejects an untrusted forwarded host and falls back to the request origin', () => {
		const origin = getPublicOrigin(
			requestWithHeaders({ 'x-forwarded-host': 'evil.com' }),
			{} as Environment
		)
		expect(origin).toBe('https://main-tldraw-multiplayer.workers.dev')
	})

	it('takes the proxy-appended (rightmost) forwarded host, not a client-injected one', () => {
		const origin = getPublicOrigin(
			requestWithHeaders({ 'x-forwarded-host': 'evil.com, www.tldraw.com' }),
			{} as Environment
		)
		expect(origin).toBe('https://www.tldraw.com')
	})
})
