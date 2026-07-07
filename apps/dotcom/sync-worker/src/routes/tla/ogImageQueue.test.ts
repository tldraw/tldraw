import { afterEach, describe, expect, it, vi } from 'vitest'
import { Environment, OgImageRenderQueueMessage } from '../../types'
import { verifyThumbnailRenderToken } from '../../utils/renderTokens'
import { getPublishedFileInfo } from './getPublishedFile'
import { getSharedFileInfo } from './getSharedFile'
import {
	enqueueOgImageRender,
	getOgImageCacheKey,
	handleOgImageRenderMessage,
} from './ogImageQueue'

vi.mock('./getPublishedFile', () => ({
	getPublishedFileInfo: vi.fn(),
}))

vi.mock('./getSharedFile', async (importOriginal) => ({
	...(await importOriginal<typeof import('./getSharedFile')>()),
	getSharedFileInfo: vi.fn(),
}))

afterEach(() => {
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

function makeEnv(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		CLOUDFLARE_ACCOUNT_ID: 'account-id',
		BROWSER_RENDERING_API_TOKEN: 'api-token',
		MCP_SCREENSHOT_RENDER_ORIGIN: 'https://www.tldraw.com',
		MCP_SCREENSHOT_TOKEN_SECRET: 'test-secret',
		MEASURE: { writeDataPoint: vi.fn() },
		QUEUE: { send: vi.fn(async () => undefined) },
		...overrides,
	} as unknown as Environment
}

function makeMessage(
	body: Omit<OgImageRenderQueueMessage, 'type'>,
	attempts = 1
): Message<OgImageRenderQueueMessage> & { ack: ReturnType<typeof vi.fn> } {
	return {
		body: { type: 'og-image-render', ...body },
		attempts,
		ack: vi.fn(),
		retry: vi.fn(),
	} as any
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

describe('enqueueOgImageRender', () => {
	it('sends one queue message and dedupes repeat enqueues behind a pending marker', async () => {
		const bucket = makeFakeThumbnailsBucket()
		const env = makeEnv({ THUMBNAILS: bucket })

		const first = await enqueueOgImageRender(env, { kind: 'published', slug: 'board' })
		const second = await enqueueOgImageRender(env, { kind: 'published', slug: 'board' })

		expect(first).toBe('enqueued')
		expect(second).toBe('already_pending')
		expect((env as any).QUEUE.send).toHaveBeenCalledExactlyOnceWith({
			type: 'og-image-render',
			kind: 'published',
			slug: 'board',
		})
	})

	it('reports unavailable when the thumbnails bucket is not configured', async () => {
		const env = makeEnv({ THUMBNAILS: undefined })
		expect(await enqueueOgImageRender(env, { kind: 'published', slug: 'board' })).toBe(
			'unavailable'
		)
	})
})

describe('handleOgImageRenderMessage', () => {
	it('renders a published board with a content-fit token and refreshes the cache', async () => {
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1751234567890,
		})
		const fetch = stubBrowserRunFetch()
		const bucket = makeFakeThumbnailsBucket()
		const env = makeEnv({ THUMBNAILS: bucket })
		const message = makeMessage({ kind: 'published', slug: 'published-board' })

		await handleOgImageRenderMessage(env, message)

		expect(message.ack).toHaveBeenCalledTimes(1)
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
			bucket.store.get(getOgImageCacheKey({ kind: 'published', slug: 'published-board' }))
				?.customMetadata
		).toEqual({
			version: '1751234567890',
			createdAt: expect.any(String),
		})
	})

	it('renders shared files and keys their version on the room etag', async () => {
		vi.mocked(getSharedFileInfo).mockResolvedValue({
			id: 'shared-file',
			shared: true,
			isDeleted: false,
		})
		const fetch = stubBrowserRunFetch()
		const bucket = makeFakeThumbnailsBucket()
		const env = makeEnv({ ROOMS: makeFakeRoomsBucket('etag-1'), THUMBNAILS: bucket })
		const message = makeMessage({ kind: 'shared_file', slug: 'shared-file' })

		await handleOgImageRenderMessage(env, message)

		expect(message.ack).toHaveBeenCalledTimes(1)
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
		expect(
			bucket.store.get(getOgImageCacheKey({ kind: 'shared_file', slug: 'shared-file' }))
				?.customMetadata?.version
		).toBe('etag-1')
	})

	it('skips rendering when the cached image already matches the current version', async () => {
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 7,
		})
		const fetch = vi.fn()
		vi.stubGlobal('fetch', fetch)
		const bucket = makeFakeThumbnailsBucket()
		await bucket.put(
			getOgImageCacheKey({ kind: 'published', slug: 'board' }),
			new Uint8Array([9]).buffer,
			{ customMetadata: { version: '7', createdAt: String(Date.now()) } }
		)
		const env = makeEnv({ THUMBNAILS: bucket })
		const message = makeMessage({ kind: 'published', slug: 'board' })

		await handleOgImageRenderMessage(env, message)

		expect(fetch).not.toHaveBeenCalled()
		expect(message.ack).toHaveBeenCalledTimes(1)
	})

	it('drops the job and deletes the cached image when the board is no longer viewable', async () => {
		vi.mocked(getSharedFileInfo).mockResolvedValue({
			id: 'unshared-file',
			shared: false,
			isDeleted: false,
		})
		const fetch = vi.fn()
		vi.stubGlobal('fetch', fetch)
		const bucket = makeFakeThumbnailsBucket()
		const cacheKey = getOgImageCacheKey({ kind: 'shared_file', slug: 'unshared-file' })
		await bucket.put(cacheKey, new Uint8Array([9]).buffer, {
			customMetadata: { version: 'old', createdAt: String(Date.now()) },
		})
		const env = makeEnv({ ROOMS: makeFakeRoomsBucket(), THUMBNAILS: bucket })
		const message = makeMessage({ kind: 'shared_file', slug: 'unshared-file' })

		await handleOgImageRenderMessage(env, message)

		expect(fetch).not.toHaveBeenCalled()
		expect(bucket.store.has(cacheKey)).toBe(false)
		expect(message.ack).toHaveBeenCalledTimes(1)
		expect(message.retry).not.toHaveBeenCalled()
	})

	it('retries transient failures and drops the job after the attempt cap', async () => {
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1,
		})
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('nope', { status: 500 }))
		)
		const env = makeEnv({ THUMBNAILS: makeFakeThumbnailsBucket() })

		const firstAttempt = makeMessage({ kind: 'published', slug: 'board' }, 1)
		await handleOgImageRenderMessage(env, firstAttempt)
		expect(firstAttempt.retry).toHaveBeenCalledExactlyOnceWith({ delaySeconds: 30 })
		expect(firstAttempt.ack).not.toHaveBeenCalled()

		const finalAttempt = makeMessage({ kind: 'published', slug: 'board' }, 3)
		await handleOgImageRenderMessage(env, finalAttempt)
		expect(finalAttempt.retry).not.toHaveBeenCalled()
		expect(finalAttempt.ack).toHaveBeenCalledTimes(1)
	})
})
