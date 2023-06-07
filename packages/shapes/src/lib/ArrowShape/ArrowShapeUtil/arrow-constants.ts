import { TLSizeType } from '@tldraw/tlschema'

/** @public */
export const ARROW_LABEL_FONT_SIZES: Record<TLSizeType, number> = {
	s: 18,
	m: 20,
	l: 24,
	xl: 28,
}

/** @internal */
export const MIN_ARROW_LENGTH = 48
/** @internal */
export const BOUND_ARROW_OFFSET = 10
/** @internal */
export const WAY_TOO_BIG_ARROW_BEND_FACTOR = 10
