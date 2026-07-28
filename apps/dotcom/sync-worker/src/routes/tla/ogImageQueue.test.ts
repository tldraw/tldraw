import { afterEach, describe, expect, it, vi } from 'vitest'
import { OgImageRenderQueueMessage } from '../../types'
import { verifyThumbnailRenderToken } from '../../utils/renderTokens'
import { getPublishedFileInfo, getPublishedRoomSnapshot } from './getPublishedFile'
import { getSharedFileInfo, getSharedFileRoomSnapshot } from './getSharedFile'
import {
	deleteOgImageCache,
	enqueueOgImageRender,
	enqueueOgImageRenderForEdit,
	getOgImageCacheKey,
	handleOgImageRenderMessage,
} from './ogImageQueue'
import {
	blobsWithPrefix,
	failureBlobsOf,
	makeBrowserBinding,
	makeFakeRoomsBucket,
	makeFakeThumbnailsBucket,
	makeScreenshotTestEnv as makeEnv,
	makeSnapshot,
	screenshotOf,
	tokenFromScreenshot,
} from './screenshotTestHelpers'
import { resetRateLimitFallbackForTests } from './thumbnailRender'

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
	vi.useRealTimers()
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
			reason: 'crawler',
		})
	})

	it('reports unavailable when the thumbnails bucket is not configured', async () => {
		const env = makeEnv({ THUMBNAILS: undefined })
		expect(await enqueueOgImageRender(env, { kind: 'published', slug: 'board' })).toBe(
			'unavailable'
		)
	})

	it('tags the message with the trigger that asked for the render', async () => {
		const env = makeEnv({ THUMBNAILS: makeFakeThumbnailsBucket() })

		await enqueueOgImageRender(env, { kind: 'published', slug: 'board' }, { reason: 'publish' })

		expect((env as any).QUEUE.send).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ reason: 'publish' })
		)
	})

	// With no rate limiter left, the marker is the only thing keeping an 8-second persist cadence from
	// becoming an 8-second render cadence, so its TTL is load-bearing rather than incidental.
	it('suppresses duplicate enqueues for the marker TTL, then allows one through', async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
		const bucket = makeFakeThumbnailsBucket()
		const env = makeEnv({ THUMBNAILS: bucket })

		expect(await enqueueOgImageRender(env, { kind: 'shared_file', slug: 'board' })).toBe('enqueued')

		const marker = [...bucket.store.entries()].find(([key]) => key.endsWith('.pending'))!
		expect(Number(marker[1].customMetadata!.expiresAt)).toBe(
			Date.parse('2026-01-01T00:00:00Z') + 2 * 60_000
		)

		// Every persist inside the window asks again and is deduped away.
		vi.setSystemTime(new Date('2026-01-01T00:01:59Z'))
		expect(await enqueueOgImageRender(env, { kind: 'shared_file', slug: 'board' })).toBe(
			'already_pending'
		)

		// Once it lapses, the next edit gets a fresh render.
		vi.setSystemTime(new Date('2026-01-01T00:02:01Z'))
		expect(await enqueueOgImageRender(env, { kind: 'shared_file', slug: 'board' })).toBe('enqueued')
	})
})

describe('enqueueOgImageRenderForEdit', () => {
	const board = { kind: 'shared_file', slug: 'board' } as const

	// Unconditional by design: a persist means the saved content genuinely differs from what the
	// cached thumbnail shows, so there is no sampling or staleness window to satisfy first.
	it('enqueues on every edit, with no sampling or staleness gate', async () => {
		const env = makeEnv({ THUMBNAILS: makeFakeThumbnailsBucket() })

		expect(await enqueueOgImageRenderForEdit(env, board, { isShared: true })).toBe('enqueued')
		expect((env as any).QUEUE.send).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ kind: 'shared_file', slug: 'board', reason: 'edit' })
		)
	})

	// A freshly rendered thumbnail is no reason to skip: the board changed again, so the cached image
	// is stale regardless of its age. The consumer's version check is what avoids redundant renders.
	it('enqueues even when the cached image was rendered moments ago', async () => {
		const bucket = makeFakeThumbnailsBucket()
		const env = makeEnv({ THUMBNAILS: bucket })
		await bucket.put(getOgImageCacheKey(board), new Uint8Array([1]).buffer, {
			customMetadata: { version: 'v1', createdAt: String(Date.now()) },
		})

		expect(await enqueueOgImageRenderForEdit(env, board, { isShared: true })).toBe('enqueued')
	})

	it('skips a board that is not shared', async () => {
		const env = makeEnv({ THUMBNAILS: makeFakeThumbnailsBucket() })

		expect(await enqueueOgImageRenderForEdit(env, board, { isShared: false })).toBe(
			'skipped_not_shared'
		)
		expect((env as any).QUEUE.send).not.toHaveBeenCalled()
	})

	// The durable object doesn't always have the file record in hand. Guessing "private" would silently
	// drop coverage; the consumer re-resolves the board and drops it there if it isn't public.
	it('goes ahead when the share state is unknown', async () => {
		const env = makeEnv({ THUMBNAILS: makeFakeThumbnailsBucket() })

		expect(await enqueueOgImageRenderForEdit(env, board, { isShared: undefined })).toBe('enqueued')
	})
})

