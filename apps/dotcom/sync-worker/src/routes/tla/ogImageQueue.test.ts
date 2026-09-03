import { THUMBNAIL_RENDER_TIMEOUT_MS } from '@tldraw/dotcom-shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	OG_MAX_RENDER_ATTEMPTS,
	OG_PENDING_MARKER_TTL_MS,
	OG_RENDER_DEBOUNCE_MS,
	OG_RENDER_MAX_WAIT_MS,
	OG_REPAIR_COOLDOWN_MS,
	OG_RETRY_DELAY_SECONDS,
} from '../../config'
import { OgImageRenderQueueMessage } from '../../types'
import { verifyThumbnailRenderToken } from '../../utils/renderTokens'
import { getPublishedFileInfo, getPublishedRoomSnapshot } from './getPublishedFile'
import { getSharedFileInfo, getSharedFileRoomSnapshot } from './getSharedFile'
import {
	clearOgImagePendingMarker,
	deleteBoardThumbnails,
	deleteOgImage,
	enqueueOgImageRender,
	enqueuePublishThumbnailRender,
	getOgImageCacheKey,
	handleOgImageRenderMessage,
	isOgImageRepairOnCooldown,
} from './ogImageQueue'
import {
	blobsWithPrefix,
	clusterIndexStoreOf,
	failureBlobsOf,
	makeBrowserBinding,
	makeFakeQueue,
	makeFakeRoomsBucket,
	makeFakeThumbnailsBucket,
	makeScreenshotTestEnv as makeEnv,
	makeSnapshot,
	sessionsOf,
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

		const enqueuedAt = Date.parse('2026-01-01T00:00:00Z')
		const marker = [...bucket.store.entries()].find(([key]) => key.endsWith('.pending'))!
		expect(Number(marker[1].customMetadata!.expiresAt)).toBe(enqueuedAt + OG_PENDING_MARKER_TTL_MS)

		// Every persist inside the window asks again and is deduped away.
		vi.setSystemTime(enqueuedAt + OG_PENDING_MARKER_TTL_MS - 1000)
		expect(await enqueueOgImageRender(env, board, { reason: 'edit' })).toBe('already_pending')

		// Once it lapses, the next edit gets a fresh render.
		vi.setSystemTime(enqueuedAt + OG_PENDING_MARKER_TTL_MS + 1000)
		expect(await enqueueOgImageRender(env, board, { reason: 'edit' })).toBe('enqueued')
	})

	// Where the marker's clock starts, and why it is not "when the write lands". The alarm that fires
	// an ask nulls the debouncer's window *before* the enqueue's R2 round trip runs, so a persist can
	// land in between and start a new max-wait window earlier than the marker's write. Stamping the
	// expiry from the fire's own clock reading means that window still ends at or past the marker —
	// the exact-equality safety the max-wait test below leans on.
	it('stamps the marker TTL from the fire time, not from when the write lands', async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-01-01T00:00:10Z'))
		const bucket = makeFakeThumbnailsBucket()
		const env = makeEnv({ THUMBNAILS: bucket })
		// The write is landing 10s after the alarm fired — a pathologically slow R2 round trip.
		const firedAt = Date.now() - 10_000

		await enqueueOgImageRender(
			env,
			{ kind: 'shared_file', slug: 'board' },
			{ reason: 'edit', firedAt }
		)

		const marker = [...bucket.store.entries()].find(([key]) => key.endsWith('.pending'))!
		expect(Number(marker[1].customMetadata!.expiresAt)).toBe(firedAt + OG_PENDING_MARKER_TTL_MS)
	})

	// The marker must outlive a job's worst-case retry chain: every capture running to its full
	// timeout, plus every backoff delay between deliveries. If it lapsed while a job was still alive,
	// a fresh ask would enqueue a second job for the same board, the two captures could overlap, and
	// each would clobber the other's per-board render token record (renderTokens.ts) — 403ing the
	// loser's snapshot read mid-capture. The record's per-board key is safe only because this marker
	// single-flights renders per board.
	//
	// Pricing a capture at one THUMBNAIL_RENDER_TIMEOUT_MS is sound only because the worker abandons
	// the call at that budget ("abandons a capture at the render timeout" below); without that
	// ceiling the real chain runs past this TTL.
	it('has a marker TTL longer than the worst-case retry chain', () => {
		const backoffMs = Array.from(
			{ length: OG_MAX_RENDER_ATTEMPTS - 1 },
			(_, i) => OG_RETRY_DELAY_SECONDS * (i + 1) * 1000
		).reduce((a, b) => a + b, 0)
		const worstCaseChainMs = OG_MAX_RENDER_ATTEMPTS * THUMBNAIL_RENDER_TIMEOUT_MS + backoffMs

		expect(OG_PENDING_MARKER_TTL_MS).toBeGreaterThan(worstCaseChainMs)
	})

	// What lets shared files skip the follow-up render entirely, half one: debounced fires. An ask is
	// only ever turned away while a job's marker is alive, and the debounce places that ask's persist
	// a full OG_RENDER_DEBOUNCE_MS before the marker's clear. The image whose write performs that
	// clear read its snapshot at most THUMBNAIL_RENDER_TIMEOUT_MS (plus the response and R2 write)
	// before the same clear — retries included, since only a job's final delivery clears. With the
	// debounce the longer of the two, the persist predates the snapshot: the content a dropped ask
	// wanted is already in the image. The 15s margin has to absorb that post-capture tail; if this
	// inequality ever flips, shared files need the follow-up back — see enqueueFollowUpIfBoardMoved.
	it('debounces edits for longer than a capture can possibly run', () => {
		expect(OG_RENDER_DEBOUNCE_MS).toBeGreaterThan(THUMBNAIL_RENDER_TIMEOUT_MS)
	})

	// Half two: max-wait fires, the one ask the debounce does not bound. The fire that enqueued a job
	// reset the debouncer's window, so the next max-wait-clamped fire comes at least
	// OG_RENDER_MAX_WAIT_MS after that fire — and the marker's expiry counts from the same fire
	// ("stamps the marker TTL from the fire time" above), so the clamped fire lands at or past it
	// with no gap for the enqueue's R2 round trip to hide in. A clamped ask can be delayed by a live
	// job but not turned away by its marker. This holds by exact equality today: lowering
	// OG_RENDER_MAX_WAIT_MS below the marker TTL would re-open "dropped, not deferred" for the boards
	// that edit without pause, with nothing left to re-ask.
	it('lets the pending marker expire before a max-wait fire can be turned away by it', () => {
		expect(OG_RENDER_MAX_WAIT_MS).toBeGreaterThanOrEqual(OG_PENDING_MARKER_TTL_MS)
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
		// A cooldown left by an earlier failed repair goes with it: an unpublish-then-republish is a new
		// snapshot, and its repair must not inherit the old one's failure.
		await bucket.put(
			getOgImageCacheKey(board).replace(/\.png$/, '.repair-cooldown'),
			new Uint8Array().buffer
		)

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

// The publish effect is the only trigger a published board has: its snapshot is frozen, so nothing
// edits it into asking again. An ask lost here therefore leaves that board's card generic until
// somebody republishes, and none of the ways it can be lost throw loudly enough to notice.
describe('enqueuePublishThumbnailRender', () => {
	it('enqueues the published board and reports nothing when it takes effect', async () => {
		const queue = makeFakeQueue()
		const env = makeEnv({ THUMBNAILS: makeFakeThumbnailsBucket(), QUEUE: queue })
		const reportProblem = vi.fn()

		await enqueuePublishThumbnailRender(env, 'published-slug', reportProblem)

		expect(queue.send).toHaveBeenCalledWith({
			type: 'og-image-render',
			kind: 'published',
			slug: 'published-slug',
			reason: 'publish',
		})
		expect(reportProblem).not.toHaveBeenCalled()
	})

	// The quiet one. A marker left behind by an earlier failed job turns the ask away with a value, not
	// an exception, so this is the case that would go unnoticed without the report.
	it('reports the ask being turned away by a pending marker', async () => {
		const bucket = makeFakeThumbnailsBucket()
		const env = makeEnv({ THUMBNAILS: bucket, QUEUE: makeFakeQueue() })
		const board = { kind: 'published', slug: 'published-slug' } as const
		await enqueueOgImageRender(env, board, { reason: 'publish' })
		const reportProblem = vi.fn()

		await enqueuePublishThumbnailRender(env, 'published-slug', reportProblem)

		expect(reportProblem).toHaveBeenCalledTimes(1)
		expect((reportProblem.mock.calls[0][0] as Error).message).toContain('already_pending')
	})

	it('reports an unconfigured queue rather than passing for success', async () => {
		const env = makeEnv({ THUMBNAILS: makeFakeThumbnailsBucket(), QUEUE: undefined })
		const reportProblem = vi.fn()

		await enqueuePublishThumbnailRender(env, 'published-slug', reportProblem)

		expect((reportProblem.mock.calls[0][0] as Error).message).toContain('unavailable')
	})

	// An in-place republish reuses the slug, so a repair cooldown armed against the previous
	// snapshot's failure would otherwise outlive the snapshot it was evidence about — and if the
	// republished render then failed transiently, the crawler repair that failure relies on would be
	// suppressed for the rest of the old cooldown.
	it('clears a leftover repair cooldown, giving the new snapshot its own repair backstop', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {})
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1,
		})
		vi.mocked(getPublishedRoomSnapshot).mockResolvedValue(makeOnePageSnapshot())
		const board = { kind: 'published', slug: 'published-slug' } as const
		const env = makeEnv({
			BROWSER: makeBrowserBinding(async () => {
				throw new Error('browser session failed')
			}),
			THUMBNAILS: makeFakeThumbnailsBucket(),
		})

		// The previous snapshot's crawler repair gave up, arming the cooldown.
		await handleOgImageRenderMessage(env, makeMessage({ ...board, reason: 'crawler' }, 3))
		expect(await isOgImageRepairOnCooldown(env, board)).toBe(true)

		await enqueuePublishThumbnailRender(env, 'published-slug', vi.fn())

		expect(await isOgImageRepairOnCooldown(env, board)).toBe(false)
	})

	// Publishing must survive its thumbnail ask failing: the snapshot is already written, and this is
	// the last thing the effect does.
	it('reports a throw without rethrowing it into the publish handler', async () => {
		const queue = makeFakeQueue()
		queue.send.mockRejectedValue(new Error('queue is down'))
		const env = makeEnv({ THUMBNAILS: makeFakeThumbnailsBucket(), QUEUE: queue })
		const reportProblem = vi.fn()

		await expect(
			enqueuePublishThumbnailRender(env, 'published-slug', reportProblem)
		).resolves.toBeUndefined()
		expect((reportProblem.mock.calls[0][0] as Error).message).toBe('queue is down')
	})
})

