import { TLColorType } from '../../../schema/styles/TLColorStyle'

export type TLExportColors = {
	fill: Record<TLColorType, string>
	pattern: Record<TLColorType, string>
	semi: Record<TLColorType, string>
	highlight: Record<TLColorType, string>
	solid: string
	text: string
	background: string
}
