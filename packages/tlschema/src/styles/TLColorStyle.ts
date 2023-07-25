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
] as const

/** @public */
export type TLDefaultColorThemeColor = {
	solid: string
	semi: string
	pattern: string
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
			semi: '#e8e8e8',
			pattern: '#494949',
			highlight: {
				srgb: '#fddd00',
				p3: 'color(display-p3 0.972 0.8705 0.05)',
			},
		},
		blue: {
			solid: '#4263eb',
			semi: '#dce1f8',
			pattern: '#6681ee',
			highlight: {
				srgb: '#10acff',
				p3: 'color(display-p3 0.308 0.6632 0.9996)',
			},
		},
		green: {
			solid: '#099268',
			semi: '#d3e9e3',
			pattern: '#39a785',
			highlight: {
				srgb: '#00ffc8',
				p3: 'color(display-p3 0.2536 0.984 0.7981)',
			},
		},
		grey: {
			solid: '#adb5bd',
			semi: '#eceef0',
			pattern: '#bcc3c9',
			highlight: {
				srgb: '#cbe7f1',
				p3: 'color(display-p3 0.8163 0.9023 0.9416)',
			},
		},
		'light-blue': {
			solid: '#4dabf7',
			semi: '#ddedfa',
			pattern: '#6fbbf8',
			highlight: {
				srgb: '#00f4ff',
				p3: 'color(display-p3 0.1512 0.9414 0.9996)',
			},
		},
		'light-green': {
			solid: '#40c057',
			semi: '#dbf0e0',
			pattern: '#65cb78',
			highlight: {
				srgb: '#65f641',
				p3: 'color(display-p3 0.563 0.9495 0.3857)',
			},
		},
		'light-red': {
			solid: '#ff8787',
			semi: '#f4dadb',
			pattern: '#fe9e9e',
			highlight: {
				srgb: '#ff7fa3',
				p3: 'color(display-p3 0.9988 0.5301 0.6397)',
			},
		},
		'light-violet': {
			solid: '#e599f7',
			semi: '#f5eafa',
			pattern: '#e9acf8',
			highlight: {
				srgb: '#ff88ff',
				p3: 'color(display-p3 0.9676 0.5652 0.9999)',
			},
		},
		orange: {
			solid: '#f76707',
			semi: '#f8e2d4',
			pattern: '#f78438',
			highlight: {
				srgb: '#ffa500',
				p3: 'color(display-p3 0.9988 0.6905 0.266)',
			},
		},
		red: {
			solid: '#e03131',
			semi: '#f4dadb',
			pattern: '#e55959',
			highlight: {
				srgb: '#ff636e',
				p3: 'color(display-p3 0.9992 0.4376 0.45)',
			},
		},
		violet: {
			solid: '#ae3ec9',
			semi: '#ecdcf2',
			pattern: '#bd63d3',
			highlight: {
				srgb: '#c77cff',
				p3: 'color(display-p3 0.7469 0.5089 0.9995)',
			},
		},
		yellow: {
			solid: '#ffc078',
			semi: '#f9f0e6',
			pattern: '#fecb92',
			highlight: {
				srgb: '#fddd00',
				p3: 'color(display-p3 0.972 0.8705 0.05)',
			},
		},
	},
	darkMode: {
		id: 'dark',
		text: '#f8f9fa',
		background: '#212529',
		solid: '#28292e',

		black: {
			solid: '#e1e1e1',
			semi: '#2c3036',
			pattern: '#989898',
			highlight: {
				srgb: '#d2b700',
				p3: 'color(display-p3 0.8078 0.7225 0.0312)',
			},
		},
		blue: {
			solid: '#4156be',
			semi: '#262d40',
			pattern: '#3a4b9e',
			highlight: {
				srgb: '#0079d2',
				p3: 'color(display-p3 0.0032 0.4655 0.7991)',
			},
		},
		green: {
			solid: '#3b7b5e',
			semi: '#253231',
			pattern: '#366a53',
			highlight: {
				srgb: '#009774',
				p3: 'color(display-p3 0.0085 0.582 0.4604)',
			},
		},
		grey: {
			solid: '#93989f',
			semi: '#33373c',
			pattern: '#7c8187',
			highlight: {
				srgb: '#9cb4cb',
				p3: 'color(display-p3 0.6299 0.7012 0.7856)',
			},
		},
		'light-blue': {
			solid: '#588fc9',
			semi: '#2a3642',
			pattern: '#4d7aa9',
			highlight: {
				srgb: '#00bdc8',
				p3: 'color(display-p3 0.0023 0.7259 0.7735)',
			},
		},
		'light-green': {
			solid: '#599f57',
			semi: '#2a3830',
			pattern: '#4e874e',
			highlight: {
				srgb: '#00a000',
				p3: 'color(display-p3 0.2711 0.6172 0.0195)',
			},
		},
		'light-red': {
			solid: '#c67877',
			semi: '#3b3235',
			pattern: '#a56767',
			highlight: {
				srgb: '#db005b',
				p3: 'color(display-p3 0.7849 0.0585 0.3589)',
			},
		},
		'light-violet': {
			solid: '#b583c9',
			semi: '#383442',
			pattern: '#9770a9',
			highlight: {
				srgb: '#c400c7',
				p3: 'color(display-p3 0.7024 0.0403 0.753)',
			},
		},
		orange: {
			solid: '#bf612e',
			semi: '#3a2e2a',
			pattern: '#9f552d',
			highlight: {
				srgb: '#d07a00',
				p3: 'color(display-p3 0.7699 0.4937 0.0085)',
			},
		},
		red: {
			solid: '#aa3c37',
			semi: '#36292b',
			pattern: '#8f3734',
			highlight: {
				srgb: '#de002c',
				p3: 'color(display-p3 0.7978 0.0509 0.2035)',
			},
		},
		violet: {
			solid: '#873fa3',
			semi: '#31293c',
			pattern: '#763a8b',
			highlight: {
				srgb: '#9e00ee',
				p3: 'color(display-p3 0.5651 0.0079 0.8986)',
			},
		},
		yellow: {
			solid: '#cba371',
			semi: '#3c3934',
			pattern: '#fecb92',
			highlight: {
				srgb: '#d2b700',
				p3: 'color(display-p3 0.8078 0.7225 0.0312)',
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
