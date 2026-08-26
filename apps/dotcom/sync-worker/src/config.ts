// Tuning constants for the sync worker, gathered here so the dials live in one place.
//
// Several of these come out to 60 seconds. That is coincidence, not coupling: each one is derived
// from its own constraint (production persist timings, capture p90, Cloudflare's fixed rate limit
// period), and each can move without the others. The one genuine interdependency in this file is
// OG_PENDING_MARKER_TTL_MS against the retry chain (OG_MAX_RENDER_ATTEMPTS, OG_RETRY_DELAY_SECONDS
// and the capture timeout), and a test in ogImageQueue.test.ts pins that inequality.

/**
 * How often we the document to R2?
 * 8 seconds.
 */
export const PERSIST_INTERVAL_MS = 8_000

/**
 * How long a board must go without persisting before its thumbnail is rendered. 60 seconds.
 *
 * A debounce, not a throttle or an interval: each persist pushes the render further out, so a board
 * renders once its editing *settles*, which is the state a thumbnail is meant to show. Note that a
 * fixed window would be the wrong shape here whatever its length — production's mean gap between one
 * board's persists is ~39s, so a window shorter than that suppresses almost nothing and a longer one
 * costs thumbnail freshness. See "Why a debounce and not a throttle" in
 * apps/dotcom/browser-run-thumbnails.md for the measurements and the cost table.
 *
 * 60s rather than 30s because replaying both values over six hours of production `persist_success`
 * timings costs ~35.7 renders/min at 30s against ~32.3 at 60s. Note how small that is: raising this
 * alone cannot save much, because a merged session then runs long enough to hit
 * `OG_RENDER_MAX_WAIT_MS` and trades a settle render for a max-wait one. The two constants have to
 * move together to matter — see "What it costs" in the doc for the grid.
 */
export const OG_RENDER_DEBOUNCE_MS = 60_000

/**
 * Ceiling on how long a continuously edited board can go without its thumbnail being refreshed.
 * 5 minutes.
 *
 * Bounds the one failure mode of a pure debounce: a board that never stops being edited would
 * otherwise never render, since every persist pushes the deadline out again. Measured from the first
 * persist after a render.
 *
 * Raising it does not affect the far more common short-burst board, which costs one render either way.
 *
 * Measured against six hours of production persists, this is now the constant that governs total
 * spend, and it governs it jointly with `OG_RENDER_DEBOUNCE_MS`: at a 60s debounce, taking this from
 * 5 to 10 minutes goes from ~32.3 to ~26.7 renders/min, while leaving it at 5 minutes makes the
 * debounce itself nearly inert. Left at 5 minutes deliberately — a board edited without pause holds a
 * five minute old thumbnail rather than a ten minute old one — but this is the first dial to turn if
 * spend needs to come down.
 *
 * Its floor is OG_PENDING_MARKER_TTL_MS. Shared files have no follow-up render: a max-wait fire is
 * the one ask the debounce doesn't bound, and it is safe only because it lands at or past the TTL of
 * any marker that could turn it away. Below that floor, an ask can be dropped with nothing left to
 * re-ask (the inequality is pinned in ogImageQueue.test.ts).
 */
export const OG_RENDER_MAX_WAIT_MS = 5 * 60_000

/**
 * Suppresses a duplicate OG render enqueue while one is queued or in flight. A single-flight, not a
 * rate limit: the consumer clears it as soon as a render lands, so on a healthy board it never
 * reaches this TTL, which exists only so a consumer dying cannot wedge a board permanently. To
 * change how often a board renders, change OG_RENDER_DEBOUNCE_MS.
 *
 * Must outlive a job's worst-case retry chain — every capture running to its timeout plus every
 * backoff delay — or the marker lapses while the job is still alive, a fresh ask enqueues a second
 * job for the same board, and the two clobber each other's per-board render token record
 * (renderTokens.ts is keyed on the single-flight this marker provides). A test in
 * ogImageQueue.test.ts pins the inequality against OG_MAX_RENDER_ATTEMPTS, OG_RETRY_DELAY_SECONDS
 * and THUMBNAIL_RENDER_TIMEOUT_MS.
 */
export const OG_PENDING_MARKER_TTL_MS = 5 * 60_000

/**
 * Retries are bounded by max_retries in wrangler.toml too; this lower cap keeps thumbnail jobs from
 * burning Browser Run capacity on a persistently failing board.
 */
export const OG_MAX_RENDER_ATTEMPTS = 3
export const OG_RETRY_DELAY_SECONDS = 30

/**
 * How long the OG route's published-board repair (`repairMissingPublishedImage` in getOgImage.ts)
 * stays quiet after a crawler-triggered render job for that board has burnt its whole retry budget.
 * 1 hour.
 *
 * The repair is the one render ask an unauthenticated request can cause, and without this it re-arms
 * as soon as the failed job clears its pending marker: a published board that deterministically fails
 * to render — a huge board that times out, say — would burn a full retry chain of Browser Run every
 * ~4 minutes for as long as anything crawls its URL. With it, such a board costs one chain per hour.
 *
 * Only the *crawler-reason* give-up arms it, so a publish-triggered render that fails transiently
 * still gets one immediate repair on the next crawl — the case the repair exists for — and the
 * cooldown only meters the attempts after that one has also failed. The publish trigger clears it,
 * because an in-place republish reuses the slug: the cooldown is evidence about the snapshot that
 * failed, and it must not outlive that snapshot and block the new one's repair.
 */
