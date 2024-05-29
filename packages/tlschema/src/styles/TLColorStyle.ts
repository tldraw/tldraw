import { Expand } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { StyleProp } from './StyleProp'

const colors = [
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
	} & Record<(typeof colors)[number], TLDefaultColorThemeColor>
>

/** @public */
export const DefaultColorThemePalette: {
	lightMode: TLDefaultColorTheme
	darkMode: TLDefaultColorTheme
} = {
	lightMode: {
		id: 'light',
		text: '#000000',
		background: 'rgb(249, 250, 251)',
		solid: '#fcfffe',
		black: {
			solid: '#1d1d1d',
			note: {
				fill: '#FCE19C',
				text: '#000000',
			},
			semi: '#e8e8e8',
			pattern: '#494949',
			highlight: {
				srgb: '#fddd00',
				p3: 'color(display-p3 0.972 0.8705 0.05)',
			},
		},
		blue: {
			solid: '#4465e9',
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
			semi: '#f5f5f5',
			pattern: '#f9f9f9',
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
			note: {
				fill: '#2c2c2c',
				text: '#f2f2f2',
			},
			semi: '#2c3036',
			pattern: '#989898',
			highlight: {
				srgb: '#d2b700',
				p3: 'color(display-p3 0.8078 0.7225 0.0312)',
			},
		},
		blue: {
			solid: '#4f72fc', // 3c60f0
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
			note: {
				fill: '#923632',
				text: '#f2f2f2',
			},
			semi: '#3b3235',
			pattern: '#a56767',
			highlight: {
				srgb: '#db005b',
				p3: 'color(display-p3 0.7849 0.0585 0.3589)',
			},
		},
		'light-violet': {
			solid: '#e599f7',
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
			note: {
				fill: '#843906',
				text: '#f2f2f2',
			},
			semi: '#3a2e2a',
			pattern: '#9f552d',
			highlight: {
				srgb: '#d07a00',
				p3: 'color(display-p3 0.7699 0.4937 0.0085)',
			},
		},
		red: {
			solid: '#e03131',
			note: {
				fill: '#89231A',
				text: '#f2f2f2',
			},
			semi: '#36292b',
			pattern: '#8f3734',
			highlight: {
				srgb: '#de002c',
				p3: 'color(display-p3 0.7978 0.0509 0.2035)',
			},
		},
		violet: {
			solid: '#ae3ec9',
			note: {
				fill: '#681683',
				text: '#f2f2f2',
			},
			semi: '#31293c',
			pattern: '#763a8b',
			highlight: {
				srgb: '#9e00ee',
				p3: 'color(display-p3 0.5651 0.0079 0.8986)',
			},
		},
		yellow: {
			solid: '#ffc034',
			note: {
				fill: '#98571B',
				text: '#f2f2f2',
			},
			semi: '#3c3934',
			pattern: '#fecb92',
			highlight: {
				srgb: '#d2b700',
				p3: 'color(display-p3 0.8078 0.7225 0.0312)',
			},
		},
		white: {
			solid: '#f3f3f3',
			semi: '#f5f5f5',
			pattern: '#f9f9f9',
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
	values: colors,
})

/** @public */
export const DefaultLabelColorStyle = StyleProp.defineEnum('tldraw:labelColor', {
	defaultValue: 'black',
	values: colors,
})

/** @public */
export type TLDefaultColorStyle = T.TypeOf<typeof DefaultColorStyle>
