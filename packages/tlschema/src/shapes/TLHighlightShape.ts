import { T } from '@tldraw/validate'
import { createShapePropsMigrationIds, createShapePropsMigrationSequence } from '../records/TLShape'
import { RecordProps } from '../recordsWithProps'
import { DefaultColorStyle, TLDefaultColorStyle } from '../styles/TLColorStyle'
import { DefaultSizeStyle, TLDefaultSizeStyle } from '../styles/TLSizeStyle'
import { TLBaseShape } from './TLBaseShape'
import { DrawShapeSegment, float16ArrayToBase64, TLDrawShapeSegment } from './TLDrawShape'

/** @public */
export interface TLHighlightShapeProps {
	color: TLDefaultColorStyle
	size: TLDefaultSizeStyle
	segments: TLDrawShapeSegment[]
	isComplete: boolean
	isPen: boolean
	scale: number
	scaleX: number
	scaleY: number
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
	scaleX: T.nonZeroNumber,
	scaleY: T.nonZeroNumber,
}

const Versions = createShapePropsMigrationIds('highlight', {
	AddScale: 1,
	Base64: 2,
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
		{
			id: Versions.Base64,
			up: (props) => {
				props.segments = props.segments.map((segment: any) => ({
					...segment,
					points: float16ArrayToBase64(
						new Float16Array(segment.points.flatMap((p: any) => [p.x, p.y, p.z]))
					),
				}))
				props.scaleX = 1
				props.scaleY = 1
			},
		},
	],
})
