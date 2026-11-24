import { afterEach, describe, expect, it, vi } from 'vitest'
import { Environment } from '../../types'
import {
	BoardSnapshotReadError,
	classifyScreenshotFailure,
	RateLimiterUnavailableError,
	RenderWorkerError,
	describeThumbnailFailure,
	reportThumbnailError,
} from './thumbnailShared'

afterEach(() => {
	vi.restoreAllMocks()
})

describe('classifyScreenshotFailure', () => {
	// Matched by type and first: a binding outage means the work was never attempted, so every other
	// reason here would name a subsystem that is fine.
	it('names a rate limiter outage as itself', () => {
		expect(classifyScreenshotFailure(new RateLimiterUnavailableError(new Error('down')))).toBe(
			'rate_limiter_unavailable'
		)
		expect(describeThumbnailFailure('rate_limiter_unavailable')).toBe(
			'a rate limit could not be checked'
		)
	})

	// The render worker has already classified its failure, to a reason this worker cannot re-derive.
	it('passes a render worker reason through unchanged', () => {
		expect(classifyScreenshotFailure(new RenderWorkerError('browser_timeout'))).toBe(
			'browser_timeout'
		)
	})

	it('still distinguishes a snapshot read failure from a render failure', () => {
		expect(classifyScreenshotFailure(new BoardSnapshotReadError('postgres is down'))).toBe(
			'snapshot_read_error'
		)
	})

	it('keeps classifying the untyped errors the surfaces still throw', () => {
		expect(classifyScreenshotFailure(new Error('Rendering is not configured.'))).toBe(
			'not_configured'
		)
		expect(classifyScreenshotFailure(new Error('something else entirely'))).toBe('render_error')
	})
})

describe('describeThumbnailFailure', () => {
	// 'the render failed' is nonsense for a tool that starts no render — search_boards and
	// get_board_info both fail this way when Postgres does, and both prefix it with their own
	// summary ("Could not search boards: …").
	it('describes a board lookup failure without mentioning rendering', () => {
		expect(describeThumbnailFailure('board_lookup_error')).toBe(
			'the board database could not be reached'
		)
	})
})

describe('reportThumbnailError', () => {
	// The request is used for its method and user agent and nothing else. It is deliberately never
	// handed to createSentry, which passes one to Toucan with `allowedSearchParams: /(.*)/` — that
	// would record the full URL and every query parameter, and on these routes the URL is the
	// sensitive part: a link-shared file's id sits in the OG route's path.
	it('takes no URL or query parameter from the request', () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
		const request = new Request(
			'https://sync.tldraw.xyz/api/app/social-preview/f/a-shared-file-id/image?ref=some-secret',
			{ headers: { 'user-agent': 'Twitterbot/1.0' } }
		)

		reportThumbnailError(new Error('nope'), {
			ctx: undefined,
			env: {} as Environment,
			request,
			surface: 'og_route',
			extras: { kind: 'shared_file' },
		})

		const context = consoleError.mock.calls[0]![1]
		expect(context).toEqual({
			kind: 'shared_file',
			request_method: 'GET',
			request_user_agent: 'Twitterbot/1.0',
		})
		const serialised = JSON.stringify(context)
		expect(serialised).not.toContain('some-secret')
		expect(serialised).not.toContain('a-shared-file-id')
		expect(serialised).not.toContain('sync.tldraw.xyz')
	})

	it('reports the error with the caller-supplied extras', () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
		const error = new BoardSnapshotReadError('postgres is down')

		reportThumbnailError(error, {
			ctx: undefined,
			env: {} as Environment,
			surface: 'og_queue',
			extras: { kind: 'shared_file' },
		})

		expect(consoleError).toHaveBeenCalledExactlyOnceWith(
			'[thumbnails:og_queue]',
			{ kind: 'shared_file' },
			error
		)
	})
})
