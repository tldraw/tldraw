import {
	TLArrowTerminal,
	TLArrowheadType,
	TLBaseShape,
	TLColorType,
	TLDashType,
	TLFillType,
	TLFontType,
	TLSizeType,
} from '@tldraw/tlschema'

/** @public */
export type TLArrowShapeProps = {
	labelColor: TLColorType
	color: TLColorType
	fill: TLFillType
	dash: TLDashType
	size: TLSizeType
	arrowheadStart: TLArrowheadType
	arrowheadEnd: TLArrowheadType
	font: TLFontType
	start: TLArrowTerminal
	end: TLArrowTerminal
	bend: number
	text: string
}

/** @public */
export type TLArrowShape = TLBaseShape<'arrow', TLArrowShapeProps>