describe('deleteOgImageCache', () => {
	it('drops the cached image and the pending marker so a reshare can render again', async () => {
		const bucket = makeFakeThumbnailsBucket()
		const env = makeEnv({ THUMBNAILS: bucket })
		await enqueueOgImageRender(env, { kind: 'shared_file', slug: 'board' })
		await bucket.put(
			getOgImageCacheKey({ kind: 'shared_file', slug: 'board' }),
			new Uint8Array([1]).buffer
		)

		await deleteOgImageCache(env, { kind: 'shared_file', slug: 'board' })

		expect([...bucket.store.keys()]).toEqual([])
		// With the marker gone, the next enqueue is not deduped away.
		expect(await enqueueOgImageRender(env, { kind: 'shared_file', slug: 'board' })).toBe('enqueued')
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

	// Thumbnail rendering is uncapped: the MCP endpoint's limiters exist to bound what an outside
	// caller can spend, and this consumer is not caller-driven. A saturated MCP limiter must not stop a
	// board's own thumbnail refreshing.
	it('renders even when the MCP rate limiters are saturated, and never consults them', async () => {
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1,
		})
		vi.mocked(getPublishedRoomSnapshot).mockResolvedValue(makeOnePageSnapshot())
		const queue = { send: vi.fn(async () => undefined) }
		const browserLimiter = { limit: vi.fn(async () => ({ success: false })) }
		const env = makeEnv({
			THUMBNAILS: makeFakeThumbnailsBucket(),
			QUEUE: queue,
			MCP_SCREENSHOT_BROWSER_RATE_LIMITER: browserLimiter,
		})

		const message = makeMessage({ kind: 'published', slug: 'board', reason: 'edit' })
		await handleOgImageRenderMessage(env, message)

		expect(browserLimiter.limit).not.toHaveBeenCalled()
		expect(screenshotOf(env)).toHaveBeenCalledTimes(1)
		expect(message.ack).toHaveBeenCalledTimes(1)
		expect(message.retry).not.toHaveBeenCalled()
		// No requeue chain: there is no backpressure signal left to requeue for.
		expect(queue.send).not.toHaveBeenCalled()
		expect(failureBlobsOf(env)).toEqual(['failure:none'])
	})

	it('records the trigger that asked for a completed render', async () => {
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1,
		})
		vi.mocked(getPublishedRoomSnapshot).mockResolvedValue(makeOnePageSnapshot())
		const env = makeEnv({ THUMBNAILS: makeFakeThumbnailsBucket() })

		await handleOgImageRenderMessage(
			env,
			makeMessage({ kind: 'published', slug: 'board', reason: 'publish' })
		)

		expect(blobsWithPrefix(env, 'reason:')).toEqual(['reason:publish'])
	})

	// A burst of edits enqueues once and renders once: the marker collapses the enqueues, and for any
	// that slip past it the version check acks without spending Browser Run.
	it('acks without rendering when the cache already matches the version', async () => {
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1,
		})
		vi.mocked(getPublishedRoomSnapshot).mockResolvedValue(makeOnePageSnapshot())
		const bucket = makeFakeThumbnailsBucket()
		const env = makeEnv({ THUMBNAILS: bucket })

		await handleOgImageRenderMessage(env, makeMessage({ kind: 'published', slug: 'board' }))
		expect(screenshotOf(env)).toHaveBeenCalledTimes(1)

		// A second delivery for the same unchanged content renders nothing.
		const duplicate = makeMessage({ kind: 'published', slug: 'board', reason: 'edit' })
		await handleOgImageRenderMessage(env, duplicate)
		expect(screenshotOf(env)).toHaveBeenCalledTimes(1)
		expect(duplicate.ack).toHaveBeenCalledTimes(1)
	})
})
