import { defineMigrations } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { DefaultColorStyle } from '../styles/TLColorStyle'
import { DefaultSizeStyle } from '../styles/TLSizeStyle'
import { ShapePropsType, TLBaseShape } from './TLBaseShape'
import { DrawShapeSegment } from './TLDrawShape'

/** @public */
export const highlightShapeProps = {
	color: DefaultColorStyle,
	size: DefaultSizeStyle,
	segments: T.arrayOf(DrawShapeSegment),
	isComplete: T.boolean,
	isPen: T.boolean,
}

/** @public */
export type TLHighlightShapeProps = ShapePropsType<typeof highlightShapeProps>

/** @public */
export type TLHighlightShape = TLBaseShape<'highlight', TLHighlightShapeProps>

/** @internal */
export const highlightShapeMigrations = defineMigrations({})
