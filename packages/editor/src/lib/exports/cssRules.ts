export type Styles = { [K in string]?: string }
export type ReadonlyStyles = { readonly [K in string]?: string }

type CanSkipRule = (
	value: string,
	property: string,
	options: {
		getStyle(property: string): string
		parentStyles: ReadonlyStyles
		defaultStyles: ReadonlyStyles
		currentColor: string
	}
) => boolean

const isCoveredByCurrentColor: CanSkipRule = (value, property, { currentColor }) => {
	return value === 'currentColor' || value === currentColor
}

const isInherited: CanSkipRule = (value, property, { parentStyles }) => {
	return parentStyles[property] === value
}

// see comment below about why we exclude border styles
const isExcludedBorder =
	(borderDirection: string): CanSkipRule =>
	(value, property, { getStyle }) => {
		const borderWidth = getStyle(`border-${borderDirection}-width`)
		const borderStyle = getStyle(`border-${borderDirection}-style`)

		if (borderWidth === '0px') return true
		if (borderStyle === 'none') return true
		return false
	}

export const cssRules = {
	// currentColor properties:
	'border-block-end-color': isCoveredByCurrentColor,
	'border-block-start-color': isCoveredByCurrentColor,
	'border-bottom-color': isCoveredByCurrentColor,
	'border-inline-end-color': isCoveredByCurrentColor,
	'border-inline-start-color': isCoveredByCurrentColor,
	'border-left-color': isCoveredByCurrentColor,
	'border-right-color': isCoveredByCurrentColor,
	'border-top-color': isCoveredByCurrentColor,
	'caret-color': isCoveredByCurrentColor,
	'column-rule-color': isCoveredByCurrentColor,
	'outline-color': isCoveredByCurrentColor,
	'text-decoration': (value, property, { currentColor }) => {
		return value === 'none solid currentColor' || value === 'none solid ' + currentColor
	},
	'text-decoration-color': isCoveredByCurrentColor,
	'text-emphasis-color': isCoveredByCurrentColor,

	// inherited properties:
	'border-collapse': isInherited,
	'border-spacing': isInherited,
	'caption-side': isInherited,
	// N.B. We shouldn't inherit 'color' because there's some UA styling, e.g. `mark` elements
	// 'color': isInherited,
	cursor: isInherited,
	direction: isInherited,
	'empty-cells': isInherited,
	'font-family': isInherited,
	'font-size': isInherited,
	'font-style': isInherited,
	'font-variant': isInherited,
	'font-weight': isInherited,
	'font-size-adjust': isInherited,
	'font-stretch': isInherited,
	font: isInherited,
	'letter-spacing': isInherited,
	'line-height': isInherited,
	'list-style-image': isInherited,
	'list-style-position': isInherited,
	'list-style-type': isInherited,
	'list-style': isInherited,
	orphans: isInherited,
	'overflow-wrap': isInherited,
	quotes: isInherited,
	'stroke-linecap': isInherited,
	'stroke-linejoin': isInherited,
	'tab-size': isInherited,
	'text-align': isInherited,
	'text-align-last': isInherited,
	'text-indent': isInherited,
	'text-justify': isInherited,
	'text-shadow': isInherited,
	'text-transform': isInherited,
	visibility: isInherited,
	'white-space': isInherited,
	'white-space-collapse': isInherited,
	widows: isInherited,
	'word-break': isInherited,
	'word-spacing': isInherited,
	'word-wrap': isInherited,

	// special border cases - we have a weird case (tailwind seems to trigger this) where all
	// border-styles sometimes get set to 'solid', but the border-width is 0 so they don't render.
	// but in SVGs, **sometimes**, the border-width defaults (i think from a UA style-sheet? but
	// honestly can't tell) to 1.5px so the border displays. we work around this by only including
	// border styles at all if both the border-width and border-style are set to something that
	// would show a border.
	'border-top': isExcludedBorder('top'),
	'border-right': isExcludedBorder('right'),
	'border-bottom': isExcludedBorder('bottom'),
	'border-left': isExcludedBorder('left'),
	'border-block-end': isExcludedBorder('block-end'),
	'border-block-start': isExcludedBorder('block-start'),
	'border-inline-end': isExcludedBorder('inline-end'),
	'border-inline-start': isExcludedBorder('inline-start'),
	'border-top-style': isExcludedBorder('top'),
	'border-right-style': isExcludedBorder('right'),
	'border-bottom-style': isExcludedBorder('bottom'),
	'border-left-style': isExcludedBorder('left'),
	'border-block-end-style': isExcludedBorder('block-end'),
	'border-block-start-style': isExcludedBorder('block-start'),
	'border-inline-end-style': isExcludedBorder('inline-end'),
	'border-inline-start-style': isExcludedBorder('inline-start'),
	'border-top-width': isExcludedBorder('top'),
	'border-right-width': isExcludedBorder('right'),
	'border-bottom-width': isExcludedBorder('bottom'),
	'border-left-width': isExcludedBorder('left'),
	'border-block-end-width': isExcludedBorder('block-end'),
	'border-block-start-width': isExcludedBorder('block-start'),
	'border-inline-end-width': isExcludedBorder('inline-end'),
} satisfies Record<string, CanSkipRule>