// Hard deletion is the one place both image keys go. Everywhere else keeps one of them: unsharing
// keeps the file-keyed image (a reshare should be an immediate hit), and unpublishing only takes the
// published one. Neither reason survives the board ceasing to exist — and since `og/…` keys carry no
// version and THUMBNAILS has no lifecycle rule, whatever is left behind is an object nothing will
// ever read, overwrite or sweep.
describe('deleteBoardThumbnails', () => {
	// A board's token records are spread across one key per surface, and for MCP one per page and theme
	// besides — which is why the cleanup lists the prefix rather than deleting a key it knows. Written
	// out longhand here so the layout is pinned by the test rather than borrowed from the code under it.
	const ogTokenKey = (kind: string, slug: string) => `render-tokens/${kind}/${slug}/og`
	const mcpTokenKey = (kind: string, slug: string, pageId: string) =>
		`render-tokens/${kind}/${slug}/mcp/light/${pageId}`

	async function seedBoard(bucket: ReturnType<typeof makeFakeThumbnailsBucket>, env: any) {
		const file = { kind: 'shared_file', slug: 'file-1' } as const
		const published = { kind: 'published', slug: 'published-slug' } as const
		for (const board of [file, published]) {
			// An enqueue writes the pending marker, so the fixture covers image, marker and token records.
			await enqueueOgImageRender(env, board, { reason: 'publish' })
			await bucket.put(getOgImageCacheKey(board), new Uint8Array([1]).buffer)
			await bucket.put(ogTokenKey(board.kind, board.slug), new Uint8Array().buffer)
			// Two of them, as two concurrent MCP captures of different pages would leave.
			await bucket.put(mcpTokenKey(board.kind, board.slug, 'page:a'), new Uint8Array().buffer)
			await bucket.put(mcpTokenKey(board.kind, board.slug, 'page:b'), new Uint8Array().buffer)
		}
	}

	it('removes both images, both markers and every surface’s render token records', async () => {
		const bucket = makeFakeThumbnailsBucket()
		const env = makeEnv({ THUMBNAILS: bucket, QUEUE: makeFakeQueue() })
		await seedBoard(bucket, env)

		await deleteBoardThumbnails(env, { fileId: 'file-1', publishedSlug: 'published-slug' })

		expect([...bucket.store.keys()]).toEqual([])
	})

	it('touches nothing belonging to another board', async () => {
		const bucket = makeFakeThumbnailsBucket()
		const env = makeEnv({ THUMBNAILS: bucket, QUEUE: makeFakeQueue() })
		await seedBoard(bucket, env)
		const other = { kind: 'shared_file', slug: 'file-2' } as const
		await bucket.put(getOgImageCacheKey(other), new Uint8Array([2]).buffer)
		await bucket.put(ogTokenKey(other.kind, other.slug), new Uint8Array().buffer)
		await bucket.put(mcpTokenKey(other.kind, other.slug, 'page:a'), new Uint8Array().buffer)

		await deleteBoardThumbnails(env, { fileId: 'file-1', publishedSlug: 'published-slug' })

		expect([...bucket.store.keys()].sort()).toEqual(
			[
				getOgImageCacheKey(other),
				ogTokenKey(other.kind, other.slug),
				mcpTokenKey(other.kind, other.slug, 'page:a'),
			].sort()
		)
	})

	// An empty published slug would address `og/published//light.png`, which is not this board's key
	// and may well be somebody else's neighbourhood.
	it('skips the published half when the file has no published slug', async () => {
		const bucket = makeFakeThumbnailsBucket()
		const env = makeEnv({ THUMBNAILS: bucket, QUEUE: makeFakeQueue() })
		await seedBoard(bucket, env)

		await deleteBoardThumbnails(env, { fileId: 'file-1', publishedSlug: null })

		expect([...bucket.store.keys()].sort()).toEqual(
			[
				getOgImageCacheKey({ kind: 'published', slug: 'published-slug' }),
				getOgImageCacheKey({ kind: 'published', slug: 'published-slug' }).replace(
					/\.png$/,
					'.pending'
				),
				ogTokenKey('published', 'published-slug'),
				mcpTokenKey('published', 'published-slug', 'page:a'),
				mcpTokenKey('published', 'published-slug', 'page:b'),
			].sort()
		)
	})

	// It runs inside the teardown that also removes the room snapshot and the histories, so a failure
	// to tidy up must not abort what follows it.
	it('resolves even when the bucket refuses a delete', async () => {
		const bucket = makeFakeThumbnailsBucket()
		const env = makeEnv({ THUMBNAILS: bucket, QUEUE: makeFakeQueue() })
		await seedBoard(bucket, env)
		vi.spyOn(bucket, 'delete').mockRejectedValue(new Error('R2 is down'))

		await expect(
			deleteBoardThumbnails(env, { fileId: 'file-1', publishedSlug: 'published-slug' })
		).resolves.toBeUndefined()
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
		// The MCP cluster index is the only thing in this pipeline that reaches a durable object, and
		// only from a tool call. The OG path shares the render token, the render page and the browser
		// binding with it, and must not pick this up by accident.
		expect(clusterIndexStoreOf(env).calls).toEqual({ get: 0, put: 0 })
		const job = await verifyThumbnailRenderToken(env, tokenFromScreenshot(env))
		expect(job).toMatchObject({
			kind: 'published',
			slug: 'published-board',
			version: 1751234567890,
			camera: 'content',
			width: 1200,
			height: 630,
			// The consumer renders every board, private ones included, so its tokens read under the weaker
			// gate — and are the only ones a minted-token record is kept for.
			access: 'render',
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

	// The resolve above the snapshot read already fetched this row, so it is handed to the read rather
	// than fetched again — one Postgres connection per job instead of two. The gate still runs, on the
	// row that was passed (see getSharedFile.test.ts).
	it('hands the resolved file row to the snapshot read instead of re-reading it', async () => {
		const file = { id: 'shared-file', shared: true, isDeleted: false }
		vi.mocked(getSharedFileInfo).mockResolvedValue(file)
		vi.mocked(getSharedFileRoomSnapshot).mockResolvedValue(makeOnePageSnapshot())
		const env = makeEnv({
			ROOMS: makeFakeRoomsBucket('etag-1'),
			THUMBNAILS: makeFakeThumbnailsBucket(),
		})

		await handleOgImageRenderMessage(env, makeMessage({ kind: 'shared_file', slug: 'shared-file' }))

		expect(getSharedFileRoomSnapshot).toHaveBeenCalledWith(env, 'shared-file', {
			access: 'render',
			file,
		})
		// One read for the whole job: the resolve. The snapshot read reuses its row, and shared files
		// have no follow-up check at all — the DO's debounce covers a board that moves mid-capture.
		expect(getSharedFileInfo).toHaveBeenCalledTimes(1)
	})

	// A shared file that moves during its own capture needs no follow-up: the persist that moved it
	// re-armed the file DO's debounce alarm, and that alarm's enqueue always finds the pending marker
	// gone, because the debounce outlasts a capture's worst case (pinned above, "debounces edits for
	// longer than a capture can possibly run"). A follow-up here rendered the same content the
	// debounced ask was about to render — roughly a fifth of shared-file queue captures in
	// production, measured 2026-08-11 via the `followup` telemetry blob.
	it('does not follow up a shared file even when the board moved during capture', async () => {
		vi.mocked(getSharedFileInfo).mockResolvedValue({
			id: 'shared-file',
			shared: true,
			isDeleted: false,
		})
		// The board is captured at one etag and has moved on by the time the capture completes — the
		// exact situation the follow-up used to fire on.
		let etag = 'etag-1'
		const env = makeEnv({
			ROOMS: { head: async () => ({ etag }) },
			THUMBNAILS: makeFakeThumbnailsBucket(),
		})
		vi.mocked(getSharedFileRoomSnapshot).mockImplementation(async () => {
			etag = 'etag-2'
			return makeOnePageSnapshot()
		})

		await handleOgImageRenderMessage(env, makeMessage({ kind: 'shared_file', slug: 'shared-file' }))

		// The render genuinely happened — this is the success path, not an early bail dressed up as one.
		expect(screenshotOf(env)).toHaveBeenCalledTimes(1)
		// Not merely "no follow-up": nothing is enqueued at all, and the moved-board check costs no
		// reads — resolve remains this path's single Postgres question.
		expect(env.QUEUE.send).not.toHaveBeenCalled()
		expect(getSharedFileInfo).toHaveBeenCalledTimes(1)
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
		// A marker from the enqueue that raced the delete; it must not outlive the dropped job, or the
		// next enqueue is deduped away against a render that never happened.
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

	// A capture takes seconds. A publish landing during one asks for a render, is turned away by this
	// job's pending marker, and that ask is *dropped* — and nothing ever re-asks for a published
	// board. Without this check the board would sit on a thumbnail of the previous publication until
	// somebody happened to republish.
	it('re-asks when the board changed while it was capturing', async () => {
		vi.mocked(getPublishedFileInfo)
			// resolved at the top of the delivery, and rendered
			.mockResolvedValueOnce({ id: 'file-1', published: true, lastPublished: 1 })
			// the board moved under the capture
			.mockResolvedValueOnce({ id: 'file-1', published: true, lastPublished: 2 })
		vi.mocked(getPublishedRoomSnapshot).mockResolvedValue(makeOnePageSnapshot())
		const queue = makeFakeQueue()
		const env = makeEnv({ THUMBNAILS: makeFakeThumbnailsBucket(), QUEUE: queue })

		await handleOgImageRenderMessage(env, makeMessage({ kind: 'published', slug: 'board' }))

		expect(queue.send).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ kind: 'published', slug: 'board', followUp: true })
		)
	})

	it('does not re-ask when the board held still', async () => {
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1,
		})
		vi.mocked(getPublishedRoomSnapshot).mockResolvedValue(makeOnePageSnapshot())
		const queue = makeFakeQueue()
		const env = makeEnv({ THUMBNAILS: makeFakeThumbnailsBucket(), QUEUE: queue })

		await handleOgImageRenderMessage(env, makeMessage({ kind: 'published', slug: 'board' }))

		expect(queue.send).not.toHaveBeenCalled()
	})

	// The ceiling on the above. A board republished without pause is stale at the end of every capture, so a
	// chaining follow-up would render it continuously — exactly the cost the debounce upstream exists to
	// avoid. One extra render per triggered render, never two.
	it('never chains: a follow-up does not enqueue another', async () => {
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1,
		})
		vi.mocked(getPublishedRoomSnapshot).mockResolvedValue(makeOnePageSnapshot())
		const queue = makeFakeQueue()
		const env = makeEnv({ THUMBNAILS: makeFakeThumbnailsBucket(), QUEUE: queue })

		await handleOgImageRenderMessage(
			env,
			makeMessage({ kind: 'published', slug: 'board', followUp: true })
		)

		expect(queue.send).not.toHaveBeenCalled()
		// One resolve for the render itself and none for the moved-board check: the guard cuts the
		// chain off before even looking, so no board state can re-enqueue.
		expect(getPublishedFileInfo).toHaveBeenCalledTimes(1)
	})

	// Once a job gives up, nothing is in flight and the marker has nothing left to single-flight.
	// Leaving it to lapse would turn away the next ask for the rest of its TTL, which bites hardest
	// here: this board has no image at all.
	it('clears the pending marker when a job gives up, but keeps it between retries', async () => {
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1,
		})
		vi.mocked(getPublishedRoomSnapshot).mockResolvedValue(makeOnePageSnapshot())
		const board = { kind: 'published', slug: 'board' } as const
		const bucket = makeFakeThumbnailsBucket()
		const env = makeEnv({
			BROWSER: makeBrowserBinding(async () => {
				throw new Error('browser session failed')
			}),
			THUMBNAILS: bucket,
		})
		const markerKey = getOgImageCacheKey(board).replace(/\.png$/, '.pending')

		await enqueueOgImageRender(env, board, { reason: 'publish' })
		expect(bucket.store.has(markerKey)).toBe(true)

		await handleOgImageRenderMessage(env, makeMessage(board, 1))
		expect(bucket.store.has(markerKey)).toBe(true)

		await handleOgImageRenderMessage(env, makeMessage(board, 3))
		expect(bucket.store.has(markerKey)).toBe(false)
	})

	// The give-up clears the pending marker so a genuine republish is not turned away — but for the
	// crawler-triggered repair, "acted on immediately" is the attack: with the marker gone, the next
	// unauthenticated request would re-arm a whole retry chain of Browser Run on a board that just
	// proved it cannot render. The cooldown is what stands in for the marker on that one path, and
	// only that path: a publish-triggered failure must not arm it, or the repair loses the immediate
	// first attempt it exists to provide.
	it('arms the repair cooldown when a crawler-triggered job gives up, and only then', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {})
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1,
		})
		vi.mocked(getPublishedRoomSnapshot).mockResolvedValue(makeOnePageSnapshot())
		const board = { kind: 'published', slug: 'board' } as const
		const env = makeEnv({
			BROWSER: makeBrowserBinding(async () => {
				throw new Error('browser session failed')
			}),
			THUMBNAILS: makeFakeThumbnailsBucket(),
		})

		// A retry is not a give-up, and a publish-triggered give-up arms nothing.
		await handleOgImageRenderMessage(env, makeMessage({ ...board, reason: 'crawler' }, 1))
		expect(await isOgImageRepairOnCooldown(env, board)).toBe(false)
		await handleOgImageRenderMessage(env, makeMessage({ ...board, reason: 'publish' }, 3))
		expect(await isOgImageRepairOnCooldown(env, board)).toBe(false)

		// The crawler-triggered give-up is the one that does.
		await handleOgImageRenderMessage(env, makeMessage({ ...board, reason: 'crawler' }, 3))
		expect(await isOgImageRepairOnCooldown(env, board)).toBe(true)
	})

	it('lets the repair cooldown lapse after OG_REPAIR_COOLDOWN_MS', async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
		vi.spyOn(console, 'error').mockImplementation(() => {})
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1,
		})
		vi.mocked(getPublishedRoomSnapshot).mockResolvedValue(makeOnePageSnapshot())
		const board = { kind: 'published', slug: 'board' } as const
		const env = makeEnv({
			BROWSER: makeBrowserBinding(async () => {
				throw new Error('browser session failed')
			}),
			THUMBNAILS: makeFakeThumbnailsBucket(),
		})

		await handleOgImageRenderMessage(env, makeMessage({ ...board, reason: 'crawler' }, 3))
		const armedAt = Date.parse('2026-01-01T00:00:00Z')

		vi.setSystemTime(armedAt + OG_REPAIR_COOLDOWN_MS - 1000)
		expect(await isOgImageRepairOnCooldown(env, board)).toBe(true)

		vi.setSystemTime(armedAt + OG_REPAIR_COOLDOWN_MS + 1000)
		expect(await isOgImageRepairOnCooldown(env, board)).toBe(false)
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

	// Pins the worker-side deadline the inequalities above lean on: they price a capture at one
	// THUMBNAIL_RENDER_TIMEOUT_MS, and only abandonAtRenderTimeout (thumbnailRender.ts) makes that
	// a real ceiling — the quick action's own timers are per-phase and allow roughly twice it.
	it('abandons a capture at the render timeout instead of waiting out both quick action timers', async () => {
		// Only the pieces the deadline uses; setImmediate stays real so the test can yield the event
		// loop below while fake time stands still.
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
		vi.spyOn(console, 'error').mockImplementation(() => {})
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1,
		})
		vi.mocked(getPublishedRoomSnapshot).mockResolvedValue(makeOnePageSnapshot())
		const env = makeEnv({
			// A capture that never returns — the shape of a page stalling through both phases.
			BROWSER: makeBrowserBinding(() => new Promise<never>(() => {})),
			THUMBNAILS: makeFakeThumbnailsBucket(),
		})

		const delivery = handleOgImageRenderMessage(
			env,
			makeMessage({ kind: 'published', slug: 'board' }, 3)
		)
		// The deadline is armed a few event-loop turns into the delivery (token minting rides
		// webcrypto), so yield until it exists before advancing past it.
		while (vi.getTimerCount() === 0) {
			await new Promise((resolve) => setImmediate(resolve))
		}
		await vi.advanceTimersByTimeAsync(THUMBNAIL_RENDER_TIMEOUT_MS + 1)
		await delivery

		expect(failureBlobsOf(env)).toEqual(['failure:browser_timeout'])
		// The abandoned session spent its whole budget holding a browser; the ledger records that
		// rather than losing the session that cost the most.
		expect(sessionsOf(env)).toEqual([
			expect.objectContaining({
				outcome: 'browser_timeout',
				durationMs: THUMBNAIL_RENDER_TIMEOUT_MS,
			}),
		])
	})

	// A body stream that fails outright is still a session that existed and spent: it must land on
	// the ledger like any other died session, not vanish because the error left the transport as a
	// raw stream error instead of a Browser Run refusal.
	it('puts a failed body read on the session ledger', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {})
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1,
		})
		vi.mocked(getPublishedRoomSnapshot).mockResolvedValue(makeOnePageSnapshot())
		const env = makeEnv({
			BROWSER: {
				quickAction: vi.fn(async () => ({
					ok: true,
					status: 200,
					arrayBuffer: () => Promise.reject(new TypeError('network connection lost')),
				})),
			},
			THUMBNAILS: makeFakeThumbnailsBucket(),
		})

		await handleOgImageRenderMessage(env, makeMessage({ kind: 'published', slug: 'board' }, 3))

		expect(failureBlobsOf(env)).toEqual(['failure:browser_failed'])
		expect(sessionsOf(env)).toEqual([expect.objectContaining({ outcome: 'browser_failed' })])
	})

	// The ceiling has to cover the body read too: a 200 whose headers arrive in time but whose body
	// stream then stalls would otherwise hold the delivery unbounded — past the marker TTL, which
	// re-opens the overlapping-jobs case the TTL test above excludes.
	it('abandons a capture whose response body stalls after the headers arrive', async () => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
		vi.spyOn(console, 'error').mockImplementation(() => {})
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1,
		})
		vi.mocked(getPublishedRoomSnapshot).mockResolvedValue(makeOnePageSnapshot())
		const env = makeEnv({
			// Headers come back OK immediately; the body never does.
			BROWSER: {
				quickAction: vi.fn(async () => ({
					ok: true,
					status: 200,
					arrayBuffer: () => new Promise<never>(() => {}),
				})),
			},
			THUMBNAILS: makeFakeThumbnailsBucket(),
		})

		const delivery = handleOgImageRenderMessage(
			env,
			makeMessage({ kind: 'published', slug: 'board' }, 3)
		)
		while (vi.getTimerCount() === 0) {
			await new Promise((resolve) => setImmediate(resolve))
		}
		await vi.advanceTimersByTimeAsync(THUMBNAIL_RENDER_TIMEOUT_MS + 1)
		await delivery

		expect(failureBlobsOf(env)).toEqual(['failure:browser_timeout'])
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
	it('puts a failed render on the session ledger, and nothing where no browser ran', async () => {
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
		// The session that failed still held a browser; its spend and outcome live on its own row,
		// while the delivery's request row records only the failure reason.
		expect(sessionsOf(env)).toEqual([
			{
				source: 'queue',
				mode: 'screenshot',
				outcome: 'browser_failed',
				reason: 'crawler',
				durationMs: expect.any(Number),
			},
		])

		// An empty board never reaches the capture: no session existed, so none is on the ledger.
		vi.mocked(getPublishedRoomSnapshot).mockResolvedValue(null as any)
		const emptyBoardEnv = makeEnv({ THUMBNAILS: makeFakeThumbnailsBucket() })
		await handleOgImageRenderMessage(
			emptyBoardEnv,
			makeMessage({ kind: 'published', slug: 'board' }, 3)
		)
		expect(failureBlobsOf(emptyBoardEnv)).toEqual(['failure:board_empty'])
		expect(sessionsOf(emptyBoardEnv)).toEqual([])
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
			MCP_SERVER_BROWSER_RATE_LIMITER: browserLimiter,
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

	// Why the blob exists at all: a follow-up carries the reason of the job it follows, so `reason`
	// alone cannot separate the render a trigger asked for from the extra one the follow-up causes.
	// Asserted on both a capture and a cache hit, since a follow-up delivery reaches either.
	it('separates a follow-up delivery from the trigger that caused it', async () => {
		vi.mocked(getPublishedFileInfo).mockResolvedValue({
			id: 'file-1',
			published: true,
			lastPublished: 1,
		})
		vi.mocked(getPublishedRoomSnapshot).mockResolvedValue(makeOnePageSnapshot())
		const env = makeEnv({ THUMBNAILS: makeFakeThumbnailsBucket() })

		await handleOgImageRenderMessage(
			env,
			makeMessage({ kind: 'published', slug: 'board', reason: 'edit' })
		)
		await handleOgImageRenderMessage(
			env,
			makeMessage({ kind: 'published', slug: 'board', reason: 'edit', followUp: true })
		)

		expect(blobsWithPrefix(env, 'reason:')).toEqual(['reason:edit', 'reason:edit'])
		expect(blobsWithPrefix(env, 'cache:')).toEqual(['cache:miss', 'cache:hit'])
		expect(blobsWithPrefix(env, 'followup:')).toEqual(['followup:false', 'followup:true'])
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
