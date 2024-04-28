import { EASINGS, PI, SIN, TLDefaultSizeStyle, editorConstants } from '@tldraw/editor'
import { StrokeOptions } from './shapes/shared/freehand/types'
import { StyleValuesForUi } from './tldraw-types'

/**@public */
export const tldrawConstants = {
	...editorConstants,
	// Breakpoints for portrait, keep in sync with PORTRAIT_BREAKPOINT enum below!
	PORTRAIT_BREAKPOINTS: [0, 390, 428, 468, 580, 640, 840, 1023],
	// Mapping for PORTRAIT_BREAKPOINTS -- needs to be kept in sync!
	PORTRAIT_BREAKPOINT: {
		ZERO: 0,
		MOBILE_XXS: 1,
		MOBILE_XS: 2,
		MOBILE_SM: 3,
		MOBILE: 4,
		TABLET_SM: 5,
		TABLET: 6,
		DESKTOP: 7,
	},
	TEXT_PROPS: {
		lineHeight: 1.35,
		fontWeight: 'normal',
		fontVariant: 'normal',
		fontStyle: 'normal',
		padding: '0px',
	},
	STROKE_SIZES: {
		s: 2,
		m: 3.5,
		l: 5,
		xl: 10,
	} as Record<TLDefaultSizeStyle, number>,
	FONT_SIZES: {
		s: 18,
		m: 24,
		l: 36,
		xl: 44,
	} as Record<TLDefaultSizeStyle, number>,
	LABEL_FONT_SIZES: {
		s: 18,
		m: 22,
		l: 26,
		xl: 32,
	} as Record<TLDefaultSizeStyle, number>,
	ARROW_LABEL_FONT_SIZES: {
		s: 18,
		m: 20,
		l: 24,
		xl: 28,
	} as Record<TLDefaultSizeStyle, number>,
	FONT_FAMILIES: {
		draw: 'var(--tl-font-draw)',
		sans: 'var(--tl-font-sans)',
		serif: 'var(--tl-font-serif)',
		mono: 'var(--tl-font-mono)',
	},
	// highlight
	HIGHLIGHT_OVERLAY_OPACITY: 0.35,
	HIGHLIGHT_UNDERLAY_OPACITY: 0.82,
	// arrow
	LABEL_TO_ARROW_PADDING: 20,
	ARROW_LABEL_PADDING: 4.25,
	// geo shape padding
	GEO_LABEL_PADDING: 16,
	MIN_GEO_SIZE_WITH_LABEL: 17 * 3,
	MIN_GEO_SIZES_FOR_TEXT_SIZE: {
		s: 2,
		m: 3.5,
		l: 5,
		xl: 10,
	},
	// note shape padding
	NOTE_LABEL_PADDING: 16,
	// default styles
	STYLES: {
		color: [
			{ value: 'black', icon: 'color' },
			{ value: 'grey', icon: 'color' },
			{ value: 'light-violet', icon: 'color' },
			{ value: 'violet', icon: 'color' },
			{ value: 'blue', icon: 'color' },
			{ value: 'light-blue', icon: 'color' },
			{ value: 'yellow', icon: 'color' },
			{ value: 'orange', icon: 'color' },
			{ value: 'green', icon: 'color' },
			{ value: 'light-green', icon: 'color' },
			{ value: 'light-red', icon: 'color' },
			{ value: 'red', icon: 'color' },
		],
		fill: [
			{ value: 'none', icon: 'fill-none' },
			{ value: 'semi', icon: 'fill-semi' },
			{ value: 'solid', icon: 'fill-solid' },
			{ value: 'pattern', icon: 'fill-pattern' },
		],
		dash: [
			{ value: 'draw', icon: 'dash-draw' },
			{ value: 'dashed', icon: 'dash-dashed' },
			{ value: 'dotted', icon: 'dash-dotted' },
			{ value: 'solid', icon: 'dash-solid' },
		],
		size: [
			{ value: 's', icon: 'size-small' },
			{ value: 'm', icon: 'size-medium' },
			{ value: 'l', icon: 'size-large' },
			{ value: 'xl', icon: 'size-extra-large' },
		],
		font: [
			{ value: 'draw', icon: 'font-draw' },
			{ value: 'sans', icon: 'font-sans' },
			{ value: 'serif', icon: 'font-serif' },
			{ value: 'mono', icon: 'font-mono' },
		],
		horizontalAlign: [
			{ value: 'start', icon: 'text-align-left' },
			{ value: 'middle', icon: 'text-align-center' },
			{ value: 'end', icon: 'text-align-right' },
		],
		verticalAlign: [
			{ value: 'start', icon: 'vertical-align-start' },
			{ value: 'middle', icon: 'vertical-align-center' },
			{ value: 'end', icon: 'vertical-align-end' },
		],
		geo: [
			{ value: 'rectangle', icon: 'geo-rectangle' },
			{ value: 'ellipse', icon: 'geo-ellipse' },
			{ value: 'cloud', icon: 'geo-cloud' },
			{ value: 'triangle', icon: 'geo-triangle' },
			{ value: 'diamond', icon: 'geo-diamond' },
			{ value: 'pentagon', icon: 'geo-pentagon' },
			{ value: 'hexagon', icon: 'geo-hexagon' },
			{ value: 'octagon', icon: 'geo-octagon' },
			{ value: 'star', icon: 'geo-star' },
			{ value: 'rhombus', icon: 'geo-rhombus' },
			{ value: 'rhombus-2', icon: 'geo-rhombus-2' },
			{ value: 'oval', icon: 'geo-oval' },
			{ value: 'trapezoid', icon: 'geo-trapezoid' },
			{ value: 'arrow-right', icon: 'geo-arrow-right' },
			{ value: 'arrow-left', icon: 'geo-arrow-left' },
			{ value: 'arrow-up', icon: 'geo-arrow-up' },
			{ value: 'arrow-down', icon: 'geo-arrow-down' },
			{ value: 'x-box', icon: 'geo-x-box' },
			{ value: 'check-box', icon: 'geo-check-box' },
		],
		arrowheadStart: [
			{ value: 'none', icon: 'arrowhead-none' },
			{ value: 'arrow', icon: 'arrowhead-arrow' },
			{ value: 'triangle', icon: 'arrowhead-triangle' },
			{ value: 'square', icon: 'arrowhead-square' },
			{ value: 'dot', icon: 'arrowhead-dot' },
			{ value: 'diamond', icon: 'arrowhead-diamond' },
			{ value: 'inverted', icon: 'arrowhead-triangle-inverted' },
			{ value: 'bar', icon: 'arrowhead-bar' },
		],
		arrowheadEnd: [
			{ value: 'none', icon: 'arrowhead-none' },
			{ value: 'arrow', icon: 'arrowhead-arrow' },
			{ value: 'triangle', icon: 'arrowhead-triangle' },
			{ value: 'square', icon: 'arrowhead-square' },
			{ value: 'dot', icon: 'arrowhead-dot' },
			{ value: 'diamond', icon: 'arrowhead-diamond' },
			{ value: 'inverted', icon: 'arrowhead-triangle-inverted' },
			{ value: 'bar', icon: 'arrowhead-bar' },
		],
		spline: [
			{ value: 'line', icon: 'spline-line' },
			{ value: 'cubic', icon: 'spline-cubic' },
		],
	} as const satisfies Record<string, StyleValuesForUi<string>>,
	// line
	LINE_MINIMUM_DISTANCE_BETWEEN_SHIFT_CLICKED_HANDLES: 2,
	// cropping
	MIN_CROP_SIZE: 8,
	// ink
	MIN_START_PRESSURE: 0.025,
	MIN_END_PRESSURE: 0.01,
	FREEHAND_OPTIONS: {
		simulatedPressure: (strokeWidth: number): StrokeOptions => {
			return {
				size: 1 + strokeWidth,
				thinning: 0.5,
				streamline: 0.62 + ((1 + strokeWidth) / 8) * 0.06,
				smoothing: 0.62,
				easing: EASINGS.easeOutSine,
				simulatePressure: true,
			}
		},
		realPressure: (strokeWidth: number): StrokeOptions => {
			return {
				size: 1 + strokeWidth * 1.2,
				thinning: 0.62,
				streamline: 0.62,
				smoothing: 0.62,
				simulatePressure: false,
				easing: (t: number) => t * 0.65 + SIN((t * PI) / 2) * 0.35,
			}
		},
		solid: (strokeWidth: number): StrokeOptions => {
			return {
				size: 1 + strokeWidth,
				thinning: 0,
				streamline: 0.62 + ((1 + strokeWidth) / 8) * 0.06,
				smoothing: 0.62,
				simulatePressure: false,
				easing: EASINGS.linear,
			}
		},
		highlight(strokeWidth: number): StrokeOptions {
			return {
				size: 1 + strokeWidth,
				thinning: 0,
				streamline: 0.5,
				smoothing: 0.5,
				simulatePressure: false,
				easing: EASINGS.easeOutSine,
			}
		},
		line(strokeWidth: number): StrokeOptions {
			return {
				size: strokeWidth,
				thinning: 0.4,
				streamline: 0,
				smoothing: 0.5,
				simulatePressure: true,
				last: true,
			}
		},
	},
	HYPERLINK_ICON:
		"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='30' height='30' fill='none'%3E%3Cpath stroke='%23000' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M13 5H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6M19 5h6m0 0v6m0-6L13 17'/%3E%3C/svg%3E",
	ROTATING_BOX_SHADOWS: [
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
	],
	NOTE_CLONE_HANDLE_MARGIN: 0,
	NOTE_SIZE: 200,
	NOTE_ADJACENT_POSITION_SNAP_RADIUS: 10,
	FONT_SIZE_ADJUSTMENT_MAX_ITERATIONS: 50,
	FONT_SIZE_ADJUSTMENT_MIN_SIZE: 14,
	BOOKMARK_WIDTH: 300,
	BOOKMARK_HEIGHT: 320,
}
