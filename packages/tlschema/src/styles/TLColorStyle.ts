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
