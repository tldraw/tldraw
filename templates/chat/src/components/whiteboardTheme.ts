import {
	ArrowShapeUtil,
	DEFAULT_THEME,
	DrawShapeUtil,
	GeoShapeUtil,
	LineShapeUtil,
	TextShapeUtil,
	TLShape,
} from 'tldraw'

export const whiteboardThemes = {
	default: {
		...DEFAULT_THEME,
		colors: {
			light: { ...DEFAULT_THEME.colors.light, background: '#fcfcfc' },
			dark: { ...DEFAULT_THEME.colors.dark, background: '#fcfcfc' },
		},
	},
}

export const whiteboardColors = [
	['Black', '#0d0d0d'],
	['Gray', '#737986'],
	['Brown', '#98420c'],
	['Red', '#e52329'],
	['Orange', '#ff7510'],
	['Yellow', '#f5a300'],
	['Green', '#16a34a'],
	['Teal', '#10978d'],
	['Cyan', '#08b5d1'],
	['Blue', '#2864ed'],
	['Indigo', '#5046e8'],
	['Purple', '#962fea'],
	['Pink', '#db277e'],
] as const

export interface WhiteboardPen {
	color: string
	width: number
}

export function supportsWhiteboardPen(shape: TLShape) {
	return ['draw', 'geo', 'line', 'arrow', 'text'].includes(shape.type)
}

// Keeping these values on the shape preserves exact colors and widths in snapshots and exports.
function getStroke(shape: TLShape) {
	return {
		...(typeof shape.meta.strokeColor === 'string' ? { strokeColor: shape.meta.strokeColor } : {}),
		...(typeof shape.meta.strokeWidth === 'number' ? { strokeWidth: shape.meta.strokeWidth } : {}),
	}
}

export const whiteboardShapeUtils = [
	DrawShapeUtil.configure({ getCustomDisplayValues: (_editor, shape) => getStroke(shape) }),
	LineShapeUtil.configure({ getCustomDisplayValues: (_editor, shape) => getStroke(shape) }),
	GeoShapeUtil.configure({
		getCustomDisplayValues: (_editor, shape) => ({
			...getStroke(shape),
			...(typeof shape.meta.strokeColor === 'string' ? { labelColor: shape.meta.strokeColor } : {}),
		}),
	}),
	ArrowShapeUtil.configure({
		getCustomDisplayValues: (_editor, shape) => ({
			...getStroke(shape),
			...(typeof shape.meta.strokeColor === 'string' ? { labelColor: shape.meta.strokeColor } : {}),
		}),
	}),
	TextShapeUtil.configure({
		getCustomDisplayValues: (_editor, shape) =>
			typeof shape.meta.strokeColor === 'string' ? { color: shape.meta.strokeColor } : {},
	}),
]
