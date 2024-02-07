import { T } from '@tldraw/validate'
import { DefaultColorStyle } from '../styles/TLColorStyle'
import { DefaultFontStyle } from '../styles/TLFontStyle'
import { DefaultHorizontalAlignStyle } from '../styles/TLHorizontalAlignStyle'
import { DefaultSizeStyle } from '../styles/TLSizeStyle'
import { ShapePropsType, TLBaseShape } from './TLBaseShape'

/** @public */
export const textShapeProps = {
	color: DefaultColorStyle,
	size: DefaultSizeStyle,
	font: DefaultFontStyle,
	align: DefaultHorizontalAlignStyle,
	w: T.nonZeroNumber,
	text: T.string,
	scale: T.nonZeroNumber,
	autoSize: T.boolean,
}

/** @public */
export type TLTextShapeProps = ShapePropsType<typeof textShapeProps>

/** @public */
export type TLTextShape = TLBaseShape<'text', TLTextShapeProps>
