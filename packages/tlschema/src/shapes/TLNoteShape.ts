import { T } from '@tldraw/validate'
import { DefaultColorStyle } from '../styles/TLColorStyle'
import { DefaultFontStyle } from '../styles/TLFontStyle'
import { DefaultHorizontalAlignStyle } from '../styles/TLHorizontalAlignStyle'
import { DefaultSizeStyle } from '../styles/TLSizeStyle'
import { DefaultVerticalAlignStyle } from '../styles/TLVerticalAlignStyle'
import { ShapePropsType, TLBaseShape } from './TLBaseShape'

/** @public */
export const noteShapeProps = {
	color: DefaultColorStyle,
	size: DefaultSizeStyle,
	font: DefaultFontStyle,
	align: DefaultHorizontalAlignStyle,
	verticalAlign: DefaultVerticalAlignStyle,
	growY: T.positiveNumber,
	url: T.linkUrl,
	text: T.string,
}

/** @public */
export type TLNoteShapeProps = ShapePropsType<typeof noteShapeProps>

/** @public */
export type TLNoteShape = TLBaseShape<'note', TLNoteShapeProps>