export const OG_REPAIR_COOLDOWN_MS = 60 * 60_000

/**
 * Cache lifetimes the OG image route hands to callers, in seconds because they land in
 * `cache-control` headers.
 *
 * Short, and deliberately not chosen for cost or freshness. Neither is the binding constraint:
 * R2 reads are a rounding error next to rendering, and unfurl platforms cache a card their own side
 * for days whatever we say. What the lifetime actually decides is how long an image can be served
 * without the share gate being consulted — nothing deletes a board's image when it stops being
 * public, so the route re-checking the gate per request is the only thing keeping an unshared
 * board's thumbnail off the internet. Every second of cache lifetime is a second that check does not
 * happen, so these are minutes, and revalidation is made cheap with an etag instead.
 */
export const OG_FRESH_IMAGE_MAX_AGE_SECONDS = 5 * 60
export const OG_STALE_IMAGE_MAX_AGE_SECONDS = 5 * 60
export const OG_FALLBACK_MAX_AGE_SECONDS = 60

/**
 * How long a minted render token stays valid.
 *
 * Sized against what a capture needs rather than generously, because this token is what stands between
 * an HMAC signature and a *private* board's full document: thumbnails are rendered for every board, not
 * only public ones. Measured renders run 4s at p50 and 12-17s at p90, so 60s is several times p90.
 *
 * Queue linger and retry backoff do not eat into it — a token is minted immediately before the
 * `quickAction` call, not at enqueue. A render slower than this fails and retries with a fresh token.
 */
export const THUMBNAIL_RENDER_TOKEN_TTL_MS = 60_000

/**
 * MCP rate limits: the only rate limiting anywhere in the thumbnail pipeline, applied in
 * sharedBoardScreenshotMcp.ts. The MCP endpoint is the one Browser Run-spending surface an outside
 * caller can drive directly, so a rogue or looping agent is the threat being bounded, and only the
 * calls that actually spend Browser Run are limited — `get_board_info` does the same work the
 * ordinary board routes do for anyone. The global limit is applied per Cloudflare location, so it
 * bounds a caller rather than the account. See "Request limits" in browser-run-thumbnails.md.
 *
 * These constants are only the isolate-local fallback for local dev and tests. Deployed environments
 * are governed by the Cloudflare rate limit bindings in wrangler.toml, so changing a number here
 * alone changes nothing in production. Each budget has its own binding, and the pairs must move
 * together:
 *
 *   MCP_PER_USER_RATE_LIMIT            ->  MCP_SCREENSHOT_RATE_LIMITER      (limit = 10)
 *   MCP_PER_BOARD_RATE_LIMIT           ->  MCP_SERVER_BOARD_RATE_LIMITER    (limit = 2)
 *   MCP_GLOBAL_BROWSER_RUN_RATE_LIMIT  ->  MCP_SERVER_BROWSER_RATE_LIMITER  (limit = 20)
 *
 * The first of these keyed on client IP until the endpoint required authentication. An account is
 * the better key in both directions: a proxy pool no longer buys a caller more budget, and everyone
 * behind one NAT no longer shares a single one. IP limits still matter on endpoints with no caller
 * identity — the render page's snapshot route, and anything the OAuth flow exposes.
 *
 * Per-user counts *tool calls that can spend Browser Run*, not captures, and it is one budget across
 * every such tool — see `perUserRateLimitKey`. That distinction matters because the clustering tools
 * each run a measure render, which costs a full browser session: the ordinary one-screenshot flow is
 * get_page_info, get_cluster_info, get_cluster_screenshot, so 10 calls a minute is nearer 3 finished
 * screenshots a minute than 10. Worth revisiting on the binding before the flag is widened; the
 * number here alone changes nothing deployed.
 *
 * Per-board is far below per-user on purpose: no single board may absorb more than 2 captures a
 * minute. Cache misses only, so this does not bound the usual "screenshot several pages of one board"
 * flow — a repeated capture of the same page is a cache hit. Measures are deliberately *not* counted
 * against it: three of them land on one board in the flow above, so a limit of 2 would refuse the
 * documented path rather than an abusive one. The global limiter is what bounds measure spend.
 *
 * The window matches the period configured on the Cloudflare bindings, which only support 60s (or
 * 10s) periods — this is the one number here that is Cloudflare's rather than ours.
 */
export const MCP_PER_USER_RATE_LIMIT = 10
export const MCP_PER_BOARD_RATE_LIMIT = 2
export const MCP_GLOBAL_BROWSER_RUN_RATE_LIMIT = 20
export const MCP_RATE_LIMIT_WINDOW_MS = 60_000

/**
 * The URL of the PostHog instance to use.
 */
export const POSTHOG_URL = 'https://eu.i.posthog.com'
