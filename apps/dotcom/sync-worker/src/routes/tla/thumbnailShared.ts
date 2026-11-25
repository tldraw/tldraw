import { createSentry } from '@tldraw/worker-shared'
import { Environment } from '../../types'

// Leaf helpers shared by the board-reading and thumbnail/OG-image surfaces
// (get{Published,SharedFile}, the render core in thumbnailRender.ts, mcpServer.ts,
// the OG route, and the OG queue consumer). This module imports nothing from those files so it can
// be depended on from any of them without creating an import cycle.

// Shared by the OG route and the board view read. `if-none-match` is a list, each entry optionally weak-prefixed and quoted; R2's `etag` is the bare
// value, so both sides are normalised before comparing.
export function etagMatches(ifNoneMatch: string, etag: string) {
	return ifNoneMatch
		.split(',')
		.map((candidate) => candidate.trim().replace(/^W\//, '').replace(/^"|"$/g, ''))
		.some((candidate) => candidate === '*' || candidate === etag)
}

// Whether a stored image still depicts the board's current content, which every surface serving one
// records as its `cacheStatus` telemetry dimension: a hit-rate panel that always read 100% hit could
// not tell a healthy cache from one serving years-old tiles.
//
// Takes the version rather than the resolved board so this module keeps importing nothing from the
// render modules.
export function cacheStatusOf(cached: R2Object, version: string | number): 'hit' | 'stale' {
	return cached.customMetadata?.version === String(version) ? 'hit' : 'stale'
}

// A rate limit binding could not be consulted. Distinct from every other failure on these routes
// because nothing the caller did caused it and nothing they can do fixes it: the work was never
// attempted, so telling them the database or the renderer failed sends them, and whoever reads the
// dashboard, at a subsystem that is fine.
export class RateLimiterUnavailableError extends Error {
	constructor(cause: unknown) {
		super('Rate limiter unavailable', { cause })
		this.name = 'RateLimiterUnavailableError'
	}
}

// A board's snapshot could not be read: Postgres, R2, or a malformed payload. Distinct from a render
// failure so telemetry can tell "the database is down" apart from "Chrome fell over".
export class BoardSnapshotReadError extends Error {
	constructor(message: string, options?: { cause?: unknown }) {
		super(message, options)
		this.name = 'BoardSnapshotReadError'
	}
}

// A failure returned by the private render worker over its service binding (apps/dotcom/render-worker).
// The worker has already classified it to a bounded reason and reported the underlying detail to its
// own Sentry; this carries that reason back through a throw, so classifyScreenshotFailure returns it
// unchanged and the call sites need no special casing.
export class RenderWorkerError extends Error {
	readonly reason: string

	constructor(reason: string) {
		super(`Render worker failed (${reason})`)
		this.name = 'RenderWorkerError'
		this.reason = reason
	}
}

// Maps an arbitrary render error to a bounded set of reason codes for the `failure` telemetry blob.
// Raw `error.message` strings are unbounded and must never reach that dimension, so keep this a
// small, stable vocabulary. The typed cases are matched first and by type: a failed snapshot read is
// not a render that failed, and filing it as one sends a dashboard reader to the wrong subsystem.
//
// A board deleted or unpublished between a surface resolving it and reading its snapshot lands in
// `snapshot_read_error` with everything else the readers throw. That race is a few milliseconds wide,
// so separating it out isn't worth a dedicated error type threaded through every reporting path.
export function classifyScreenshotFailure(error: unknown): string {
	// Already classified by the render worker; pass its reason through unchanged.
	if (error instanceof RenderWorkerError) return error.reason
	if (error instanceof RateLimiterUnavailableError) return 'rate_limiter_unavailable'
	if (error instanceof BoardSnapshotReadError) return 'snapshot_read_error'
	const message = error instanceof Error ? error.message : String(error)
	if (/not configured/i.test(message)) return 'not_configured'
	if (/timeout|timed out/i.test(message)) return 'browser_timeout'
	return 'render_error'
}

// Caller-facing explanation for a classified failure, as a clause to follow a tool's own prefix.
// Derived from the bounded reason code and never from `error.message`: these tools answer anonymous,
// unauthenticated callers, and Postgres and R2 errors carry internal hostnames, ports, and database
// usernames (from the pool's connection string). The unbounded
// original still reaches Sentry through reportThumbnailError, which is where it is useful.
export function describeThumbnailFailure(reason: string): string {
	switch (reason) {
		case 'snapshot_read_error':
			return "the board's saved content could not be read"
		case 'not_configured':
			return 'rendering is not configured'
		case 'page_too_large':
			return 'the page is too large to render'
		case 'browser_timeout':
			return 'rendering timed out'
		case 'board_lookup_error':
			// The tools that fail this way start no render, so the default 'the render failed' would
			// be a plainly wrong thing to tell a caller.
			return 'the board database could not be reached'
		case 'board_create_error':
			return 'the board could not be saved'
		case 'board_rename_error':
			return 'the new name could not be saved'
		case 'comment_write_error':
			return 'the comment could not be saved'
		case 'feedback_send_error':
			return 'the feedback could not be delivered'
		case 'rate_limiter_unavailable':
			// Deliberately not phrased as being rate limited: the caller is inside their budget, and a
			// message saying otherwise would have them back off for a minute that would not help.
			return 'a rate limit could not be checked'
		default:
			return 'the render failed'
	}
}

// Which swallowing surface an error came from. Set as a Sentry tag so they can be filtered apart,
// and kept a closed union so the tag's values stay a small, stable set.
export type ThumbnailErrorSurface =
	| 'og_route'
	| 'og_queue'
	| 'mcp_board_info'
	| 'mcp_board_search'
	| 'mcp_board_create'
	| 'mcp_board_rename'
	| 'mcp_workspace_list'
	| 'mcp_comment_read'
	| 'mcp_comment_write'
	| 'mcp_feedback'
	| 'mcp_screenshot'
	// Reaching the caller's open tab (mcpTabRender.ts), for a reason other than the tab being unable to
	// help. The caller is told the tab isn't responding.
	| 'mcp_tab_render'
	| 'mcp_apply_ops'
	| 'mcp_board_presence'
	// The authenticated owner-facing thumbnail route (getBoardThumbnail.ts).
	| 'board_view'
	// The render page's failure beacon. Pairs with an og_queue or mcp_screenshot failure from the same
	// session, which only knows Browser Run's side of it.
	| 'render_page'

// Every thumbnail/OG surface swallows its own errors — the OG route falls back to the default image,
// the MCP tools return a tool error, the queue retries or drops. Right for
// callers, but it leaves a bounded telemetry reason code as the only trace, which says a board stopped
// rendering and nothing about why. Reporting here is what keeps these paths diagnosable.
//
// `ctx` supplies the waitUntil that lets the report outlive the response — route handlers get one from
// the router, the queue consumer from the worker entrypoint. Without one (unit tests) we log instead,
// since createSentry throws when SENTRY_DSN and friends are unset.
export function reportThumbnailError(
	error: unknown,
	{
		ctx,
		env,
		request,
		surface,
		extras,
	}: {
		ctx: ExecutionContext | undefined
		env: Environment
		request?: Request
		surface: ThumbnailErrorSurface
		extras?: Record<string, unknown>
	}
) {
	try {
		const context = {
			...extras,
			...safeRequestContext(request),
		}
		// `request` is deliberately NOT handed to createSentry, which passes one straight to Toucan with
		// `allowedSearchParams: /(.*)/` — recording the full URL and every query parameter. On these
		// routes the URL is the sensitive part: `/app/social-preview/f/<id>/image` carries a link-shared
		// file's id. safeRequestContext takes what is useful instead.
		const sentry = ctx ? createSentry(ctx, env) : null
		if (!sentry) {
			console.error(`[thumbnails:${surface}]`, context, error)
			return
		}
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		sentry.withScope((scope) => {
			scope.setTag('thumbnail_surface', surface)
			scope.setExtras(context)
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			sentry.captureException(error)
		})
	} catch (_e) {
		// Reporting runs inside handlers whose whole point is to swallow failure, so it must never be
		// the thing that throws: a missing Sentry env var would otherwise turn a degraded-but-fine
		// response into a 500.
	}
}

// The parts of a request worth attaching that carry no board identity. The URL is excluded (see the
// call site); the user agent is kept because on the OG route it names the crawler that tripped over
// the board, and the method because a HEAD probe and a GET behave differently there. Not the client
// IP — telemetry records a hash of that, on failures only, which is where it earns its keep.
function safeRequestContext(request: Request | undefined): Record<string, unknown> | null {
	if (!request) return null
	return {
		request_method: request.method,
		request_user_agent: request.headers.get('user-agent') ?? 'none',
	}
}
