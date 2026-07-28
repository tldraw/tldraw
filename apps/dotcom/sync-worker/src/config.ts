/**
 * How often we the document to R2?
 * 8 seconds.
 */
export const PERSIST_INTERVAL_MS = 8_000

/**
 * How long a board must go without persisting before its thumbnail is rendered.
 * 30 seconds.
 *
 * This is a debounce, not a throttle or an interval: each persist pushes the render further out, so a
 * board renders once its editing *settles* rather than on a wall-clock cadence while editing is still
 * going on. That matches what a thumbnail is for — the settled state of the board, not a sample taken
 * mid-stroke — and it means a continuously edited board costs one render per editing session instead
 * of one per window.
 *
 * The measurement that motivated it: production runs ~555 persists/min across ~359 boards active in a
 * 10 minute window, i.e. a mean gap between a board's persists of roughly 39s. That is *longer* than a
 * 30s window, so the throttle this replaced was suppressing almost nothing — its leading edge fired on
 * nearly every persist, and render volume tracked persist volume rather than the interval.
 */
export const OG_RENDER_DEBOUNCE_MS = 30_000

/**
 * Ceiling on how long a continuously edited board can go without its thumbnail being refreshed.
 * 5 minutes.
 *
 * Pure debounce has one failure mode: a board that never stops being edited never renders, because
 * every persist pushes the deadline out again. This bounds that — the deadline is measured from the
 * first persist after a render, so a board under sustained editing still refreshes this often.
 *
 * It is the dominant cost term for busy boards, so it is the dial to turn if Browser Run spend needs
 * to come down: raising it makes long editing sessions cheaper without affecting the far more common
 * case of a board that is edited in a short burst and then left alone (that one costs exactly one
 * render either way).
 */
export const OG_RENDER_MAX_WAIT_MS = 5 * 60_000

/**
 * The URL of the PostHog instance to use.
 */
export const POSTHOG_URL = 'https://eu.i.posthog.com'
