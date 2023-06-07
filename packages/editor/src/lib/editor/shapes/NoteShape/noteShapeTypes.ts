import {
	TLAlignType,
	TLBaseShape,
	TLColorType,
	TLFontType,
	TLSizeType,
	TLVerticalAlignType,
} from '@tldraw/tlschema'

/** @public */
export type TLNoteShapeProps = {
	color: TLColorType
	size: TLSizeType
	font: TLFontType
	align: TLAlignType
	verticalAlign: TLVerticalAlignType
	growY: number
	url: string
	text: string
}

/** @public */
export type TLNoteShape = TLBaseShape<'note', TLNoteShapeProps>
