import { T } from '@tldraw/validate'
import { createShapePropsMigrationIds, createShapePropsMigrationSequence } from '../records/TLShape'
import { RecordProps } from '../recordsWithProps'
import { DefaultColorStyle, TLDefaultColorStyle } from '../styles/TLColorStyle'
import { DefaultSizeStyle, TLDefaultSizeStyle } from '../styles/TLSizeStyle'
import { TLBaseShape } from './TLBaseShape'
import { DrawShapeSegment, TLDrawShapeSegment } from './TLDrawShape'

/** @public */
export interface TLHighlightShapeProps {
	color: TLDefaultColorStyle
	size: TLDefaultSizeStyle
	segments: TLDrawShapeSegment[]
	isComplete: boolean
	isPen: boolean
	scale: number
}

/** @public */
export type TLHighlightShape = TLBaseShape<'highlight', TLHighlightShapeProps>

/** @public */
export const highlightShapeProps: RecordProps<TLHighlightShape> = {
	color: DefaultColorStyle,
	size: DefaultSizeStyle,
	segments: T.arrayOf(DrawShapeSegment),
	isComplete: T.boolean,
	isPen: T.boolean,
	scale: T.nonZeroNumber,
}

const Versions = createShapePropsMigrationIds('highlight', {
	AddScale: 1,
})

export { Versions as highlightShapeVersions }

/** @public */
export const highlightShapeMigrations = createShapePropsMigrationSequence({
	sequence: [
		{
			id: Versions.AddScale,
			up: (props) => {
				props.scale = 1
			},
			down: (props) => {
				delete props.scale
			},
		},
	],
})
