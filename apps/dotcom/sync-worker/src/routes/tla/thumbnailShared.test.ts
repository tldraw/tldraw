import { afterEach, describe, expect, it, vi } from 'vitest'
import { Environment } from '../../types'
import {
	BoardSnapshotReadError,
	BrowserRenderError,
	classifyScreenshotFailure,
	reportThumbnailError,
} from './thumbnailShared'

afterEach(() => {
	vi.restoreAllMocks()
})

function makeBrowserRenderError(
	overrides: Partial<ConstructorParameters<typeof BrowserRenderError>[0]> = {}
) {
	return new BrowserRenderError({
		status: 422,
		detail: undefined,
		durationMs: 1_000,
		timeoutMs: 45_000,
		...overrides,
	})
}

describe('BrowserRenderError', () => {
	// Sentry groups on the message, so the detail has to stay off it: a body that names the board or
	// the failing asset would turn one recurring issue into a new one per distinct string.
	it('keeps the status-only message that Sentry groups on', () => {
		const error = makeBrowserRenderError({ detail: 'Navigation timeout of 45000 ms exceeded' })
		expect(error.message).toBe('Browser Rendering screenshot failed (422)')
	})
})

describe('classifyScreenshotFailure', () => {
	// 422 is Cloudflare's answer to a crashed page, an out-of-memory render, and every one of its
	// timers expiring alike, so the status can't split them and the response body has to.
	it('reads the timer out of the response body', () => {
		const error = makeBrowserRenderError({
			detail: 'Navigation timeout of 45000 ms exceeded',
			durationMs: 900,
		})
		expect(classifyScreenshotFailure(error)).toBe('browser_timeout')
	})

	// The other half of the same 422: our own render page marked data-thumbnail-error, the capture
	// selector (success-only) was therefore absent, and the call came back long before the budget.
	it('classifies an early failure with no timer named as a render failure', () => {
		const error = makeBrowserRenderError({
			detail: 'Element with selector "body[data-thumbnail-ready=\\"true\\"]" not found',
			durationMs: 3_000,
		})
		expect(classifyScreenshotFailure(error)).toBe('browser_failed')
	})

	// Fallback for a body that says nothing useful: a call that spent essentially the whole budget
	// waited a timer out, whatever it was called.
	it('falls back to the elapsed budget when the body names no timer', () => {
		expect(classifyScreenshotFailure(makeBrowserRenderError({ durationMs: 44_000 }))).toBe(
			'browser_timeout'
		)
		expect(classifyScreenshotFailure(makeBrowserRenderError({ durationMs: 5_000 }))).toBe(
			'browser_failed'
		)
	})

	it('still distinguishes a snapshot read failure from a render failure', () => {
		expect(classifyScreenshotFailure(new BoardSnapshotReadError('postgres is down'))).toBe(
			'snapshot_read_error'
		)
	})

	it('keeps classifying the untyped errors the surfaces still throw', () => {
		expect(classifyScreenshotFailure(new Error('Browser Rendering is not configured.'))).toBe(
			'not_configured'
		)
		expect(classifyScreenshotFailure(new Error('Render produced an empty screenshot'))).toBe(
			'empty_render'
		)
		expect(classifyScreenshotFailure(new Error('something else entirely'))).toBe('render_error')
	})
})

describe('reportThumbnailError', () => {
	// Without this the report says only "Browser Rendering screenshot failed (422)", which is equally
	// true of a crashed page, an OOM render and a timeout — the whole point of reporting is to know
	// which. Tests get no ExecutionContext, so reporting takes its console fallback.
	it('reports the cause Cloudflare gave alongside the caller-supplied extras', () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
		const error = makeBrowserRenderError({
			detail: 'Navigation timeout of 45000 ms exceeded',
			durationMs: 45_100,
		})

		reportThumbnailError(error, {
			ctx: undefined,
			env: {} as Environment,
			surface: 'og_queue',
			extras: { kind: 'published' },
		})

		expect(consoleError).toHaveBeenCalledExactlyOnceWith(
			'[thumbnails:og_queue]',
			{
				kind: 'published',
				browser_render_status: 422,
				browser_render_detail: 'Navigation timeout of 45000 ms exceeded',
				browser_render_duration_ms: 45_100,
				browser_render_timeout_ms: 45_000,
				browser_render_reason: 'browser_timeout',
			},
			error
		)
	})

	// An empty body is itself a fact worth seeing, so it is recorded rather than omitted.
	it('records the absence of a response body', () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

		reportThumbnailError(makeBrowserRenderError(), {
			ctx: undefined,
			env: {} as Environment,
			surface: 'mcp_screenshot',
		})

		expect(consoleError.mock.calls[0]![1]).toMatchObject({
			browser_render_detail: '(no response body)',
		})
	})

	// The request is used for its method and user agent and nothing else. It is deliberately never
	// handed to createSentry, which passes one to Toucan with `allowedSearchParams: /(.*)/` — that
	// would record the full URL and every query parameter, and on these routes the URL is the
	// sensitive part: a link-shared file's id sits in the OG route's path, and a signed render token
	// (a live capability to read the board's whole snapshot) sits in the snapshot route's query.
	it('takes no URL or query parameter from the request', () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
		const request = new Request(
			'https://sync.tldraw.xyz/api/app/thumbnail-render/snapshot?token=super-secret-render-token',
			{ headers: { 'user-agent': 'Twitterbot/1.0' } }
		)

		reportThumbnailError(new Error('nope'), {
			ctx: undefined,
			env: {} as Environment,
			request,
			surface: 'thumbnail_snapshot',
			extras: { kind: 'shared_file' },
		})

		const context = consoleError.mock.calls[0]![1]
		expect(context).toEqual({
			kind: 'shared_file',
			request_method: 'GET',
			request_user_agent: 'Twitterbot/1.0',
		})
		const serialised = JSON.stringify(context)
		expect(serialised).not.toContain('super-secret-render-token')
		expect(serialised).not.toContain('thumbnail-render')
		expect(serialised).not.toContain('sync.tldraw.xyz')
	})

	it('leaves errors that are not render failures alone', () => {
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
