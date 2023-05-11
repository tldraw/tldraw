import { EASINGS } from '@tldraw/primitives'
import { TLAlignType, TLFontType, TLSizeType, TLStyleCollections } from '@tldraw/tlschema'

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
export const ROTATING_SHADOWS = [
	{
		offsetX: 0,
		offsetY: 2,
		blur: 4,
		spread: 0,
		color: '#00000029',
	},
	{
		offsetX: 0,
		offsetY: 3,
		blur: 6,
		spread: 0,
		color: '#0000001f',
	},
]

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
export const FONT_SIZES: Record<TLSizeType, number> = {
	s: 18,
	m: 24,
	l: 36,
	xl: 44,
}

/** @public */
export const LABEL_FONT_SIZES: Record<TLSizeType, number> = {
	s: 18,
	m: 22,
	l: 26,
	xl: 32,
}

/** @public */
export const ARROW_LABEL_FONT_SIZES: Record<TLSizeType, number> = {
	s: 18,
	m: 20,
	l: 24,
	xl: 28,
}

/** @public */
export const ICON_SIZES: Record<TLSizeType, number> = {
	s: 16,
	m: 32,
	l: 48,
	xl: 64,
}

/** @public */
export const FONT_FAMILIES: Record<TLFontType, string> = {
	draw: 'var(--tl-font-draw)',
	sans: 'var(--tl-font-sans)',
	serif: 'var(--tl-font-serif)',
	mono: 'var(--tl-font-mono)',
}

/** @public */
export const FONT_ALIGNMENT: Record<TLAlignType, string> = {
	middle: 'center',
	start: 'left',
	end: 'right',
}

