import { afterEach, describe, expect, it, vi } from 'vitest'
import { OG_REPAIR_COOLDOWN_MS } from '../../config'
import { getOgImage } from './getOgImage'
import { getPublishedFileInfo } from './getPublishedFile'
import { getSharedFileInfo } from './getSharedFile'
import { getOgImageCacheKey } from './ogImageQueue'
import {
	blobsWithPrefix,
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

function makeRequest(prefix: string, slug: string, method = 'GET', headers?: HeadersInit) {
	return Object.assign(
		new Request(`https://sync.tldraw.xyz/app/social-preview/${prefix}/${slug}/image`, {
			method,
			headers,
		}),
		{ params: { prefix, slug } }
	) as any
}

describe('getOgImage', () => {
	// A board with no image of its own is sent to the site-wide default rather than having the worker
	// proxy those bytes: it is a static asset on the client origin, already cached at the edge.
	it('redirects to the default image on a cold cache', async () => {
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
		expect(failureBlobsOf(env)).toEqual(['failure:not_rendered_yet'])
		// This surface has no follow-up concept, so it records `none` rather than `false` — otherwise
		// a query for triggered renders would sweep up every og datapoint too.
		expect(blobsWithPrefix(env, 'followup:')).toEqual(['followup:none'])
	})

	// The asymmetry this repair exists for: a published snapshot is frozen and its publish effect is
	// the only thing that ever asks for a render, so an ask lost to a queue failure or a stale pending
	// marker would leave a generic card until somebody republished.
	it('asks for a render when a published board has no image at all', async () => {
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1,
		})
		const queue = makeFakeQueue()
		const env = makeEnv({ THUMBNAILS: makeFakeThumbnailsBucket(), QUEUE: queue })

		await getOgImage(makeRequest('p', 'published-board'), env)

		expect(queue.send).toHaveBeenCalledTimes(1)
		expect(queue.send).toHaveBeenCalledWith({
			type: 'og-image-render',
			kind: 'published',
			slug: 'published-board',
			reason: 'crawler',
		})
	})

	// The repair is the one render ask an unauthenticated request can cause, so once a repair job has
	// failed its whole retry budget, crawler traffic must not be able to re-arm another chain until the
	// cooldown lapses — otherwise a board that cannot render is a Browser Run spend lever for whoever
	// fetches its URL.
	it('does not re-ask while a failed repair has the board on cooldown', async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1,
		})
		const bucket = makeFakeThumbnailsBucket()
		await bucket.put(
			getOgImageCacheKey({ kind: 'published', slug: 'failing-board' }).replace(
				/\.png$/,
				'.repair-cooldown'
			),
			new Uint8Array().buffer,
			{ customMetadata: { expiresAt: String(Date.now() + OG_REPAIR_COOLDOWN_MS) } }
		)
		const queue = makeFakeQueue()
		const env = makeEnv({ THUMBNAILS: bucket, QUEUE: queue })

		await getOgImage(makeRequest('p', 'failing-board'), env)
		expect(queue.send).not.toHaveBeenCalled()

		// Once the cooldown lapses, the repair asks again.
		vi.setSystemTime(Date.parse('2026-01-01T00:00:00Z') + OG_REPAIR_COOLDOWN_MS + 1000)
		await getOgImage(makeRequest('p', 'failing-board'), env)
		expect(queue.send).toHaveBeenCalledTimes(1)
	})

	// A shared file gets no such repair, and the reason is that it does not need one: every persist
	// that advances its document clock re-asks, so a lost ask is made good by the next edit. Rendering
	// from here would be work whose result nobody comes back for — unfurl platforms resolve a card once
	// and reuse it for every repost.
	it('does not ask for a render when a shared file has no image yet', async () => {
		vi.mocked(getSharedFileInfo).mockResolvedValue({
			id: 'file-1',
			shared: true,
			sharedLinkType: 'view',
			isDeleted: false,
		} as any)
		const queue = makeFakeQueue()
		const env = makeEnv({
			THUMBNAILS: makeFakeThumbnailsBucket(),
			ROOMS: makeFakeRoomsBucket('room-etag-1'),
			QUEUE: queue,
		})

		await getOgImage(makeRequest('f', 'file-1'), env)

		expect(queue.send).not.toHaveBeenCalled()
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

	// The lifetime is short and revalidation is cheap on purpose. Nothing deletes a board's image when
	// it stops being public, so this route re-checking the share gate is the only thing keeping an
	// unshared board's thumbnail off the internet — and a cache serving without asking is that check not
	// happening. `stale-while-revalidate` is absent for the same reason: it would extend serving a day
	// past expiry.
	it('serves a fresh hit with a short lifetime and an etag, and no stale-while-revalidate', async () => {
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
		const env = makeEnv({ THUMBNAILS: bucket, QUEUE: makeFakeQueue() })

		const response = await getOgImage(makeRequest('p', 'cached-board'), env)

		expect(response.headers.get('cache-control')).toBe('public, max-age=300')
		expect(response.headers.get('etag')).toBe('"etag-1"')
	})

	it('answers a conditional request whose etag still matches with a 304 and no body', async () => {
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
		const env = makeEnv({ THUMBNAILS: bucket, QUEUE: makeFakeQueue() })

		const response = await getOgImage(
			makeRequest('p', 'cached-board', 'GET', { 'if-none-match': '"etag-1"' }),
			env
		)

		expect(response.status).toBe(304)
		expect(await response.text()).toBe('')
		// The headers still refresh what the caller holds, so the next revalidation is a whole lifetime
		// away rather than immediate.
		expect(response.headers.get('cache-control')).toBe('public, max-age=300')
		expect(response.headers.get('etag')).toBe('"etag-1"')
		expect(response.headers.get('x-tldraw-og-cache')).toBe('hit')
	})

	// The bytes are read lazily on a conditional request, so a render landing since the caller cached
	// has to be noticed and served rather than answered with a 304 for content that has moved.
	it('serves the new bytes when a conditional request holds a superseded etag', async () => {
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 2,
		})
		const bucket = makeFakeThumbnailsBucket()
		const key = getOgImageCacheKey({ kind: 'published', slug: 'cached-board' })
		await bucket.put(key, new Uint8Array([1, 2, 3]).buffer, {
			customMetadata: { version: '1', createdAt: String(Date.now()) },
		})
		await bucket.put(key, new Uint8Array([4, 5, 6]).buffer, {
			customMetadata: { version: '2', createdAt: String(Date.now()) },
		})
		const env = makeEnv({ THUMBNAILS: bucket, QUEUE: makeFakeQueue() })

		const response = await getOgImage(
			makeRequest('p', 'cached-board', 'GET', { 'if-none-match': '"etag-1"' }),
			env
		)

		expect(response.status).toBe(200)
		expect(await response.arrayBuffer()).toEqual(new Uint8Array([4, 5, 6]).buffer)
		expect(response.headers.get('etag')).toBe('"etag-2"')
		expect(response.headers.get('x-tldraw-og-cache')).toBe('hit')
	})

	// The share gate runs before the etag is ever looked at, so holding a valid etag for a board that
	// has since been unshared buys nothing. This is what the short lifetime is protecting.
	it('sends a conditional request for a board that is no longer shared to the default image', async () => {
		vi.mocked(getSharedFileInfo).mockResolvedValue({
			id: 'file-1',
			shared: false,
			sharedLinkType: 'view',
			isDeleted: false,
		} as any)
		const bucket = makeFakeThumbnailsBucket()
		await bucket.put(
			getOgImageCacheKey({ kind: 'shared_file', slug: 'file-1' }),
			new Uint8Array([1, 2, 3]).buffer,
			{ customMetadata: { version: 'room-etag-1', createdAt: String(Date.now()) } }
		)
		const env = makeEnv({
			THUMBNAILS: bucket,
			ROOMS: makeFakeRoomsBucket('room-etag-1'),
			QUEUE: makeFakeQueue(),
		})

		const response = await getOgImage(
			makeRequest('f', 'file-1', 'GET', { 'if-none-match': '"etag-1"' }),
			env
		)

		expect(response.status).toBe(302)
		expect(response.headers.get('location')).toBe('https://www.tldraw.com/social-og.png')
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
			expect(stale.headers.get('cache-control')).toBe('public, max-age=300')
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
		// Including the repair ask: some crawlers only ever probe with HEAD, and a published board with
		// no image has nothing else that will ask for one.
		expect(queue.send).toHaveBeenCalledTimes(1)
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
