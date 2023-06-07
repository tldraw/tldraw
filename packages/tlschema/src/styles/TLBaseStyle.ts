/** @public */
export const TL_STYLE_TYPES = new Set([
	'color',
	'labelColor',
	'dash',
	'fill',
	'size',
	'font',
	'align',
	'verticalAlign',
	'icon',
	'geo',
	'arrowheadStart',
	'arrowheadEnd',
	'spline',
] as const)

/** @public */
export type TLStyleType = any // SetValue<typeof TL_STYLE_TYPES>

/** @public */
export interface TLBaseStyle {
	id: string
	type: TLStyleType
	icon: string
}
