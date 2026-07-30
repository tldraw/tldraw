import { afterEach, describe, expect, it, vi } from 'vitest'
import { OgImageRenderQueueMessage } from '../../types'
import { verifyThumbnailRenderToken } from '../../utils/renderTokens'
import { getPublishedFileInfo, getPublishedRoomSnapshot } from './getPublishedFile'
import { getSharedFileInfo, getSharedFileRoomSnapshot } from './getSharedFile'
import {
	clearOgImagePendingMarker,
	deleteOgImage,
	enqueueOgImageRender,
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
	renderDurationsOf,
	screenshotOf,
	tokenFromScreenshot,
} from './screenshotTestHelpers'

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

		const board = { kind: 'published', slug: 'board' } as const
		const first = await enqueueOgImageRender(env, board, { reason: 'publish' })
		const second = await enqueueOgImageRender(env, board, { reason: 'publish' })

		expect(first).toBe('enqueued')
		expect(second).toBe('already_pending')
		expect((env as any).QUEUE.send).toHaveBeenCalledExactlyOnceWith({
			type: 'og-image-render',
			kind: 'published',
			slug: 'board',
			reason: 'publish',
		})
	})

	it('reports unavailable when the thumbnails bucket is not configured', async () => {
		const env = makeEnv({ THUMBNAILS: undefined })
		expect(
			await enqueueOgImageRender(env, { kind: 'published', slug: 'board' }, { reason: 'publish' })
		).toBe('unavailable')
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

		const board = { kind: 'shared_file', slug: 'board' } as const
		expect(await enqueueOgImageRender(env, board, { reason: 'edit' })).toBe('enqueued')

		const marker = [...bucket.store.entries()].find(([key]) => key.endsWith('.pending'))!
		expect(Number(marker[1].customMetadata!.expiresAt)).toBe(
			Date.parse('2026-01-01T00:00:00Z') + 2 * 60_000
		)

		// Every persist inside the window asks again and is deduped away.
		vi.setSystemTime(new Date('2026-01-01T00:01:59Z'))
		expect(await enqueueOgImageRender(env, board, { reason: 'edit' })).toBe('already_pending')

		// Once it lapses, the next edit gets a fresh render.
		vi.setSystemTime(new Date('2026-01-01T00:02:01Z'))
		expect(await enqueueOgImageRender(env, board, { reason: 'edit' })).toBe('enqueued')
	})
})

describe('enqueueOgImageRender for an edit', () => {
	const board = { kind: 'shared_file', slug: 'board' } as const

	// Unconditional by design: a persist means the saved content genuinely differs from what the
	// cached thumbnail shows, so there is no sampling or staleness window to satisfy first. The share
	// gate lives in TLFileDurableObject.requestOgRenderForEdit, which decides before calling this.
	it('enqueues on every edit, with no sampling or staleness gate', async () => {
		const env = makeEnv({ THUMBNAILS: makeFakeThumbnailsBucket() })

		expect(await enqueueOgImageRender(env, board, { reason: 'edit' })).toBe('enqueued')
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

		expect(await enqueueOgImageRender(env, board, { reason: 'edit' })).toBe('enqueued')
	})
})

// The two keys are not symmetric on purpose, and this is the pair that pins it.
describe('deleteOgImage vs clearOgImagePendingMarker', () => {
	it("deletes a published board's image, since the snapshot it depicts is gone", async () => {
		const board = { kind: 'published', slug: 'published-slug' } as const
		const bucket = makeFakeThumbnailsBucket()
		const env = makeEnv({ THUMBNAILS: bucket })
		await enqueueOgImageRender(env, board, { reason: 'publish' })
		await bucket.put(getOgImageCacheKey(board), new Uint8Array([1]).buffer)

		await deleteOgImage(env, board)

		expect([...bucket.store.keys()]).toEqual([])
	})

	// Unpublishing must not reach the file-keyed image. That one is the board's own thumbnail, and it
	// is what makes a later reshare an immediate cache hit.
	it('leaves the file-keyed image alone when a published board is unpublished', async () => {
		const published = { kind: 'published', slug: 'published-slug' } as const
		const file = { kind: 'shared_file', slug: 'file-1' } as const
		const bucket = makeFakeThumbnailsBucket()
		const env = makeEnv({ THUMBNAILS: bucket })
		await bucket.put(getOgImageCacheKey(published), new Uint8Array([1]).buffer)
		await bucket.put(getOgImageCacheKey(file), new Uint8Array([2]).buffer)

		await deleteOgImage(env, published)

		expect([...bucket.store.keys()]).toEqual([getOgImageCacheKey(file)])
	})
})