/** @public */
export const STYLES: TLStyleCollections = {
	color: [
		{ id: 'black', type: 'color', icon: 'color' },
		{ id: 'grey', type: 'color', icon: 'color' },
		{ id: 'light-violet', type: 'color', icon: 'color' },
		{ id: 'violet', type: 'color', icon: 'color' },
		{ id: 'blue', type: 'color', icon: 'color' },
		{ id: 'light-blue', type: 'color', icon: 'color' },
		{ id: 'yellow', type: 'color', icon: 'color' },
		{ id: 'orange', type: 'color', icon: 'color' },
		{ id: 'green', type: 'color', icon: 'color' },
		{ id: 'light-green', type: 'color', icon: 'color' },
		{ id: 'light-red', type: 'color', icon: 'color' },
		{ id: 'red', type: 'color', icon: 'color' },
	],
	fill: [
		{ id: 'none', type: 'fill', icon: 'fill-none' },
		{ id: 'semi', type: 'fill', icon: 'fill-semi' },
		{ id: 'solid', type: 'fill', icon: 'fill-solid' },
		{ id: 'pattern', type: 'fill', icon: 'fill-pattern' },
	],
	dash: [
		{ id: 'draw', type: 'dash', icon: 'dash-draw' },
		{ id: 'dashed', type: 'dash', icon: 'dash-dashed' },
		{ id: 'dotted', type: 'dash', icon: 'dash-dotted' },
		{ id: 'solid', type: 'dash', icon: 'dash-solid' },
	],
	size: [
		{ id: 's', type: 'size', icon: 'size-small' },
		{ id: 'm', type: 'size', icon: 'size-medium' },
		{ id: 'l', type: 'size', icon: 'size-large' },
		{ id: 'xl', type: 'size', icon: 'size-extra-large' },
	],
	opacity: [
		{ id: '0.1', type: 'opacity', icon: 'color' },
		{ id: '0.25', type: 'opacity', icon: 'color' },
		{ id: '0.5', type: 'opacity', icon: 'color' },
		{ id: '0.75', type: 'opacity', icon: 'color' },
		{ id: '1', type: 'opacity', icon: 'color' },
	],
	font: [
		{ id: 'draw', type: 'font', icon: 'font-draw' },
		{ id: 'sans', type: 'font', icon: 'font-sans' },
		{ id: 'serif', type: 'font', icon: 'font-serif' },
		{ id: 'mono', type: 'font', icon: 'font-mono' },
	],
	align: [
		{ id: 'start', type: 'align', icon: 'text-align-left' },
		{ id: 'middle', type: 'align', icon: 'text-align-center' },
		{ id: 'end', type: 'align', icon: 'text-align-right' },
	],
	geo: [
		{ id: 'rectangle', type: 'geo', icon: 'geo-rectangle' },
		{ id: 'ellipse', type: 'geo', icon: 'geo-ellipse' },
		{ id: 'triangle', type: 'geo', icon: 'geo-triangle' },
		{ id: 'diamond', type: 'geo', icon: 'geo-diamond' },
		{ id: 'pentagon', type: 'geo', icon: 'geo-pentagon' },
		{ id: 'hexagon', type: 'geo', icon: 'geo-hexagon' },
		{ id: 'octagon', type: 'geo', icon: 'geo-octagon' },
		{ id: 'star', type: 'geo', icon: 'geo-star' },
		{ id: 'rhombus', type: 'geo', icon: 'geo-rhombus' },
		{ id: 'rhombus-2', type: 'geo', icon: 'geo-rhombus-2' },
		{ id: 'oval', type: 'geo', icon: 'geo-oval' },
		{ id: 'trapezoid', type: 'geo', icon: 'geo-trapezoid' },
		{ id: 'arrow-right', type: 'geo', icon: 'geo-arrow-right' },
		{ id: 'arrow-left', type: 'geo', icon: 'geo-arrow-left' },
		{ id: 'arrow-up', type: 'geo', icon: 'geo-arrow-up' },
		{ id: 'arrow-down', type: 'geo', icon: 'geo-arrow-down' },
		{ id: 'x-box', type: 'geo', icon: 'geo-x-box' },
		{ id: 'check-box', type: 'geo', icon: 'geo-check-box' },
	],
	arrowheadStart: [
		{ id: 'none', type: 'arrowheadStart', icon: 'arrowhead-none' },
		{ id: 'arrow', type: 'arrowheadStart', icon: 'arrowhead-arrow' },
		{ id: 'triangle', type: 'arrowheadStart', icon: 'arrowhead-triangle' },
		{ id: 'square', type: 'arrowheadStart', icon: 'arrowhead-square' },
		{ id: 'dot', type: 'arrowheadStart', icon: 'arrowhead-dot' },
		{ id: 'diamond', type: 'arrowheadStart', icon: 'arrowhead-diamond' },
		{ id: 'inverted', type: 'arrowheadStart', icon: 'arrowhead-triangle-inverted' },
		{ id: 'bar', type: 'arrowheadStart', icon: 'arrowhead-bar' },
	],
	arrowheadEnd: [
		{ id: 'none', type: 'arrowheadEnd', icon: 'arrowhead-none' },
		{ id: 'arrow', type: 'arrowheadEnd', icon: 'arrowhead-arrow' },
		{ id: 'triangle', type: 'arrowheadEnd', icon: 'arrowhead-triangle' },
		{ id: 'square', type: 'arrowheadEnd', icon: 'arrowhead-square' },
		{ id: 'dot', type: 'arrowheadEnd', icon: 'arrowhead-dot' },
		{ id: 'diamond', type: 'arrowheadEnd', icon: 'arrowhead-diamond' },
		{ id: 'inverted', type: 'arrowheadEnd', icon: 'arrowhead-triangle-inverted' },
		{ id: 'bar', type: 'arrowheadEnd', icon: 'arrowhead-bar' },
	],
	spline: [
		{ id: 'line', type: 'spline', icon: 'spline-line' },
		{ id: 'cubic', type: 'spline', icon: 'spline-cubic' },
	],
}

// These props should not cause App.props to update
export const BLACKLISTED_PROPS = new Set([
	'bend',
	'w',
	'h',
	'start',
	'end',
	'text',
	'name',
	'url',
	'growY',
])
