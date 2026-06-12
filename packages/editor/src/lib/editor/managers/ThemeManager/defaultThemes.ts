import {
	DefaultFontFamilies,
	TLDefaultColor,
	TLDefaultColorStyle,
	TLTheme,
	TLThemeColors,
} from '@tldraw/tlschema'

function makeFont(name: 'draw' | 'sans' | 'serif' | 'mono') {
	const family = `tldraw_${name}`
	return {
		fontFamily: DefaultFontFamilies[name],
		faces: (['normal', 'italic'] as const).flatMap((style) =>
			(['normal', 'bold'] as const).map((weight) => ({
				family,
				src: {
					url: `${family}${style === 'italic' ? '_italic' : ''}${weight === 'bold' ? '_bold' : ''}`,
					format: 'woff2' as const,
				},
				weight,
				style,
			}))
		),
	}
}

// Builds a TLDefaultColor from values in this fixed order.
function c(
	solid: string,
	fill: string,
	linedFill: string,
	frameHeadingStroke: string,
	frameHeadingFill: string,
	frameStroke: string,
	frameFill: string,
	frameText: string,
	noteFill: string,
	noteText: string,
	semi: string,
	pattern: string,
	highlightSrgb: string,
	highlightP3: string
): TLDefaultColor {
	return {
		solid,
		fill,
		linedFill,
		frameHeadingStroke,
		frameHeadingFill,
		frameStroke,
		frameFill,
		frameText,
		noteFill,
		noteText,
		semi,
		pattern,
		highlightSrgb,
		highlightP3,
	}
}

/**
 * The default theme definition containing color palettes for both light and dark modes.
 *
 * @public
 */
