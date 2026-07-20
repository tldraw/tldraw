import { afterEach, describe, expect, it, vi } from 'vitest'
import { Environment } from '../../types'
import { getOgImage, getPublicOrigin } from './getOgImage'
import { getPublishedFileInfo } from './getPublishedFile'
import { getSharedFileInfo } from './getSharedFile'
import { getOgImageCacheKey } from './ogImageQueue'
import {
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
})

function makeRequest(prefix: string, slug: string, method = 'GET') {
	return Object.assign(
		new Request(`https://sync.tldraw.xyz/app/social-preview/${prefix}/${slug}/image`, { method }),
		{ params: { prefix, slug } }
	) as any
}

describe('getOgImage', () => {
	it('enqueues a render and redirects to the default OG image on a cold cache', async () => {
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1751234567890,
		})
		const fetch = vi.fn()
		vi.stubGlobal('fetch', fetch)
		const bucket = makeFakeThumbnailsBucket()
		const queue = makeFakeQueue()
		const env = makeEnv({ THUMBNAILS: bucket, QUEUE: queue })

		const response = await getOgImage(makeRequest('p', 'published-board'), env)

		// The request never waits on Browser Run; the render happens in the queue consumer.
		expect(fetch).not.toHaveBeenCalled()
		expect(response.status).toBe(302)
		expect(response.headers.get('location')).toBe('https://www.tldraw.com/social-og.png')
		expect(queue.send).toHaveBeenCalledExactlyOnceWith({
			type: 'og-image-render',
			kind: 'published',
			slug: 'published-board',
		})
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
		expect(queue.send).toHaveBeenCalledExactlyOnceWith({
			type: 'og-image-render',
			kind: 'published',
			slug: 'cached-board',
		})
	})

	it('enqueues renders for shared files behind the share gate', async () => {
		vi.mocked(getSharedFileInfo).mockResolvedValue({
			id: 'shared-file',
			shared: true,
			isDeleted: false,
		})
		const queue = makeFakeQueue()
		const env = makeEnv({
			ROOMS: makeFakeRoomsBucket('etag-1'),
			THUMBNAILS: makeFakeThumbnailsBucket(),
			QUEUE: queue,
		})

		const response = await getOgImage(makeRequest('f', 'shared-file'), env)

		expect(response.status).toBe(302)
		expect(queue.send).toHaveBeenCalledExactlyOnceWith({
			type: 'og-image-render',
			kind: 'shared_file',
			slug: 'shared-file',
		})
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

	it('does not enqueue a render for a HEAD probe on a cold cache', async () => {
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1751234567890,
		})
		const queue = makeFakeQueue()
		const env = makeEnv({ THUMBNAILS: makeFakeThumbnailsBucket(), QUEUE: queue })

		const response = await getOgImage(makeRequest('p', 'published-board', 'HEAD'), env)

		expect(response.status).toBe(302)
		expect(response.headers.get('location')).toBe('https://www.tldraw.com/social-og.png')
		expect(queue.send).not.toHaveBeenCalled()
	})

	it('redirects private or unknown boards to the default tldraw OG image without enqueueing', async () => {
		vi.mocked(getSharedFileInfo).mockResolvedValue({
			id: 'private-file',
			shared: false,
			isDeleted: false,
		})
		const fetch = vi.fn()
		vi.stubGlobal('fetch', fetch)
		const queue = makeFakeQueue()

		const response = await getOgImage(
			makeRequest('f', 'private-file'),
			makeEnv({ ROOMS: makeFakeRoomsBucket(), QUEUE: queue })
		)

		expect(response.status).toBe(302)
		expect(response.headers.get('location')).toBe('https://www.tldraw.com/social-og.png')
		expect(fetch).not.toHaveBeenCalled()
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
