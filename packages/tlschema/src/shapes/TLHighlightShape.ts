import { T } from '@tldraw/validate'
import { createShapePropsMigrationSequence } from '../records/TLShape'
import { RecordPropsType } from '../recordsWithProps'
import { DefaultColorStyle } from '../styles/TLColorStyle'
import { DefaultSizeStyle } from '../styles/TLSizeStyle'
import { TLBaseShape } from './TLBaseShape'
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
export type TLHighlightShapeProps = RecordPropsType<typeof highlightShapeProps>

/** @public */
export type TLHighlightShape = TLBaseShape<'highlight', TLHighlightShapeProps>

/** @public */
export const highlightShapeMigrations = createShapePropsMigrationSequence({ sequence: [] })
