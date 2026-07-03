import { TLDefaultBorderStyle } from '@tldraw/editor'
import { CSSProperties } from 'react'
import { getRotatedBoxShadow } from './rotated-box-shadow'

// `lined` draws a 1px muted border.
const LINED_BORDER = '1px solid var(--tl-color-muted-2)'

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
 * `lined` draws a 1px muted border; `shadow` applies the same rotating
 * `box-shadow` as the bookmark shape.
 *
 * @internal
 */
export function getMediaBorderStyle(
	border: TLDefaultBorderStyle,
	shape: MediaBorderShape
): CSSProperties | undefined {
	switch (border) {
		case 'lined':
			return { border: LINED_BORDER, boxSizing: 'border-box' }
		case 'shadow':
			return { boxShadow: getRotatedBoxShadow(shape.rotation) }
		case 'none':
		default:
			return undefined
	}
}
