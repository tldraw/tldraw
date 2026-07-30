/**
 * How often we the document to R2?
 * 8 seconds.
 */
export const PERSIST_INTERVAL_MS = 8_000

/**
 * How long a board must go without persisting before its thumbnail is rendered. 30 seconds.
 *
 * A debounce, not a throttle or an interval: each persist pushes the render further out, so a board
 * renders once its editing *settles*, which is the state a thumbnail is meant to show. Note that a
 * fixed window would be the wrong shape here whatever its length — production's mean gap between one
 * board's persists is ~39s, so a window shorter than that suppresses almost nothing and a longer one
 * costs thumbnail freshness. See "Why a debounce and not a throttle" in
 * apps/dotcom/browser-run-thumbnails.md for the measurements and the cost table.
 */
export const OG_RENDER_DEBOUNCE_MS = 30_000

/**
 * Ceiling on how long a continuously edited board can go without its thumbnail being refreshed.
 * 5 minutes.
 *
 * Bounds the one failure mode of a pure debounce: a board that never stops being edited would
 * otherwise never render, since every persist pushes the deadline out again. Measured from the first
 * persist after a render.
 *
 * This is the dominant cost term for busy boards, so it is the dial to turn if Browser Run spend needs
 * to come down. Raising it does not affect the far more common short-burst board, which costs one
 * render either way.
 */
export const OG_RENDER_MAX_WAIT_MS = 5 * 60_000

/**
 * The URL of the PostHog instance to use.
 */
export const POSTHOG_URL = 'https://eu.i.posthog.com'
