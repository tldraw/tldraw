import {
	TLAlignType,
	TLBaseShape,
	TLColorType,
	TLDashType,
	TLFillType,
	TLFontType,
	TLGeoType,
	TLSizeType,
	TLVerticalAlignType,
} from '@tldraw/tlschema'

/** @public */
export type TLGeoShapeProps = {
	geo: TLGeoType
	labelColor: TLColorType
	color: TLColorType
	fill: TLFillType
	dash: TLDashType
	size: TLSizeType
	font: TLFontType
	align: TLAlignType
	verticalAlign: TLVerticalAlignType
	url: string
	w: number
	h: number
	text: string
	growY: number
}

/** @public */
export type TLGeoShape = TLBaseShape<'geo', TLGeoShapeProps>
