import { afterEach, describe, expect, it, vi } from 'vitest'
import { getOgImage } from './getOgImage'
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
	vi.clearAllMocks()
})

function makeRequest(prefix: string, slug: string, method = 'GET') {
	return Object.assign(
		new Request(`https://sync.tldraw.xyz/app/social-preview/${prefix}/${slug}/image`, { method }),
		{ params: { prefix, slug } }
	) as any
}

describe('getOgImage', () => {
	// A board with no image of its own is sent to the site-wide default rather than having the worker
	// proxy those bytes: it is a static asset on the client origin, already cached at the edge.
	it('redirects to the default image on a cold cache, and queues nothing', async () => {
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1751234567890,
		})
		const bucket = makeFakeThumbnailsBucket()
		const queue = makeFakeQueue()
		const env = makeEnv({ THUMBNAILS: bucket, QUEUE: queue })

		const response = await getOgImage(makeRequest('p', 'published-board'), env)

		expect(response.status).toBe(302)
		expect(response.headers.get('location')).toBe('https://www.tldraw.com/social-og.png')
		// This route never asks for a render, even on a miss. Unfurl platforms resolve a URL's card once
		// and reuse it for every repost, so a render triggered from here lands after the crawler has
		// already cached the default — work whose result nobody comes back for. Making the image exist
		// before the share belongs to the publish and edit triggers.
		expect(queue.send).not.toHaveBeenCalled()
		expect(failureBlobsOf(env)).toEqual(['failure:not_rendered_yet'])
	})

	// The redirect sits on a board's own permanent OG image URL, so nothing between here and the
	// crawler may pin it: a shared cache holding this redirect would outlive the render it stands in
	// for, and keep sending crawlers to the default long after the board has a picture.
	it('redirects with a short client-only TTL', async () => {
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1,
		})
		const env = makeEnv({ THUMBNAILS: makeFakeThumbnailsBucket(), QUEUE: makeFakeQueue() })

		const response = await getOgImage(makeRequest('p', 'board'), env)

		expect(response.headers.get('cache-control')).toBe('public, max-age=60')
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

	// There is no "too stale to serve". An old picture of this board beats the generic tldraw logo, so a
	// version mismatch only shortens the cache lifetime — it never withholds the image or asks for a
	// render, and the image's age is not consulted at all.
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
		const queue = makeFakeQueue()
		const env = makeEnv({
			ROOMS: makeFakeRoomsBucket('etag-1'),
			THUMBNAILS: makeFakeThumbnailsBucket(),
			QUEUE: queue,
		})

		const response = await getOgImage(makeRequest('f', 'shared-file'), env)

		expect(response.status).toBe(302)
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
		const bucket = makeFakeThumbnailsBucket()
		await bucket.put(
			getOgImageCacheKey({ kind: 'shared_file', slug: 'unshared-file' }),
			new Uint8Array([1, 2, 3]).buffer,
			{ customMetadata: { version: 'etag-1', createdAt: String(Date.now()) } }
		)
		const env = makeEnv({ ROOMS: makeFakeRoomsBucket('etag-1'), THUMBNAILS: bucket })

		const response = await getOgImage(makeRequest('f', 'unshared-file'), env)

		expect(response.status).toBe(302)
		expect(response.headers.get('location')).toBe('https://www.tldraw.com/social-og.png')
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

	it('answers a HEAD probe on a cold cache with the same redirect a GET would get', async () => {
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

	it('sends private or unknown boards to the default tldraw OG image', async () => {
		vi.mocked(getSharedFileInfo).mockResolvedValue({
			id: 'private-file',
			shared: false,
			isDeleted: false,
		})
		const queue = makeFakeQueue()

		const response = await getOgImage(
			makeRequest('f', 'private-file'),
			makeEnv({ ROOMS: makeFakeRoomsBucket(), QUEUE: queue })
		)

		expect(response.status).toBe(302)
		expect(response.headers.get('location')).toBe('https://www.tldraw.com/social-og.png')
		expect(queue.send).not.toHaveBeenCalled()
	})

	// These datapoints carry no board identity at all — no index, no slug, no hash, no derived id.
	// The dataset answers aggregate spend and failure questions, and a board that resolves must be
	// indistinguishable from one that doesn't, or the dimension is back by another name.
	it('writes no board identity on any datapoint, resolved or not', async () => {
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1,
		})
		vi.mocked(getSharedFileInfo).mockResolvedValue({
			id: 'private-file',
			shared: false,
			isDeleted: false,
		})
		const env = makeEnv({
			ROOMS: makeFakeRoomsBucket('etag-1'),
			THUMBNAILS: makeFakeThumbnailsBucket(),
			QUEUE: makeFakeQueue(),
		})

		// A board that resolves, and one that fails its gate (which returns before writing anything).
		await getOgImage(makeRequest('p', 'published-slug'), env)
		await getOgImage(makeRequest('f', 'private-file'), env)

		expect(indexesOf(env)).toEqual([undefined])
		// Nothing board-shaped anywhere in the blobs either.
		const written = JSON.stringify((env.MEASURE as any).writeDataPoint.mock.calls)
		expect(written).not.toContain('published-slug')
		expect(written).not.toContain('file-1')
		expect(written).not.toContain('private-file')
	})
})
