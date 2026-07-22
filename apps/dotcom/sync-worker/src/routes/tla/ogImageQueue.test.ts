import { afterEach, describe, expect, it, vi } from 'vitest'
import { OgImageRenderQueueMessage } from '../../types'
import { verifyThumbnailRenderToken } from '../../utils/renderTokens'
import { getPublishedFileInfo, getPublishedRoomSnapshot } from './getPublishedFile'
import { getSharedFileInfo, getSharedFileRoomSnapshot } from './getSharedFile'
import {
	enqueueOgImageRender,
	getOgImageCacheKey,
	handleOgImageRenderMessage,
	MAX_RATE_LIMIT_REQUEUES,
} from './ogImageQueue'
import {
	failureBlobsOf,
	makeBrowserBinding,
	makeFakeRoomsBucket,
	makeFakeThumbnailsBucket,
	makeScreenshotTestEnv as makeEnv,
	screenshotOf,
	tokenFromScreenshot,
} from './screenshotTestHelpers'
import { resetRateLimitFallbackForTests } from './sharedBoardScreenshotMcp'

vi.mock('./getPublishedFile', () => ({
	getPublishedFileInfo: vi.fn(),
	getPublishedRoomSnapshot: vi.fn(),
}))

vi.mock('./getSharedFile', async (importOriginal) => ({
	...(await importOriginal<typeof import('./getSharedFile')>()),
	getSharedFileInfo: vi.fn(),
	getSharedFileRoomSnapshot: vi.fn(),
}))

afterEach(() => {
	vi.unstubAllGlobals()
	vi.clearAllMocks()
	resetRateLimitFallbackForTests()
})

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

// Builds a room snapshot with the given pages and per-page shape counts. Shapes are parented
// directly to their page, which is what enumerateBoardPages checks for "has content".
function makeSnapshot(pages: Array<{ id: string; index: string; shapes: number }>) {
	const documents: Array<{ state: any }> = []
	for (const page of pages) {
		documents.push({ state: { typeName: 'page', id: page.id, index: page.index } })
		for (let i = 0; i < page.shapes; i++) {
			documents.push({
				state: { typeName: 'shape', id: `shape:${page.id}-${i}`, parentId: page.id },
			})
		}
	}
	return { documents, schema: { schemaVersion: 2, sequences: {} } } as any
}

