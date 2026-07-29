import { afterEach, describe, expect, it, vi } from 'vitest'
import { getOgImage, resetDefaultOgImageCacheForTests } from './getOgImage'
import { getPublishedFileInfo } from './getPublishedFile'
import { getSharedFileInfo } from './getSharedFile'
import { getOgImageCacheKey } from './ogImageQueue'
import {
	failureBlobsOf,
	indexesOf,
	makeFakeQueue,
	makeFakeRoomsBucket,
	makeFakeThumbnailsBucket,
	makeScreenshotTestEnv as makeEnv,
} from './screenshotTestHelpers'

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
	it('serves the default image bytes as a 200 on a cold cache, and queues nothing', async () => {
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
		// The only fetch is for the static default image.
		expect(fetch).toHaveBeenCalledExactlyOnceWith('https://www.tldraw.com/social-og.png')
		// This route no longer asks for a render on a miss. Unfurl platforms resolve a URL's card once
		// and reuse it for every repost, so the crawler that triggered the render has already cached the
		// default by the time it lands — the render was work whose result nobody came back for. Making
		// the image exist before the share belongs to the publish and edit triggers.
		expect(queue.send).not.toHaveBeenCalled()
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

	it('serves an image whose version matches as a fresh hit', async () => {
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

	// There is no "too stale to serve". An old picture of this board beats the generic tldraw logo, so
	// a version mismatch only shortens the cache lifetime — it never withholds the image or asks for a
	// render. Age is not consulted at all now that nothing here refreshes.
	it('serves a version-mismatched image as stale with a short TTL, however old it is', async () => {
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

		// Minutes old and a year old behave identically: both serve the bytes as stale.
		for (const now of ['2026-01-01T00:30:00Z', '2027-01-01T00:00:00Z']) {
			vi.setSystemTime(new Date(now))
			const stale = await getOgImage(makeRequest('p', 'cached-board'), env)
			expect(stale.status).toBe(200)
			expect(stale.headers.get('x-tldraw-og-cache')).toBe('stale')
			expect(stale.headers.get('cache-control')).toBe(
				'public, max-age=300, stale-while-revalidate=86400'
			)
			expect(await stale.arrayBuffer()).toEqual(new Uint8Array([1, 2, 3]).buffer)
		}
		expect(queue.send).not.toHaveBeenCalled()
	})

	// The route's whole gate: viewable (published, or shared via link) and an image exists. A shared
	// file with no image yet passes the first and fails the second, so it gets the default.
	it('serves a shared file that passes its gate but has no image yet', async () => {
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
		expect(response.headers.get('x-tldraw-og-cache')).toBe('fallback')
		expect(queue.send).not.toHaveBeenCalled()
	})

	// An unshared board's thumbnail stays in R2 for owner-facing surfaces behind authz, so the gate is
	// the only thing keeping it off the public internet. It has to be checked on every request rather
	// than relied on having deleted the object at unshare time.
	it('refuses a board that has an image but no longer passes its gate', async () => {
		vi.mocked(getSharedFileInfo).mockResolvedValue({
			id: 'unshared-file',
			shared: false,
			isDeleted: false,
		})
		stubDefaultOgImageFetch()
		const bucket = makeFakeThumbnailsBucket()
		await bucket.put(
			getOgImageCacheKey({ kind: 'shared_file', slug: 'unshared-file' }),
			new Uint8Array([1, 2, 3]).buffer,
			{ customMetadata: { version: 'etag-1', createdAt: String(Date.now()) } }
		)
		const env = makeEnv({ ROOMS: makeFakeRoomsBucket('etag-1'), THUMBNAILS: bucket })

		const response = await getOgImage(makeRequest('f', 'unshared-file'), env)

		expect(response.headers.get('x-tldraw-og-cache')).toBe('fallback')
		expect(new Uint8Array(await response.arrayBuffer())).toEqual(DEFAULT_OG_IMAGE_BYTES)
		// Still there, just unreachable from here.
		expect(
			bucket.store.has(getOgImageCacheKey({ kind: 'shared_file', slug: 'unshared-file' }))
		).toBe(true)
	})

	it('answers HEAD probes with the same cache headers as a GET, but no body', async () => {
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
		// ...but the R2 body is never read.
		expect((await response.arrayBuffer()).byteLength).toBe(0)
		expect(queue.send).not.toHaveBeenCalled()
	})

	it('answers a HEAD probe on a cold cache with the fallback headers and no body', async () => {
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

	it('serves private or unknown boards the default tldraw OG image', async () => {
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

	// index1 is the board's durable object id, so a render can be joined to the persists that caused
	// it. A published board's *slug* addresses no durable object — only the file behind it does — so
	// indexing on the slug would mint an id that looks fine and joins to nothing.
	it('indexes telemetry on the file behind a published slug, not the slug', async () => {
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1,
		})
		stubDefaultOgImageFetch()
		const env = makeEnv({ THUMBNAILS: makeFakeThumbnailsBucket(), QUEUE: makeFakeQueue() })

		await getOgImage(makeRequest('p', 'published-slug'), env)

		expect(indexesOf(env)).toEqual(['do(/r/file-1)'])
	})

	// A shared file's slug *is* its file id, so the two agree here — worth pinning alongside the
	// published case, which is the one where they diverge.
	it('indexes a shared file on its own slug', async () => {
		vi.mocked(getSharedFileInfo).mockResolvedValue({
			id: 'shared-file',
			shared: true,
			isDeleted: false,
		})
		stubDefaultOgImageFetch()
		const env = makeEnv({
			ROOMS: makeFakeRoomsBucket('etag-1'),
			THUMBNAILS: makeFakeThumbnailsBucket(),
			QUEUE: makeFakeQueue(),
		})

		await getOgImage(makeRequest('f', 'shared-file'), env)

		expect(indexesOf(env)).toEqual(['do(/r/shared-file)'])
	})

	// A board that fails its gate never resolves to a file, so there is nothing to index on. No index
	// is correct here; a placeholder would be a fake board in the dataset.
	it('writes no index when the board does not resolve', async () => {
		vi.mocked(getSharedFileInfo).mockResolvedValue({
			id: 'private-file',
			shared: false,
			isDeleted: false,
		})
		stubDefaultOgImageFetch()
		const env = makeEnv({ ROOMS: makeFakeRoomsBucket(), QUEUE: makeFakeQueue() })

		await getOgImage(makeRequest('f', 'private-file'), env)

		expect(indexesOf(env)).toEqual([])
	})
})
