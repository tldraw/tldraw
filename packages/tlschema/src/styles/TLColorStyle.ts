import { Expand } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { StyleProp } from './StyleProp'

/** @public */
export const defaultColorNames = [
	'black',
	'grey',
	'light-violet',
	'violet',
	'blue',
	'light-blue',
	'yellow',
	'orange',
	'green',
	'light-green',
	'light-red',
	'red',
	'white',
] as const

/** @public */
export interface TLDefaultColorThemeColor {
	solid: string
	semi: string
	pattern: string
	fill: string // same as solid
	frame: {
		headingStroke: string
		headingFill: string
		stroke: string
		fill: string
		text: string
	}
	note: {
		fill: string
		text: string
	}
	highlight: {
		srgb: string
		p3: string
	}
}

/** @public */
export type TLDefaultColorTheme = Expand<
	{
		id: 'light' | 'dark'
		text: string
		background: string
		solid: string
	} & Record<(typeof defaultColorNames)[number], TLDefaultColorThemeColor>
>

/** @public */
export const DefaultColorThemePalette: {
	lightMode: TLDefaultColorTheme
	darkMode: TLDefaultColorTheme
} = {
	lightMode: {
		id: 'light',
		text: '#000000',
		background: '#f9fafb',
		solid: '#fcfffe',
		black: {
			solid: '#1d1d1d',
			fill: '#1d1d1d',
			frame: {
				headingStroke: '#717171',
				headingFill: '#ffffff',
				stroke: '#717171',
				fill: '#ffffff',
				text: '#000000',
			},
			note: {
				fill: '#FCE19C',
				text: '#000000',
			},
			semi: '#e8e8e8',
			pattern: '#494949',
			highlight: {
				srgb: '#fddd00',
				p3: 'color(display-p3 0.972 0.8205 0.05)',
			},
		},
		blue: {
			solid: '#4465e9',
			fill: '#4465e9',
			frame: {
				headingStroke: '#6681ec',
				headingFill: '#f9fafe',
				stroke: '#6681ec',
				fill: '#f9fafe',
				text: '#000000',
			},
			note: {
				fill: '#8AA3FF',
				text: '#000000',
			},
			semi: '#dce1f8',
			pattern: '#6681ee',
			highlight: {
				srgb: '#10acff',
				p3: 'color(display-p3 0.308 0.6632 0.9996)',
			},
		},
		green: {
			solid: '#099268',
			fill: '#099268',
			frame: {
				headingStroke: '#37a684',
				headingFill: '#f8fcfa',
				stroke: '#37a684',
				fill: '#f8fcfa',
				text: '#000000',
			},
			note: {
				fill: '#6FC896',
				text: '#000000',
			},
			semi: '#d3e9e3',
			pattern: '#39a785',
			highlight: {
				srgb: '#00ffc8',
				p3: 'color(display-p3 0.2536 0.984 0.7981)',
			},
		},
		grey: {
			solid: '#9fa8b2',
			fill: '#9fa8b2',
			frame: {
				headingStroke: '#aaaaab',
				headingFill: '#fbfcfc',
				stroke: '#aaaaab',
				fill: '#fcfcfd',
				text: '#000000',
			},
			note: {
				fill: '#C0CAD3',
				text: '#000000',
			},
			semi: '#eceef0',
			pattern: '#bcc3c9',
			highlight: {
				srgb: '#cbe7f1',
				p3: 'color(display-p3 0.8163 0.9023 0.9416)',
			},
		},
		'light-blue': {
			solid: '#4ba1f1',
			fill: '#4ba1f1',
			frame: {
				headingStroke: '#6cb2f3',
				headingFill: '#f8fbfe',
				stroke: '#6cb2f3',
				fill: '#fafcff',
				text: '#000000',
			},
			note: {
				fill: '#9BC4FD',
				text: '#000000',
			},
			semi: '#ddedfa',
			pattern: '#6fbbf8',
			highlight: {
				srgb: '#00f4ff',
				p3: 'color(display-p3 0.1512 0.9414 0.9996)',
			},
		},
		'light-green': {
			solid: '#4cb05e',
			fill: '#4cb05e',
			frame: {
				headingStroke: '#6dbe7c',
				headingFill: '#f8fcf9',
				stroke: '#6dbe7c',
				fill: '#fafdfa',
				text: '#000000',
			},
			note: {
				fill: '#98D08A',
				text: '#000000',
			},
			semi: '#dbf0e0',
			pattern: '#65cb78',
			highlight: {
				srgb: '#65f641',
				p3: 'color(display-p3 0.563 0.9495 0.3857)',
			},
		},
		'light-red': {
			solid: '#f87777',
			fill: '#f87777',
			frame: {
				headingStroke: '#f89090',
				headingFill: '#fffafa',
				stroke: '#f89090',
				fill: '#fffbfb',
				text: '#000000',
			},
			note: {
				fill: '#F7A5A1',
				text: '#000000',
			},
			semi: '#f4dadb',
			pattern: '#fe9e9e',
			highlight: {
				srgb: '#ff7fa3',
				p3: 'color(display-p3 0.9988 0.5301 0.6397)',
			},
		},
		'light-violet': {
			solid: '#e085f4',
			fill: '#e085f4',
			frame: {
				headingStroke: '#e59bf5',
				headingFill: '#fefaff',
				stroke: '#e59bf5',
				fill: '#fefbff',
				text: '#000000',
			},
			note: {
				fill: '#DFB0F9',
				text: '#000000',
			},
			semi: '#f5eafa',
			pattern: '#e9acf8',
			highlight: {
				srgb: '#ff88ff',
				p3: 'color(display-p3 0.9676 0.5652 0.9999)',
			},
		},
		orange: {
			solid: '#e16919',
			fill: '#e16919',
			frame: {
				headingStroke: '#e68544',
				headingFill: '#fef9f6',
				stroke: '#e68544',
				fill: '#fef9f6',
				text: '#000000',
			},
			note: {
				fill: '#FAA475',
				text: '#000000',
			},
			semi: '#f8e2d4',
			pattern: '#f78438',
			highlight: {
				srgb: '#ffa500',
				p3: 'color(display-p3 0.9988 0.6905 0.266)',
			},
		},
		red: {
			solid: '#e03131',
			fill: '#e03131',
			frame: {
				headingStroke: '#e55757',
				headingFill: '#fef7f7',
				stroke: '#e55757',
				fill: '#fef9f9',
				text: '#000000',
			},
			note: {
				fill: '#FC8282',
				text: '#000000',
			},
			semi: '#f4dadb',
			pattern: '#e55959',
			highlight: {
				srgb: '#ff636e',
				p3: 'color(display-p3 0.9992 0.4376 0.45)',
			},
		},
		violet: {
			solid: '#ae3ec9',
			fill: '#ae3ec9',
			frame: {
				headingStroke: '#bc62d3',
				headingFill: '#fcf7fd',
				stroke: '#bc62d3',
				fill: '#fdf9fd',
				text: '#000000',
			},
			note: {
				fill: '#DB91FD',
				text: '#000000',
			},
			semi: '#ecdcf2',
			pattern: '#bd63d3',
			highlight: {
				srgb: '#c77cff',
				p3: 'color(display-p3 0.7469 0.5089 0.9995)',
			},
		},
		yellow: {
			solid: '#f1ac4b',
			fill: '#f1ac4b',
			frame: {
				headingStroke: '#f3bb6c',
				headingFill: '#fefcf8',
				stroke: '#f3bb6c',
				fill: '#fffdfa',
				text: '#000000',
			},
			note: {
				fill: '#FED49A',
				text: '#000000',
			},
			semi: '#f9f0e6',
			pattern: '#fecb92',
			highlight: {
				srgb: '#fddd00',
				p3: 'color(display-p3 0.972 0.8705 0.05)',
			},
		},
		white: {
			solid: '#FFFFFF',
			fill: '#FFFFFF',
			semi: '#f5f5f5',
			pattern: '#f9f9f9',
			frame: {
				headingStroke: '#7d7d7d',
				headingFill: '#ffffff',
				stroke: '#7d7d7d',
				fill: '#ffffff',
				text: '#000000',
			},
			note: {
				fill: '#FFFFFF',
				text: '#000000',
			},
			highlight: {
				srgb: '#ffffff',
				p3: 'color(display-p3 1 1 1)',
			},
		},
	},
	darkMode: {
		id: 'dark',
		text: 'hsl(210, 17%, 98%)',
		background: 'hsl(240, 5%, 6.5%)',
		solid: '#010403',

		black: {
			solid: '#f2f2f2',
			fill: '#f2f2f2',
			frame: {
				headingStroke: '#5c5c5c',
				headingFill: '#252525',
				stroke: '#5c5c5c',
				fill: '#0c0c0c',
				text: '#f2f2f2',
			},
			note: {
				fill: '#2c2c2c',
				text: '#f2f2f2',
			},
			semi: '#2c3036',
			pattern: '#989898',
			highlight: {
				srgb: '#d2b700',
				p3: 'color(display-p3 0.8078 0.6225 0.0312)',
			},
		},
		blue: {
			solid: '#4f72fc', // 3c60f0
			fill: '#4f72fc',
			frame: {
				headingStroke: '#384994',
				headingFill: '#1C2036',
				stroke: '#384994',
				fill: '#11141f',
				text: '#f2f2f2',
			},
			note: {
				fill: '#2A3F98',
				text: '#f2f2f2',
			},
			semi: '#262d40',
			pattern: '#3a4b9e',
			highlight: {
				srgb: '#0079d2',
				p3: 'color(display-p3 0.0032 0.4655 0.7991)',
			},
		},
		green: {
			solid: '#099268',
			fill: '#099268',
			frame: {
				headingStroke: '#10513C',
				headingFill: '#14241f',
				stroke: '#10513C',
				fill: '#0E1614',
				text: '#f2f2f2',
			},
			note: {
				fill: '#014429',
				text: '#f2f2f2',
			},
			semi: '#253231',
			pattern: '#366a53',
			highlight: {
				srgb: '#009774',
				p3: 'color(display-p3 0.0085 0.582 0.4604)',
			},
		},
		grey: {
			solid: '#9398b0',
			fill: '#9398b0',
			frame: {
				headingStroke: '#42474D',
				headingFill: '#23262A',
				stroke: '#42474D',
				fill: '#151719',
				text: '#f2f2f2',
			},
			note: {
				fill: '#56595F',
				text: '#f2f2f2',
			},
			semi: '#33373c',
			pattern: '#7c8187',
			highlight: {
				srgb: '#9cb4cb',
				p3: 'color(display-p3 0.6299 0.7012 0.7856)',
			},
		},
		'light-blue': {
			solid: '#4dabf7',
			fill: '#4dabf7',
			frame: {
				headingStroke: '#075797',
				headingFill: '#142839',
				stroke: '#075797',
				fill: '#0B1823',
				text: '#f2f2f2',
			},
			note: {
				fill: '#1F5495',
				text: '#f2f2f2',
			},
			semi: '#2a3642',
			pattern: '#4d7aa9',
			highlight: {
				srgb: '#00bdc8',
				p3: 'color(display-p3 0.0023 0.7259 0.7735)',
			},
		},
		'light-green': {
			solid: '#40c057',
			fill: '#40c057',
			frame: {
				headingStroke: '#1C5427',
				headingFill: '#18251A',
				stroke: '#1C5427',
				fill: '#0F1911',
				text: '#f2f2f2',
			},
			note: {
				fill: '#21581D',
				text: '#f2f2f2',
			},
			semi: '#2a3830',
			pattern: '#4e874e',
			highlight: {
				srgb: '#00a000',
				p3: 'color(display-p3 0.2711 0.6172 0.0195)',
			},
		},
		'light-red': {
			solid: '#ff8787',
			fill: '#ff8787',
			frame: {
				headingStroke: '#6f3232', // Darker and desaturated variant of solid
				headingFill: '#341818', // Deep, muted dark red
				stroke: '#6f3232', // Matches headingStroke
				fill: '#181212', // Darker, muted background shade
				text: '#f2f2f2', // Consistent bright text color
			},
			note: {
				fill: '#7a3333', // Medium-dark, muted variant of solid
				text: '#f2f2f2',
			},
			semi: '#3c2b2b', // Subdued, darker neutral-red tone
			pattern: '#a56767', // Existing pattern shade retained
			highlight: {
				srgb: '#db005b',
				p3: 'color(display-p3 0.7849 0.0585 0.3589)',
			},
		},
		'light-violet': {
			solid: '#e599f7',
			fill: '#e599f7',
			frame: {
				headingStroke: '#6c367a',
				headingFill: '#2D2230',
				stroke: '#6c367a',
				fill: '#1C151E',
				text: '#f2f2f2',
			},
			note: {
				fill: '#762F8E',
				text: '#f2f2f2',
			},
			semi: '#383442',
			pattern: '#9770a9',
			highlight: {
				srgb: '#c400c7',
				p3: 'color(display-p3 0.7024 0.0403 0.753)',
			},
		},
		orange: {
			solid: '#f76707',
			fill: '#f76707',
			frame: {
				headingStroke: '#773a0e', // Darker, muted version of solid
				headingFill: '#2f1d13', // Deep, warm, muted background
				stroke: '#773a0e', // Matches headingStroke
				fill: '#1c1512', // Darker, richer muted background
				text: '#f2f2f2', // Bright text for contrast
			},
			note: {
				fill: '#7c3905', // Muted dark variant for note fill
				text: '#f2f2f2',
			},
			semi: '#3b2e27', // Muted neutral-orange tone
			pattern: '#9f552d', // Retained existing shade
			highlight: {
				srgb: '#d07a00',
				p3: 'color(display-p3 0.7699 0.4937 0.0085)',
			},
		},
		red: {
			solid: '#e03131',
			fill: '#e03131',
			frame: {
				headingStroke: '#701e1e', // Darker, muted variation of solid
				headingFill: '#301616', // Deep, muted reddish backdrop
				stroke: '#701e1e', // Matches headingStroke
				fill: '#1b1313', // Rich, dark muted background
				text: '#f2f2f2', // Bright text for readability
			},
			note: {
				fill: '#7e201f', // Muted dark variant for note fill
				text: '#f2f2f2',
			},
			semi: '#382726', // Dark neutral-red tone
			pattern: '#8f3734', // Existing pattern color retained
			highlight: {
				srgb: '#de002c',
				p3: 'color(display-p3 0.7978 0.0509 0.2035)',
			},
		},
		violet: {
			solid: '#ae3ec9',
			fill: '#ae3ec9',
			frame: {
				headingStroke: '#6d1583', // Darker, muted variation of solid
				headingFill: '#27152e', // Deep, rich muted violet backdrop
				stroke: '#6d1583', // Matches headingStroke
				fill: '#1b0f21', // Darker muted violet background
				text: '#f2f2f2', // Consistent bright text color
			},
			note: {
				fill: '#5f1c70', // Muted dark variant for note fill
				text: '#f2f2f2',
			},
			semi: '#342938', // Dark neutral-violet tone
			pattern: '#763a8b', // Retained existing pattern color
			highlight: {
				srgb: '#9e00ee',
				p3: 'color(display-p3 0.5651 0.0079 0.8986)',
			},
		},
		yellow: {
			solid: '#ffc034',
			fill: '#ffc034',
			frame: {
				headingStroke: '#684e12', // Darker, muted variant of solid
				headingFill: '#2a2113', // Rich, muted dark-yellow background
				stroke: '#684e12', // Matches headingStroke
				fill: '#1e1911', // Darker muted shade for background fill
				text: '#f2f2f2', // Bright text color for readability
			},
			note: {
				fill: '#8a5e1c', // Muted, dark complementary variant
				text: '#f2f2f2',
			},
			semi: '#3b352b', // Dark muted neutral-yellow tone
			pattern: '#fecb92', // Existing shade retained
			highlight: {
				srgb: '#d2b700',
				p3: 'color(display-p3 0.8078 0.7225 0.0312)',
			},
		},
		white: {
			solid: '#f3f3f3',
			fill: '#f3f3f3',
			semi: '#f5f5f5',
			pattern: '#f9f9f9',
			frame: {
				headingStroke: '#ffffff',
				headingFill: '#ffffff',
				stroke: '#ffffff',
				fill: '#ffffff',
				text: '#000000',
			},
			note: {
				fill: '#eaeaea',
				text: '#1d1d1d',
			},
			highlight: {
				srgb: '#ffffff',
				p3: 'color(display-p3 1 1 1)',
			},
		},
	},
}

/** @public */
export function getDefaultColorTheme(opts: { isDarkMode: boolean }): TLDefaultColorTheme {
	return opts.isDarkMode ? DefaultColorThemePalette.darkMode : DefaultColorThemePalette.lightMode
}

/** @public */
export const DefaultColorStyle = StyleProp.defineEnum('tldraw:color', {
	defaultValue: 'black',
	values: defaultColorNames,
})

/** @public */
export const DefaultLabelColorStyle = StyleProp.defineEnum('tldraw:labelColor', {
	defaultValue: 'black',
	values: defaultColorNames,
})

/** @public */
export type TLDefaultColorStyle = T.TypeOf<typeof DefaultColorStyle>
