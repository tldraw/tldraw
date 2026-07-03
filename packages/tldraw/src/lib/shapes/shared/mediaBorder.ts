import { TLDefaultBorderStyle } from '@tldraw/editor'
import { CSSProperties } from 'react'

/**
 * CSS custom properties that drive the media border treatments. They are read
 * with fallbacks so the default look works without any setup, while an app (or
 * the media border playground example) can override them on a container to tune
 * the look live.
 *
 * Shadow:
 * - `--tl-media-shadow-x` — horizontal offset (default `4px`)
 * - `--tl-media-shadow-y` — vertical offset (default `4px`)
 * - `--tl-media-shadow-blur` — gaussian blur radius (default `4px`)
 * - `--tl-media-shadow-opacity` — shadow alpha, 0–1 (default `0.5`)
 *
 * Solid border:
 * - `--tl-media-border-width` — stroke width (default `3px`)
 * - `--tl-media-border-color` — stroke color (default near-black)
 *
 * @internal
 */
const SHADOW_FILTER =
	'drop-shadow(var(--tl-media-shadow-x, 4px) var(--tl-media-shadow-y, 4px) var(--tl-media-shadow-blur, 4px) rgba(0, 0, 0, var(--tl-media-shadow-opacity, 0.5)))'

// `shadow-hard` reuses the same offset/opacity but forces the blur to zero.
const SHADOW_HARD_FILTER =
	'drop-shadow(var(--tl-media-shadow-x, 4px) var(--tl-media-shadow-y, 4px) 0px rgba(0, 0, 0, var(--tl-media-shadow-opacity, 0.5)))'

const SOLID_BORDER =
	'var(--tl-media-border-width, 3px) solid var(--tl-media-border-color, rgba(0, 0, 0, 0.9))'

/**
 * Returns the CSS properties to apply to a media shape's container for its
 * `border` treatment, or `undefined` when nothing should be applied.
 *
 * `solid` draws an inset stroke around the shape; `shadow`/`shadow-hard` apply a
 * `drop-shadow` filter that follows the media's alpha.
 *
 * @internal
 */
export function getMediaBorderStyle(border: TLDefaultBorderStyle): CSSProperties | undefined {
	switch (border) {
		case 'solid':
			return { border: SOLID_BORDER, boxSizing: 'border-box' }
		case 'shadow':
			return { filter: SHADOW_FILTER }
		case 'shadow-hard':
			return { filter: SHADOW_HARD_FILTER }
		case 'none':
		default:
			return undefined
	}
}