export const DEFAULT_THEME: TLTheme = {
	id: 'default',
	fontSize: 16,
	lineHeight: 1.35,
	strokeWidth: 2,
	fonts: {
		draw: makeFont('draw'),
		sans: makeFont('sans'),
		serif: makeFont('serif'),
		mono: makeFont('mono'),
	},
	colors: {
		light: {
			text: '#000000',
			background: '#f9fafb',
			negativeSpace: '#f9fafb',
			solid: '#fcfffe',
			cursor: 'black',
			noteBorder: 'rgb(144, 144, 144)',
			snap: 'hsl(0, 76%, 60%)',
			selectionStroke: 'hsl(214, 84%, 56%)',
			selectionFill: 'hsl(210, 100%, 56%, 24%)',
			brushFill: 'hsl(0, 0%, 56%, 10.2%)',
			brushStroke: 'hsl(0, 0%, 56%, 25.1%)',
			selectedContrast: '#ffffff',
			laser: 'hsl(0, 100%, 50%)',
			// prettier-ignore
			black: c('#1d1d1d', '#1d1d1d', '#363636', '#717171', '#ffffff', '#717171', '#ffffff', '#000000', '#FCE19C', '#000000', '#e8e8e8', '#494949', '#fddd00', 'color(display-p3 0.972 0.8205 0.05)'),
			// prettier-ignore
			blue: c('#4465e9', '#4465e9', '#6580ec', '#6681ec', '#f9fafe', '#6681ec', '#f9fafe', '#000000', '#8AA3FF', '#000000', '#dce1f8', '#6681ee', '#10acff', 'color(display-p3 0.308 0.6632 0.9996)'),
			// prettier-ignore
			green: c('#099268', '#099268', '#0bad7c', '#37a684', '#f8fcfa', '#37a684', '#f8fcfa', '#000000', '#6FC896', '#000000', '#d3e9e3', '#39a785', '#00ffc8', 'color(display-p3 0.2536 0.984 0.7981)'),
			// prettier-ignore
			grey: c('#9fa8b2', '#9fa8b2', '#bbc1c9', '#aaaaab', '#fbfcfc', '#aaaaab', '#fcfcfd', '#000000', '#C0CAD3', '#000000', '#eceef0', '#bcc3c9', '#cbe7f1', 'color(display-p3 0.8163 0.9023 0.9416)'),
			// prettier-ignore
			'light-blue': c('#4ba1f1', '#4ba1f1', '#7abaf5', '#6cb2f3', '#f8fbfe', '#6cb2f3', '#fafcff', '#000000', '#9BC4FD', '#000000', '#ddedfa', '#6fbbf8', '#00f4ff', 'color(display-p3 0.1512 0.9414 0.9996)'),
			// prettier-ignore
			'light-green': c('#4cb05e', '#4cb05e', '#7ec88c', '#6dbe7c', '#f8fcf9', '#6dbe7c', '#fafdfa', '#000000', '#98D08A', '#000000', '#dbf0e0', '#65cb78', '#65f641', 'color(display-p3 0.563 0.9495 0.3857)'),
			// prettier-ignore
			'light-red': c('#f87777', '#f87777', '#f99a9a', '#f89090', '#fffafa', '#f89090', '#fffbfb', '#000000', '#F7A5A1', '#000000', '#f4dadb', '#fe9e9e', '#ff7fa3', 'color(display-p3 0.9988 0.5301 0.6397)'),
			// prettier-ignore
			'light-violet': c('#e085f4', '#e085f4', '#e9abf7', '#e59bf5', '#fefaff', '#e59bf5', '#fefbff', '#000000', '#DFB0F9', '#000000', '#f5eafa', '#e9acf8', '#ff88ff', 'color(display-p3 0.9676 0.5652 0.9999)'),
			// prettier-ignore
			orange: c('#e16919', '#e16919', '#ea8643', '#e68544', '#fef9f6', '#e68544', '#fef9f6', '#000000', '#FAA475', '#000000', '#f8e2d4', '#f78438', '#ffa500', 'color(display-p3 0.9988 0.6905 0.266)'),
			// prettier-ignore
			red: c('#e03131', '#e03131', '#e75f5f', '#e55757', '#fef7f7', '#e55757', '#fef9f9', '#000000', '#FC8282', '#000000', '#f4dadb', '#e55959', '#ff636e', 'color(display-p3 0.9992 0.4376 0.45)'),
			// prettier-ignore
			violet: c('#ae3ec9', '#ae3ec9', '#be68d4', '#bc62d3', '#fcf7fd', '#bc62d3', '#fdf9fd', '#000000', '#DB91FD', '#000000', '#ecdcf2', '#bd63d3', '#c77cff', 'color(display-p3 0.7469 0.5089 0.9995)'),
			// prettier-ignore
			yellow: c('#f1ac4b', '#f1ac4b', '#f5c27a', '#f3bb6c', '#fefcf8', '#f3bb6c', '#fffdfa', '#000000', '#FED49A', '#000000', '#f9f0e6', '#fecb92', '#fddd00', 'color(display-p3 0.972 0.8705 0.05)'),
			// prettier-ignore
			white: c('#FFFFFF', '#FFFFFF', '#ffffff', '#7d7d7d', '#ffffff', '#7d7d7d', '#ffffff', '#000000', '#FFFFFF', '#000000', '#f5f5f5', '#f9f9f9', '#ffffff', 'color(display-p3 1 1 1)'),
		},
		dark: {
			text: 'hsl(210, 17%, 98%)',
			background: 'hsl(240, 5%, 6.5%)',
			negativeSpace: 'hsl(240, 5%, 6.5%)',
			solid: '#010403',
			cursor: 'white',
			noteBorder: 'rgb(20, 20, 20)',
			snap: 'hsl(0, 76%, 60%)',
			selectionStroke: 'hsl(214, 84%, 56%)',
			selectionFill: 'hsl(209, 100%, 57%, 20%)',
			brushFill: 'hsl(0, 0%, 56%, 10.2%)',
			brushStroke: 'hsl(0, 0%, 56%, 25.1%)',
			selectedContrast: '#ffffff',
			laser: 'hsl(0, 100%, 50%)',
			// prettier-ignore
			black: c('#f2f2f2', '#f2f2f2', '#ffffff', '#5c5c5c', '#252525', '#5c5c5c', '#0c0c0c', '#f2f2f2', '#2c2c2c', '#f2f2f2', '#2c3036', '#989898', '#d2b700', 'color(display-p3 0.8078 0.6225 0.0312)'),
			// prettier-ignore
			blue: c('#4f72fc', '#4f72fc', '#3c5cdd', '#384994', '#1C2036', '#384994', '#11141f', '#f2f2f2', '#2A3F98', '#f2f2f2', '#262d40', '#3a4b9e', '#0079d2', 'color(display-p3 0.0032 0.4655 0.7991)'),
			// prettier-ignore
			green: c('#099268', '#099268', '#087856', '#10513C', '#14241f', '#10513C', '#0E1614', '#f2f2f2', '#014429', '#f2f2f2', '#253231', '#366a53', '#009774', 'color(display-p3 0.0085 0.582 0.4604)'),
			// prettier-ignore
			grey: c('#9398b0', '#9398b0', '#8388a5', '#42474D', '#23262A', '#42474D', '#151719', '#f2f2f2', '#56595F', '#f2f2f2', '#33373c', '#7c8187', '#9cb4cb', 'color(display-p3 0.6299 0.7012 0.7856)'),
			// prettier-ignore
			'light-blue': c('#4dabf7', '#4dabf7', '#2793ec', '#075797', '#142839', '#075797', '#0B1823', '#f2f2f2', '#1F5495', '#f2f2f2', '#2a3642', '#4d7aa9', '#00bdc8', 'color(display-p3 0.0023 0.7259 0.7735)'),
			// prettier-ignore
			'light-green': c('#40c057', '#40c057', '#37a44b', '#1C5427', '#18251A', '#1C5427', '#0F1911', '#f2f2f2', '#21581D', '#f2f2f2', '#2a3830', '#4e874e', '#00a000', 'color(display-p3 0.2711 0.6172 0.0195)'),
			// prettier-ignore
			'light-red': c('#ff8787', '#ff8787', '#ff6666', '#6f3232', '#341818', '#6f3232', '#181212', '#f2f2f2', '#7a3333', '#f2f2f2', '#3c2b2b', '#a56767', '#db005b', 'color(display-p3 0.7849 0.0585 0.3589)'),
			// prettier-ignore
			'light-violet': c('#e599f7', '#e599f7', '#dc71f4', '#6c367a', '#2D2230', '#6c367a', '#1C151E', '#f2f2f2', '#762F8E', '#f2f2f2', '#383442', '#9770a9', '#c400c7', 'color(display-p3 0.7024 0.0403 0.753)'),
			// prettier-ignore
			orange: c('#f76707', '#f76707', '#f54900', '#773a0e', '#2f1d13', '#773a0e', '#1c1512', '#f2f2f2', '#7c3905', '#f2f2f2', '#3b2e27', '#9f552d', '#d07a00', 'color(display-p3 0.7699 0.4937 0.0085)'),
			// prettier-ignore
			red: c('#e03131', '#e03131', '#c31d1d', '#701e1e', '#301616', '#701e1e', '#1b1313', '#f2f2f2', '#7e201f', '#f2f2f2', '#382726', '#8f3734', '#de002c', 'color(display-p3 0.7978 0.0509 0.2035)'),
			// prettier-ignore
			violet: c('#ae3ec9', '#ae3ec9', '#8f2fa7', '#6d1583', '#27152e', '#6d1583', '#1b0f21', '#f2f2f2', '#5f1c70', '#f2f2f2', '#342938', '#763a8b', '#9e00ee', 'color(display-p3 0.5651 0.0079 0.8986)'),
			// prettier-ignore
			yellow: c('#ffc034', '#ffc034', '#ffae00', '#684e12', '#2a2113', '#684e12', '#1e1911', '#f2f2f2', '#8a5e1c', '#f2f2f2', '#3b352b', '#fecb92', '#d2b700', 'color(display-p3 0.8078 0.7225 0.0312)'),
			// prettier-ignore
			white: c('#f3f3f3', '#f3f3f3', '#f3f3f3', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#000000', '#eaeaea', '#1d1d1d', '#f5f5f5', '#f9f9f9', '#ffffff', 'color(display-p3 1 1 1)'),
		},
	},
}

/**
 * Resolves a color style value to its actual CSS color string for a given theme and variant.
 * If the color is not a default theme color, returns the color value as-is.
 *
 * @param colors - The color palette for the current color mode (e.g. `theme.colors[colorMode]`)
 * @param color - The color style value to resolve
 * @param variant - Which variant of the color to return (solid, fill, pattern, etc.)
 * @returns The CSS color string for the specified color and variant
 *
 * @example
 * ```ts
 * import { getColorValue } from 'tldraw'
 *
 * const colors = editor.getCurrentTheme().colors[editor.getColorMode()]
 *
 * // Get the solid variant of red
 * const redSolid = getColorValue(colors, 'red', 'solid') // '#e03131'
 *
 * // Get the fill variant of blue
 * const blueFill = getColorValue(colors, 'blue', 'fill') // '#4465e9'
 *
 * // Custom color passes through unchanged
 * const customColor = getColorValue(colors, '#ff0000', 'solid') // '#ff0000'
 * ```
 *
 * @public
 */
export function getColorValue(
	colors: TLThemeColors,
	color: TLDefaultColorStyle | string,
	variant: keyof TLDefaultColor
): string {
	const colorEntry = colors[color as TLDefaultColorStyle]
	if (!colorEntry || typeof colorEntry === 'string') {
		return color
	}
	return colorEntry[variant]
}
