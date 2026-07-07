import { afterEach, describe, expect, it, vi } from 'vitest'
import { Environment } from '../../types'
import { getOgHtml, getOgImage } from './getOgImage'
import { getPublishedFileInfo } from './getPublishedFile'
import { getSharedFileInfo } from './getSharedFile'
import { getOgImageCacheKey } from './ogImageQueue'

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
		async head(key: string) {
			const value = store.get(key)
			if (!value) return null
			return { customMetadata: value.customMetadata, uploaded: value.uploaded }
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
		async delete(key: string) {
			store.delete(key)
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

function makeFakeQueue() {
	return { send: vi.fn(async (_message: unknown) => undefined) }
}

function makeEnv(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		CLOUDFLARE_ACCOUNT_ID: 'account-id',
		BROWSER_RENDERING_API_TOKEN: 'api-token',
		MCP_SCREENSHOT_RENDER_ORIGIN: 'https://www.tldraw.com',
		MCP_SCREENSHOT_TOKEN_SECRET: 'test-secret',
		MEASURE: { writeDataPoint: vi.fn() },
		QUEUE: makeFakeQueue(),
		...overrides,
	} as unknown as Environment
}

function makeRequest(kind: string, slug: string) {
	return Object.assign(new Request(`https://sync.tldraw.xyz/app/og-image/${kind}/${slug}`), {
		params: { kind, slug },
	}) as any
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
