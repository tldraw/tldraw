import { TLDefaultBorderStyle } from '@tldraw/editor'
import { CSSProperties } from 'react'
import { getRotatedBoxShadow } from './rotated-box-shadow'

/**
 * CSS custom properties that drive the `shadow-hard` border treatment. They are
 * read with fallbacks so the default look works without any setup, while an app
 * can override them on a container to tune the look live. The `solid` and soft
 * `shadow` treatments use fixed theme colors and ignore these.
 *
 * Shadow-hard:
 * - `--tl-media-shadow-x` — horizontal offset (default `4px`)
 * - `--tl-media-shadow-y` — vertical offset (default `4px`)
 * - `--tl-media-shadow-opacity` — shadow alpha, 0–1 (default `0.5`)
 *
 * @internal
 */

// `shadow-hard` uses the same offset/opacity as a soft drop shadow but forces the blur to zero.
const SHADOW_HARD_FILTER =
	'drop-shadow(var(--tl-media-shadow-x, 4px) var(--tl-media-shadow-y, 4px) 0px rgba(0, 0, 0, var(--tl-media-shadow-opacity, 0.5)))'

// `solid` draws a 1px muted border.
const SOLID_BORDER = '1px solid var(--tl-color-muted-2)'

/**
 * Describes the media shape for the `border` treatments. The `shadow` treatment
 * uses the shape's rotation so its shadow rotates with the shape, just like the
 * bookmark shape.
 *
 * @internal
 */
export interface MediaBorderShape {
	rotation: number
}

/**
 * Returns the CSS properties to apply to a media shape's container for its
 * `border` treatment, or `undefined` when nothing should be applied.
 *
 * `solid` draws a 1px muted border; `shadow` applies the same rotating
 * `box-shadow` as the bookmark shape; `shadow-hard` applies a hard `drop-shadow`
 * filter that follows the media's alpha.
 *
 * @internal
 */
export function getMediaBorderStyle(
	border: TLDefaultBorderStyle,
	shape: MediaBorderShape
): CSSProperties | undefined {
	switch (border) {
		case 'solid':
			return { border: SOLID_BORDER, boxSizing: 'border-box' }
		case 'shadow':
			return { boxShadow: getRotatedBoxShadow(shape.rotation) }
		case 'shadow-hard':
			return { filter: SHADOW_HARD_FILTER }
		case 'none':
		default:
			return undefined
	}
}
