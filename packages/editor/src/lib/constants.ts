import { EASINGS } from '@tldraw/primitives'
import { TLDefaultFontStyle, TLDefaultSizeStyle } from '@tldraw/tlschema'

/** @internal */
export const MAX_SHAPES_PER_PAGE = 2000
/** @internal */
export const MAX_PAGES = 40

/** @internal */
export const REMOVE_SYMBOL = Symbol('remove')

/** @internal */
export const RICH_TYPES: Record<string, boolean> = {
	Date: true,
	RegExp: true,
	String: true,
	Number: true,
}

/** @internal */
export const ANIMATION_SHORT_MS = 80
/** @internal */
export const ANIMATION_MEDIUM_MS = 320

/** @internal */
export const ZOOMS = [0.1, 0.25, 0.5, 1, 2, 4, 8]
/** @internal */
export const MIN_ZOOM = 0.1
/** @internal */
export const MAX_ZOOM = 8

/** @internal */
export const FOLLOW_CHASE_PROPORTION = 0.5
/** @internal */
export const FOLLOW_CHASE_PAN_SNAP = 0.1
/** @internal */
export const FOLLOW_CHASE_PAN_UNSNAP = 0.2
/** @internal */
export const FOLLOW_CHASE_ZOOM_SNAP = 0.005
/** @internal */
export const FOLLOW_CHASE_ZOOM_UNSNAP = 0.05

/** @internal */
export const MAJOR_NUDGE_FACTOR = 10
/** @internal */
export const MINOR_NUDGE_FACTOR = 1

/** @internal */
export const MAX_ASSET_WIDTH = 1000
/** @internal */
export const MAX_ASSET_HEIGHT = 1000

/** @internal */
export const GRID_INCREMENT = 5

/** @internal */
export const MIN_CROP_SIZE = 8

/** @internal */
export const DOUBLE_CLICK_DURATION = 450
/** @internal */
export const MULTI_CLICK_DURATION = 200

/** @internal */
export const COARSE_DRAG_DISTANCE = 6

/** @internal */
export const DRAG_DISTANCE = 4

/** @internal */
export const SVG_PADDING = 32

/** @internal */
export const HASH_PATERN_ZOOM_NAMES: Record<string, string> = {}

for (let zoom = 1; zoom <= Math.ceil(MAX_ZOOM); zoom++) {
	HASH_PATERN_ZOOM_NAMES[zoom + '_dark'] = `hash_pattern_zoom_${zoom}_dark`
	HASH_PATERN_ZOOM_NAMES[zoom + '_light'] = `hash_pattern_zoom_${zoom}_light`
}

/** @internal */
export const DEFAULT_ANIMATION_OPTIONS = {
	duration: 0,
	easing: EASINGS.easeInOutCubic,
}

/** @internal */
export const HAND_TOOL_FRICTION = 0.09

/** @internal */
export const MIN_ARROW_LENGTH = 48
/** @internal */
export const BOUND_ARROW_OFFSET = 10
/** @internal */
export const WAY_TOO_BIG_ARROW_BEND_FACTOR = 10

/** @internal */
export const DEFAULT_BOOKMARK_WIDTH = 300

/** @internal */
export const DEFAULT_BOOKMARK_HEIGHT = 320

/** @public */
export const GRID_STEPS = [
	{ min: -1, mid: 0.15, step: 100 },
	{ min: 0.05, mid: 0.375, step: 25 },
	{ min: 0.15, mid: 1, step: 5 },
	{ min: 0.7, mid: 2.5, step: 1 },
]

/** @public */
export const TEXT_PROPS = {
	lineHeight: 1.35,
	fontWeight: 'normal',
	fontVariant: 'normal',
	fontStyle: 'normal',
	padding: '0px',
	maxWidth: 'auto',
}

/** @public */
export const STROKE_SIZES: Record<TLDefaultSizeStyle, number> = {
	s: 2,
	m: 3.5,
	l: 5,
	xl: 10,
}

/** @public */
export const FONT_SIZES: Record<TLDefaultSizeStyle, number> = {
	s: 18,
	m: 24,
	l: 36,
	xl: 44,
}

/** @public */
export const LABEL_FONT_SIZES: Record<TLDefaultSizeStyle, number> = {
	s: 18,
	m: 22,
	l: 26,
	xl: 32,
}

/** @public */
export const ARROW_LABEL_FONT_SIZES: Record<TLDefaultSizeStyle, number> = {
	s: 18,
	m: 20,
	l: 24,
	xl: 28,
}

/** @public */
export const FONT_FAMILIES: Record<TLDefaultFontStyle, string> = {
	draw: 'var(--tl-font-draw)',
	sans: 'var(--tl-font-sans)',
	serif: 'var(--tl-font-serif)',
	mono: 'var(--tl-font-mono)',
}

/** @internal */
export const COLLABORATOR_TIMEOUT = 3000

/** @internal */
export const COLLABORATOR_CHECK_INTERVAL = 1200

/**
 * Negative pointer ids are reserved for internal use.
 *
 * @internal */
export const INTERNAL_POINTER_IDS = {
	CAMERA_MOVE: -10,
} as const
