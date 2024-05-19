import { T } from '@tldraw/validate'
import { vecModelValidator } from '../misc/geometry-types'
import { createShapePropsMigrationIds, createShapePropsMigrationSequence } from '../records/TLShape'
import { RETIRED_DOWN_MIGRATION, RecordPropsType } from '../recordsWithProps'
import { DefaultColorStyle } from '../styles/TLColorStyle'
import { DefaultDashStyle } from '../styles/TLDashStyle'
import { DefaultFillStyle } from '../styles/TLFillStyle'
import { DefaultSizeStyle } from '../styles/TLSizeStyle'
import { TLBaseShape } from './TLBaseShape'

export const DrawShapeSegment = T.object({
	type: T.literalEnum('free', 'straight'),
	points: T.arrayOf(vecModelValidator),
})

/** @public */
export type TLDrawShapeSegment = T.TypeOf<typeof DrawShapeSegment>

/** @public */
export const drawShapeProps = {
	color: DefaultColorStyle,
	fill: DefaultFillStyle,
	dash: DefaultDashStyle,
	size: DefaultSizeStyle,
	segments: T.arrayOf(DrawShapeSegment),
	isComplete: T.boolean,
	isClosed: T.boolean,
	isPen: T.boolean,
}

/** @public */
export type TLDrawShapeProps = RecordPropsType<typeof drawShapeProps>

/** @public */
export type TLDrawShape = TLBaseShape<'draw', TLDrawShapeProps>

const Versions = createShapePropsMigrationIds('draw', {
	AddInPen: 1,
})

export { Versions as drawShapeVersions }

/** @public */
export const drawShapeMigrations = createShapePropsMigrationSequence({
	sequence: [
		{
			id: Versions.AddInPen,
			up: (props) => {
				// Rather than checking to see whether the shape is a pen at runtime,
				// from now on we're going to use the type of device reported to us
				// as well as the pressure data received; but for existing shapes we
				// need to check the pressure data to see if it's a pen or not.

				const { points } = props.segments[0]

				if (points.length === 0) {
					props.isPen = false
					return
				}

				let isPen = !(points[0].z === 0 || points[0].z === 0.5)

				if (points[1]) {
					// Double check if we have a second point (we probably should)
					isPen = isPen && !(points[1].z === 0 || points[1].z === 0.5)
				}
				props.isPen = isPen
			},
			down: RETIRED_DOWN_MIGRATION,
		},
	],
})
