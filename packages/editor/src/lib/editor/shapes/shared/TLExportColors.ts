import { TLDefaultColorStyle } from '@tldraw/tlschema'

export type TLExportColors = {
	fill: Record<TLDefaultColorStyle, string>
	pattern: Record<TLDefaultColorStyle, string>
	semi: Record<TLDefaultColorStyle, string>
	highlight: Record<TLDefaultColorStyle, string>
	solid: string
	text: string
	background: string
}
