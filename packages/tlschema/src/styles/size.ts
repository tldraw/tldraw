import { TLStyle } from '../records/TLStyle'

/** @public */
export interface SizeStyle extends TLStyle {
	type: 'size'
	id: 's' | 'm' | 'l' | 'xl'
	theme: 'default'
	variant: 'strokeWidth' | 'fontSize' | 'labelFontSize' | 'arrowLabelFontSize'
	value: number
}

const sizeStyles: {
	[id: string]: {
		[theme: string]: {
			[variant: string]: number
		}
	}
} = {
	s: {
		default: {
			strokeWidth: 2,
			fontSize: 18,
			labelFontSize: 18,
			arrowLabelFontSize: 18,
		},
	},
	m: {
		default: {
			strokeWidth: 3.5,
			fontSize: 24,
			labelFontSize: 22,
			arrowLabelFontSize: 20,
		},
	},
	l: {
		default: {
			strokeWidth: 5,
			fontSize: 36,
			labelFontSize: 26,
			arrowLabelFontSize: 24,
		},
	},
	xl: {
		default: {
			strokeWidth: 10,
			fontSize: 44,
			labelFontSize: 32,
			arrowLabelFontSize: 28,
		},
	},
}

/** @public */
export const size = Object.entries(sizeStyles).flatMap(([id, themes]) =>
	Object.entries(themes).flatMap(([theme, variants]) =>
		Object.entries(variants).map(
			([variant, value]) =>
				({
					id,
					type: 'size',
					theme,
					value,
					variant,
				} as SizeStyle)
		)
	)
)