// A minimal readable board. Rendering now requires a loadable snapshot, so tests that only care
// about the surrounding behaviour still need one.
function makeOnePageSnapshot() {
	return makeSnapshot([{ id: 'page:main', index: 'a1', shapes: 1 }])
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
		vi.mocked(getPublishedRoomSnapshot).mockResolvedValue(makeOnePageSnapshot())
		const bucket = makeFakeThumbnailsBucket()
		const env = makeEnv({ THUMBNAILS: bucket })
		const message = makeMessage({ kind: 'published', slug: 'published-board' })

		await handleOgImageRenderMessage(env, message)

		expect(message.ack).toHaveBeenCalledTimes(1)
		const job = await verifyThumbnailRenderToken(env, tokenFromScreenshot(env))
		expect(job).toMatchObject({
			kind: 'published',
			slug: 'published-board',
			version: 1751234567890,
			camera: 'content',
			width: 1200,
			height: 630,
		})
		// the worker writes the rendered image to the cache key itself, stamping the version
		expect(
			bucket.store.get(getOgImageCacheKey({ kind: 'published', slug: 'published-board' }))
				?.customMetadata
		).toEqual({
			version: '1751234567890',
			createdAt: expect.any(String),
		})
	})

	it('targets the first page that has content when the first page is empty', async () => {
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 42,
		})
		vi.mocked(getPublishedRoomSnapshot).mockResolvedValue(
			makeSnapshot([
				{ id: 'page:empty', index: 'a1', shapes: 0 },
				{ id: 'page:full', index: 'a2', shapes: 3 },
			])
		)
		const env = makeEnv({ THUMBNAILS: makeFakeThumbnailsBucket() })
		const message = makeMessage({ kind: 'published', slug: 'board' })

		await handleOgImageRenderMessage(env, message)

		const job = await verifyThumbnailRenderToken(env, tokenFromScreenshot(env))
		expect(job).toMatchObject({ pageId: 'page:full' })
	})

	// The render page reads the snapshot through the same functions, so a board with no persisted
	// content here has none there either — the capture would 404 and come back as a render failure
	// having spent a Browser Run slot to learn it. Fail before the render instead, and let the
	// ordinary retry budget cover content that lands shortly after the enqueue.
	it('gives up without spending browser capacity when the board has no persisted content', async () => {
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 42,
		})
		// clearAllMocks resets call history but not mockResolvedValue, so clear a snapshot another test
		// may have set; a board with nothing persisted makes loadBoardSnapshot yield null.
		vi.mocked(getPublishedRoomSnapshot).mockResolvedValue(undefined as any)
		const env = makeEnv({ THUMBNAILS: makeFakeThumbnailsBucket() })

		const firstAttempt = makeMessage({ kind: 'published', slug: 'board' }, 1)
		await handleOgImageRenderMessage(env, firstAttempt)
		expect(screenshotOf(env)).not.toHaveBeenCalled()
		expect(firstAttempt.retry).toHaveBeenCalledExactlyOnceWith({ delaySeconds: 30 })
		expect(firstAttempt.ack).not.toHaveBeenCalled()

		// Still no capture once the retry budget is spent; the job is dropped, not rendered.
		const finalAttempt = makeMessage({ kind: 'published', slug: 'board' }, 3)
		await handleOgImageRenderMessage(env, finalAttempt)
		expect(screenshotOf(env)).not.toHaveBeenCalled()
		expect(finalAttempt.retry).not.toHaveBeenCalled()
		expect(finalAttempt.ack).toHaveBeenCalledTimes(1)
	})

	// A read that fails is a different thing from a board with nothing in it. It still skips the
	// render (the render page reads the same source and would fail the same way), but it must not be
	// filed under `board_empty`: that reads as "this board is blank" and buries a Postgres or R2
	// outage behind a reason code that invites no investigation. It retries, since the read may
	// recover, and drops with its own reason code once the budget is spent.
	it('retries a failed snapshot read and records it as a read failure, not an empty board', async () => {
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 42,
		})
		// `Once` per delivery, so the rejection can't leak into later tests (clearAllMocks resets call
		// history, not implementations).
		vi.mocked(getPublishedRoomSnapshot).mockRejectedValueOnce(new Error('connection terminated'))
		const env = makeEnv({ THUMBNAILS: makeFakeThumbnailsBucket() })

		const firstAttempt = makeMessage({ kind: 'published', slug: 'board' }, 1)
		await handleOgImageRenderMessage(env, firstAttempt)
		expect(screenshotOf(env)).not.toHaveBeenCalled()
		expect(firstAttempt.retry).toHaveBeenCalledExactlyOnceWith({ delaySeconds: 30 })
		expect(firstAttempt.ack).not.toHaveBeenCalled()

		// The final delivery, so the job drops and writes its reason code instead of only retrying.
		vi.mocked(getPublishedRoomSnapshot).mockRejectedValueOnce(new Error('connection terminated'))
		const finalAttempt = makeMessage({ kind: 'published', slug: 'board' }, 3)
		await handleOgImageRenderMessage(env, finalAttempt)
		expect(screenshotOf(env)).not.toHaveBeenCalled()
		expect(finalAttempt.ack).toHaveBeenCalledTimes(1)
		expect(failureBlobsOf(env)).toEqual(['failure:snapshot_read_error'])
	})

	// A board un-shared between the resolve and the snapshot read looks like any other read failure
	// from the catch, so this delivery retries rather than dropping. That costs one delivery, not one
	// render: the retry re-resolves at the top of the handler, finds the board no longer viewable, and
	// drops it there — neither pass spends any Browser Run.
	it('retries a board that goes private mid-render, then drops it when the retry re-resolves', async () => {
		vi.mocked(getSharedFileInfo).mockResolvedValue({
			id: 'shared-file',
			shared: true,
			isDeleted: false,
		})
		vi.mocked(getSharedFileRoomSnapshot).mockRejectedValueOnce(new Error('not shared'))
		const bucket = makeFakeThumbnailsBucket()
		const cacheKey = getOgImageCacheKey({ kind: 'shared_file', slug: 'shared-file' })
		bucket.store.set(cacheKey, { body: new ArrayBuffer(1), uploaded: new Date(0) })
		const env = makeEnv({ ROOMS: makeFakeRoomsBucket('etag-1'), THUMBNAILS: bucket })

		// The first delivery, which has two retries left.
		const first = makeMessage({ kind: 'shared_file', slug: 'shared-file' }, 1)
		await handleOgImageRenderMessage(env, first)

		expect(first.retry).toHaveBeenCalledExactlyOnceWith({ delaySeconds: 30 })
		expect(screenshotOf(env)).not.toHaveBeenCalled()

		// By the time the retry lands, the board is un-shared, so the resolve gate ends it.
		vi.mocked(getSharedFileInfo).mockResolvedValue({
			id: 'shared-file',
			shared: false,
			isDeleted: false,
		})
		const retry = makeMessage({ kind: 'shared_file', slug: 'shared-file' }, 2)
		await handleOgImageRenderMessage(env, retry)

		expect(retry.retry).not.toHaveBeenCalled()
		expect(retry.ack).toHaveBeenCalledTimes(1)
		expect(screenshotOf(env)).not.toHaveBeenCalled()
		// The cached image is dropped too, so no-longer-public content does not linger in the cache.
		expect(bucket.store.has(cacheKey)).toBe(false)
		expect(failureBlobsOf(env)).toEqual(['failure:board_not_viewable'])
	})

	it('renders shared files and keys their version on the room etag', async () => {
		vi.mocked(getSharedFileInfo).mockResolvedValue({
			id: 'shared-file',
			shared: true,
			isDeleted: false,
		})
		vi.mocked(getSharedFileRoomSnapshot).mockResolvedValue(makeOnePageSnapshot())
		const bucket = makeFakeThumbnailsBucket()
		const env = makeEnv({ ROOMS: makeFakeRoomsBucket('etag-1'), THUMBNAILS: bucket })
		const message = makeMessage({ kind: 'shared_file', slug: 'shared-file' })

		await handleOgImageRenderMessage(env, message)

		expect(message.ack).toHaveBeenCalledTimes(1)
		const job = await verifyThumbnailRenderToken(env, tokenFromScreenshot(env))
		expect(job).toMatchObject({
			kind: 'shared_file',
			slug: 'shared-file',
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
		const bucket = makeFakeThumbnailsBucket()
		await bucket.put(
			getOgImageCacheKey({ kind: 'published', slug: 'board' }),
			new Uint8Array([9]).buffer,
			{ customMetadata: { version: '7', createdAt: String(Date.now()) } }
		)
		const env = makeEnv({ THUMBNAILS: bucket })
		const message = makeMessage({ kind: 'published', slug: 'board' })

		await handleOgImageRenderMessage(env, message)

		expect(screenshotOf(env)).not.toHaveBeenCalled()
		expect(message.ack).toHaveBeenCalledTimes(1)
	})

	it('drops the job and deletes the cached image when the board is no longer viewable', async () => {
		vi.mocked(getSharedFileInfo).mockResolvedValue({
			id: 'unshared-file',
			shared: false,
			isDeleted: false,
		})
		const bucket = makeFakeThumbnailsBucket()
		const cacheKey = getOgImageCacheKey({ kind: 'shared_file', slug: 'unshared-file' })
		await bucket.put(cacheKey, new Uint8Array([9]).buffer, {
			customMetadata: { version: 'old', createdAt: String(Date.now()) },
		})
		const env = makeEnv({ ROOMS: makeFakeRoomsBucket(), THUMBNAILS: bucket })
		const message = makeMessage({ kind: 'shared_file', slug: 'unshared-file' })

		await handleOgImageRenderMessage(env, message)

		expect(screenshotOf(env)).not.toHaveBeenCalled()
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
		// A readable snapshot, so the failure under test is the browser call itself rather than the
		// earlier snapshot bail.
		vi.mocked(getPublishedRoomSnapshot).mockResolvedValue(makeOnePageSnapshot())
		const env = makeEnv({
			BROWSER: makeBrowserBinding(async () => {
				throw new Error('browser session failed')
			}),
			THUMBNAILS: makeFakeThumbnailsBucket(),
		})

		const firstAttempt = makeMessage({ kind: 'published', slug: 'board' }, 1)
		await handleOgImageRenderMessage(env, firstAttempt)
		expect(firstAttempt.retry).toHaveBeenCalledExactlyOnceWith({ delaySeconds: 30 })
		expect(firstAttempt.ack).not.toHaveBeenCalled()

		const finalAttempt = makeMessage({ kind: 'published', slug: 'board' }, 3)
		await handleOgImageRenderMessage(env, finalAttempt)
		expect(finalAttempt.retry).not.toHaveBeenCalled()
		expect(finalAttempt.ack).toHaveBeenCalledTimes(1)
	})

	it('re-enqueues a fresh job when global capacity is busy instead of spending a failure retry', async () => {
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1,
		})
		const queue = { send: vi.fn(async () => undefined) }
		const env = makeEnv({
			THUMBNAILS: makeFakeThumbnailsBucket(),
			QUEUE: queue,
			// A busy global limiter: every check reports the request blocked.
			MCP_SCREENSHOT_BROWSER_RATE_LIMITER: { limit: vi.fn(async () => ({ success: false })) },
		})

		// Even on the final delivery, backpressure must re-enqueue rather than drop: the render never
		// happened, so it should not count against the render-failure budget. The requeue carries an
		// incremented rate-limit counter so the backoff chain is bounded.
		const message = makeMessage({ kind: 'published', slug: 'board' }, 3)
		await handleOgImageRenderMessage(env, message)

		expect(screenshotOf(env)).not.toHaveBeenCalled()
		expect(message.retry).not.toHaveBeenCalled()
		expect(message.ack).toHaveBeenCalledTimes(1)
		expect(queue.send).toHaveBeenCalledExactlyOnceWith(
			{ type: 'og-image-render', kind: 'published', slug: 'board', rateLimitRequeues: 1 },
			{ delaySeconds: 30 }
		)
	})

	it('backs off exponentially as rate-limit requeues accumulate', async () => {
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1,
		})
		const queue = { send: vi.fn(async () => undefined) }
		const env = makeEnv({
			THUMBNAILS: makeFakeThumbnailsBucket(),
			QUEUE: queue,
			MCP_SCREENSHOT_BROWSER_RATE_LIMITER: { limit: vi.fn(async () => ({ success: false })) },
		})

		// Already re-enqueued twice: this delivery is requeue #3, so the delay is min(30 * 2^2, 120).
		const message = makeMessage({ kind: 'published', slug: 'board', rateLimitRequeues: 2 })
		await handleOgImageRenderMessage(env, message)

		expect(queue.send).toHaveBeenCalledExactlyOnceWith(
			{ type: 'og-image-render', kind: 'published', slug: 'board', rateLimitRequeues: 3 },
			{ delaySeconds: 120 }
		)
	})

	it('stops requeueing once the rate-limit backoff budget is exhausted', async () => {
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1,
		})
		const queue = { send: vi.fn(async () => undefined) }
		const env = makeEnv({
			THUMBNAILS: makeFakeThumbnailsBucket(),
			QUEUE: queue,
			MCP_SCREENSHOT_BROWSER_RATE_LIMITER: { limit: vi.fn(async () => ({ success: false })) },
		})

		// At the cap already: this delivery would be one requeue past the limit, so it gives up rather
		// than looping forever and keeping the shared limiter saturated.
		const message = makeMessage({
			kind: 'published',
			slug: 'board',
			rateLimitRequeues: MAX_RATE_LIMIT_REQUEUES,
		})
		await handleOgImageRenderMessage(env, message)

		expect(queue.send).not.toHaveBeenCalled()
		expect(message.retry).not.toHaveBeenCalled()
		expect(message.ack).toHaveBeenCalledTimes(1)
	})

	it('refreshes the pending marker on requeue so concurrent crawler hits coalesce', async () => {
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1,
		})
		const bucket = makeFakeThumbnailsBucket()
		const queue = { send: vi.fn(async () => undefined) }
		const env = makeEnv({
			THUMBNAILS: bucket,
			QUEUE: queue,
			MCP_SCREENSHOT_BROWSER_RATE_LIMITER: { limit: vi.fn(async () => ({ success: false })) },
		})

		const message = makeMessage({ kind: 'published', slug: 'board' })
		await handleOgImageRenderMessage(env, message)

		// The requeue wrote a fresh pending marker, so a concurrent crawler enqueue dedupes onto this
		// chain instead of spawning a second one.
		queue.send.mockClear()
		const result = await enqueueOgImageRender(env, { kind: 'published', slug: 'board' })
		expect(result).toBe('already_pending')
		expect(queue.send).not.toHaveBeenCalled()
	})
})