describe('clearOgImagePendingMarker', () => {
	// The rendered image is deliberately kept when a board stops being public. It is unreachable
	// either way — the OG route re-checks the share gate on every request — and keeping it means an
	// owner-facing surface behind authz can use the thumbnail a board already has, instead of it
	// having been thrown away the moment the board went private.
	it('clears the pending marker so a reshare can render again, and keeps the image', async () => {
		const board = { kind: 'shared_file', slug: 'board' } as const
		const bucket = makeFakeThumbnailsBucket()
		const env = makeEnv({ THUMBNAILS: bucket })
		await enqueueOgImageRender(env, board, { reason: 'edit' })
		await bucket.put(getOgImageCacheKey(board), new Uint8Array([1]).buffer)

		await clearOgImagePendingMarker(env, board)

		expect([...bucket.store.keys()]).toEqual([getOgImageCacheKey(board)])
		// With the marker gone, the next enqueue is not deduped away.
		expect(await enqueueOgImageRender(env, board, { reason: 'edit' })).toBe('enqueued')
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

		// The final delivery, so the job drops rather than retrying again.
		vi.mocked(getPublishedRoomSnapshot).mockRejectedValueOnce(new Error('connection terminated'))
		const finalAttempt = makeMessage({ kind: 'published', slug: 'board' }, 3)
		await handleOgImageRenderMessage(env, finalAttempt)
		expect(screenshotOf(env)).not.toHaveBeenCalled()
		expect(finalAttempt.ack).toHaveBeenCalledTimes(1)
		// One row per delivery, not per job: the dataset is the spend ledger, so a retried failure is
		// two events, not one. Neither of these spent Browser Run, but a retried *render* would spend
		// it twice, and only per-delivery rows can show that.
		expect(failureBlobsOf(env)).toEqual([
			'failure:snapshot_read_error',
			'failure:snapshot_read_error',
		])
	})

	// A read failure mid-render is transient as far as this handler can tell, so the delivery retries.
	// The retry re-resolves and renders, because a board going private is not a reason to skip it.
	it('retries a read failure, then renders on the retry even if the board went private', async () => {
		vi.mocked(getSharedFileInfo).mockResolvedValue({
			id: 'shared-file',
			shared: true,
			isDeleted: false,
		})
		vi.mocked(getSharedFileRoomSnapshot).mockRejectedValueOnce(new Error('postgres is down'))
		const bucket = makeFakeThumbnailsBucket()
		const cacheKey = getOgImageCacheKey({ kind: 'shared_file', slug: 'shared-file' })
		const env = makeEnv({ ROOMS: makeFakeRoomsBucket('etag-1'), THUMBNAILS: bucket })

		const first = makeMessage({ kind: 'shared_file', slug: 'shared-file' }, 1)
		await handleOgImageRenderMessage(env, first)

		expect(first.retry).toHaveBeenCalledExactlyOnceWith({ delaySeconds: 30 })
		expect(screenshotOf(env)).not.toHaveBeenCalled()

		// The board is private by the time the retry lands. It renders anyway — privacy gates serving,
		// not rendering, so an owner-facing surface has a current thumbnail to show.
		vi.mocked(getSharedFileInfo).mockResolvedValue({
			id: 'shared-file',
			shared: false,
			isDeleted: false,
		})
		vi.mocked(getSharedFileRoomSnapshot).mockResolvedValue(makeOnePageSnapshot())
		const retry = makeMessage({ kind: 'shared_file', slug: 'shared-file' }, 2)
		await handleOgImageRenderMessage(env, retry)

		expect(screenshotOf(env)).toHaveBeenCalledTimes(1)
		expect(retry.ack).toHaveBeenCalledTimes(1)
		expect(bucket.store.has(cacheKey)).toBe(true)
		expect(failureBlobsOf(env)).toEqual(['failure:snapshot_read_error', 'failure:none'])
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

	// Deletion is terminal in a way privacy is not: no number of retries brings the board back, and a
	// deleted board has nothing worth depicting. The job is acked without spending Browser Run, and the
	// image it already had is kept, since only an unpublish deletes one.
	it('drops the job without rendering when the board is deleted, keeping its image', async () => {
		vi.mocked(getSharedFileInfo).mockResolvedValue({
			id: 'deleted-file',
			shared: false,
			isDeleted: true,
		})
		const board = { kind: 'shared_file', slug: 'deleted-file' } as const
		const bucket = makeFakeThumbnailsBucket()
		const cacheKey = getOgImageCacheKey(board)
		await bucket.put(cacheKey, new Uint8Array([9]).buffer, {
			customMetadata: { version: 'old', createdAt: String(Date.now()) },
		})
		// A marker from the enqueue that raced the unshare; it must not outlive the dropped job, or the
		// next reshare's enqueue is deduped away against a render that never happened.
		await enqueueOgImageRender(makeEnv({ THUMBNAILS: bucket }), board, { reason: 'edit' })
		const env = makeEnv({ ROOMS: makeFakeRoomsBucket(), THUMBNAILS: bucket })
		const message = makeMessage(board)

		await handleOgImageRenderMessage(env, message)

		expect(screenshotOf(env)).not.toHaveBeenCalled()
		expect(bucket.store.has(cacheKey)).toBe(true)
		expect([...bucket.store.keys()]).toEqual([cacheKey])
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

	// A board that fails deterministically fails every attempt, so reporting each delivery filed three
	// events for one problem. The delivery that gives up is the one worth seeing, and it is already the
	// only one that reaches telemetry. Tests pass no ExecutionContext, so reporting logs instead.
	it('reports a failing render once per job rather than once per delivery', async () => {
		const reported = vi.spyOn(console, 'error').mockImplementation(() => {})
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1,
		})
		vi.mocked(getPublishedRoomSnapshot).mockResolvedValue(makeOnePageSnapshot())
		const env = makeEnv({
			BROWSER: makeBrowserBinding(async () => {
				throw new Error('browser session failed')
			}),
			THUMBNAILS: makeFakeThumbnailsBucket(),
		})

		await handleOgImageRenderMessage(env, makeMessage({ kind: 'published', slug: 'board' }, 1))
		await handleOgImageRenderMessage(env, makeMessage({ kind: 'published', slug: 'board' }, 2))
		expect(reported).not.toHaveBeenCalled()

		await handleOgImageRenderMessage(env, makeMessage({ kind: 'published', slug: 'board' }, 3))
		expect(reported).toHaveBeenCalledTimes(1)
		// No board identity in the report at all — not the slug, not a derived id. For a link-shared
		// file the slug is the file id, and tldraw.com/f/<id> is the capability to view the board.
		const context = reported.mock.calls[0]![1]
		expect(context).toEqual({ kind: 'published', attempts: 3 })
		expect(JSON.stringify(context)).not.toContain('board')
	})

	// Browser Run answers 422 for a crashed page, an out-of-memory render and every one of its timers
	// alike, so the reason code has to come from the response body. Classify on the status alone and
	// every timeout files as `browser_failed`, leaving the dashboard's timeout rate structurally zero.
	it('classifies a Browser Run timeout from the response body, not the status', async () => {
		const reported = vi.spyOn(console, 'error').mockImplementation(() => {})
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1,
		})
		vi.mocked(getPublishedRoomSnapshot).mockResolvedValue(makeOnePageSnapshot())
		const env = makeEnv({
			BROWSER: makeBrowserBinding(
				async () =>
					new Response(
						JSON.stringify({
							success: false,
							errors: [{ code: 500, message: 'Navigation timeout of 45000 ms exceeded' }],
						}),
						{ status: 422 }
					)
			),
			THUMBNAILS: makeFakeThumbnailsBucket(),
		})

		await handleOgImageRenderMessage(env, makeMessage({ kind: 'published', slug: 'board' }, 3))

		expect(failureBlobsOf(env)).toEqual(['failure:browser_timeout'])
		// The unbounded original goes to Sentry, where the cardinality that keeps it out of the blob
		// doesn't matter and it is the only thing that says what actually went wrong.
		expect(reported.mock.calls[0]![1]).toMatchObject({
			browser_render_status: 422,
			browser_render_detail: 'Navigation timeout of 45000 ms exceeded',
		})
	})

	// The same 422 with a different cause: the render page marked data-thumbnail-error, so the
	// success-only capture selector was absent and the call came back early.
	it('classifies an early 422 as a render failure', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {})
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1,
		})
		vi.mocked(getPublishedRoomSnapshot).mockResolvedValue(makeOnePageSnapshot())
		const env = makeEnv({
			BROWSER: makeBrowserBinding(
				async () =>
					new Response('Element not found: body[data-thumbnail-ready="true"]', { status: 422 })
			),
			THUMBNAILS: makeFakeThumbnailsBucket(),
		})

		await handleOgImageRenderMessage(env, makeMessage({ kind: 'published', slug: 'board' }, 3))

		expect(failureBlobsOf(env)).toEqual(['failure:browser_failed'])
	})

	// A failed capture created a browser and held it, sometimes for the whole 45s timeout. Recording -1
	// there would understate what an uncapped render path costs, which is the one number the "no global
	// cap" design leans on watching.
	it('records the Browser Run time a failed render spent, and none where it spent none', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {})
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1,
		})
		vi.mocked(getPublishedRoomSnapshot).mockResolvedValue(makeOnePageSnapshot())
		const env = makeEnv({
			BROWSER: makeBrowserBinding(async () => new Response('boom', { status: 422 })),
			THUMBNAILS: makeFakeThumbnailsBucket(),
		})

		await handleOgImageRenderMessage(env, makeMessage({ kind: 'published', slug: 'board' }, 3))
		expect(renderDurationsOf(env)[0]).toBeGreaterThanOrEqual(0)

		// An empty board never reaches the capture, so it keeps the "spent nothing" sentinel.
		vi.mocked(getPublishedRoomSnapshot).mockResolvedValue(null as any)
		const emptyBoardEnv = makeEnv({ THUMBNAILS: makeFakeThumbnailsBucket() })
		await handleOgImageRenderMessage(
			emptyBoardEnv,
			makeMessage({ kind: 'published', slug: 'board' }, 3)
		)
		expect(failureBlobsOf(emptyBoardEnv)).toEqual(['failure:board_empty'])
		expect(renderDurationsOf(emptyBoardEnv)).toEqual([-1])
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
