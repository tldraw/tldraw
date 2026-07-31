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
 */
export const OG_RENDER_MAX_WAIT_MS = 5 * 60_000

/**
 * The URL of the PostHog instance to use.
 */
export const POSTHOG_URL = 'https://eu.i.posthog.com'
