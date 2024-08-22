import { T } from '@tldraw/validate'
import { VecModel, vecModelValidator } from '../misc/geometry-types'
import { createShapePropsMigrationIds, createShapePropsMigrationSequence } from '../records/TLShape'
import { RecordProps } from '../recordsWithProps'
import { DefaultColorStyle, TLDefaultColorStyle } from '../styles/TLColorStyle'
import { DefaultDashStyle, TLDefaultDashStyle } from '../styles/TLDashStyle'
import { DefaultFillStyle, TLDefaultFillStyle } from '../styles/TLFillStyle'
import { DefaultSizeStyle, TLDefaultSizeStyle } from '../styles/TLSizeStyle'
import { TLBaseShape } from './TLBaseShape'

/** @public */
export interface TLDrawShapeSegment {
	type: 'free' | 'straight'
	points: VecModel[]
}

/** @public */
export const DrawShapeSegment: T.ObjectValidator<TLDrawShapeSegment> = T.object({
	type: T.literalEnum('free', 'straight'),
	points: T.arrayOf(vecModelValidator),
})

/** @public */
export interface TLDrawShapeProps {
	color: TLDefaultColorStyle
	fill: TLDefaultFillStyle
	dash: TLDefaultDashStyle
	size: TLDefaultSizeStyle
	segments: TLDrawShapeSegment[]
	isComplete: boolean
	isClosed: boolean
	isPen: boolean
	scale: number
}

/** @public */
export type TLDrawShape = TLBaseShape<'draw', TLDrawShapeProps>

/** @public */
export const drawShapeProps: RecordProps<TLDrawShape> = {
	color: DefaultColorStyle,
	fill: DefaultFillStyle,
	dash: DefaultDashStyle,
	size: DefaultSizeStyle,
	segments: T.arrayOf(DrawShapeSegment),
	isComplete: T.boolean,
	isClosed: T.boolean,
	isPen: T.boolean,
	scale: T.nonZeroNumber,
}

const Versions = createShapePropsMigrationIds('draw', {
	AddInPen: 1,
	AddScale: 2,
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
			down: 'retired',
		},
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
