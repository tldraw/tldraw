import { TLStyle } from '../records/TLStyle'

/** @public */
export interface ColorStyle extends TLStyle {
	type: 'color'
	id:
		| 'background'
		| 'solid'
		| 'grid'
		| 'accent'
		| 'brush fill'
		| 'brush stroke'
		| 'selected'
		| 'black'
		| 'yellow'
		| 'white'
		| 'violet'
		| 'red'
		| 'orange'
		| 'light-violet'
		| 'light-red'
		| 'light-green'
		| 'light-blue'
		| 'grey'
		| 'green'
		| 'blue'
	theme: 'default' | 'dark'
	variant: 'default' | 'semi' | 'pattern'
	value: string
}

const colorStyles = {
	background: {
		default: {
			default: '#f9fafb',
		},
		dark: {
			default: '#212529',
		},
	},
	solid: {
		default: {
			default: '#fcfffe',
		},
		dark: {
			default: '#28292e',
		},
	},
	// grid
	// accent
	// brush fill
	// brush stroke
	// selected
	black: {
		default: {
			default: '#1d1d1d',
			semi: '#e8e8e8',
			pattern: '#494949',
		},
		dark: {
			default: '#e1e1e1',
			semi: '#2c3036',
			pattern: '#989898',
		},
	},
	yellow: {
		default: {
			default: '#ffc078',
			semi: '#f9f0e6',
			pattern: '#fecb92',
		},
		dark: {
			default: '#cba371',
			semi: '#3c3934',
			pattern: '#fecb92',
		},
	},
	white: {
		default: {
			default: '#ffffff',
			semi: '#ffffff',
			pattern: '#ffffff',
		},
		dark: {
			default: '#1d1d1d',
			semi: '#ffffff',
			pattern: '#ffffff',
		},
	},
	violet: {
		default: {
			default: '#ae3ec9',
			semi: '#ecdcf2',
			pattern: '#bd63d3',
		},
		dark: {
			default: '#873fa3',
			semi: '#31293c',
			pattern: '#763a8b',
		},
	},
	red: {
		default: {
			default: '#e03131',
			semi: '#f4dadb',
			pattern: '#e55959',
		},
		dark: {
			default: '#aa3c37',
			semi: '#36292b',
			pattern: '#8f3734',
		},
	},
	orange: {
		default: {
			default: '#f76707',
			semi: '#f8e2d4',
			pattern: '#f78438',
		},
		dark: {
			default: '#bf612e',
			semi: '#3a2e2a',
			pattern: '#9f552d',
		},
	},
	'light-violet': {
		default: {
			default: '#e599f7',
			semi: '#f5eafa',
			pattern: '#e9acf8',
		},
		dark: {
			default: '#b583c9',
			semi: '#383442',
			pattern: '#9770a9',
		},
	},
	'light-red': {
		default: {
			default: '#ff8787',
			semi: '#f4dadb',
			pattern: '#fe9e9e',
		},
		dark: {
			default: '#c67877',
			semi: '#3b3235',
			pattern: '#a56767',
		},
	},
	'light-green': {
		default: {
			default: '#40c057',
			semi: '#dbf0e0',
			pattern: '#65cb78',
		},
		dark: {
			default: '#599f57',
			semi: '#2a3830',
			pattern: '#4e874e',
		},
	},
	'light-blue': {
		default: {
			default: '#4dabf7',
			semi: '#ddedfa',
			pattern: '#6fbbf8',
		},
		dark: {
			default: '#588fc9',
			semi: '#2a3642',
			pattern: '#4d7aa9',
		},
	},
	grey: {
		default: {
			default: '#adb5bd',
			semi: '#eceef0',
			pattern: '#bcc3c9',
		},
		dark: {
			default: '#93989f',
			semi: '#33373c',
			pattern: '#7c8187',
		},
	},
	green: {
		default: {
			default: '#099268',
			semi: '#d3e9e3',
			pattern: '#39a785',
		},
		dark: {
			default: '#3b7b5e',
			semi: '#253231',
			pattern: '#366a53',
		},
	},
	blue: {
		default: {
			default: '#4263eb',
			semi: '#dce1f8',
			pattern: '#6681ee',
		},
		dark: {
			default: '#4156be',
			semi: '#262d40',
			pattern: '#3a4b9e',
		},
	},
}

/** @public */
export const color: TLStyle[] = Object.entries(colorStyles).flatMap(([id, themes]) =>
	Object.entries(themes).flatMap(([theme, variants]) =>
		Object.entries(variants).map(([variant, value]) => ({
			id,
			type: 'color',
			theme,
			value,
			variant,
		}))
	)
)
