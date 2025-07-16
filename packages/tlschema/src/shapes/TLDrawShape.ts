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
	OptimizePressure: 3,
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
		{
			id: Versions.OptimizePressure,
			up: (props) => {
				// Convert from old float pressure system to new integer system
				// Old: z as float 0-1, with 0 or 0.5 meaning no pressure
				// New: z as integer 0-100 when pressure provided, omitted when not provided
				for (const segment of props.segments) {
					for (const point of segment.points) {
						if (point.z !== undefined) {
							// Check if this was a "no pressure" value (0 or 0.5)
							if (point.z === 0 || point.z === 0.5) {
								// Remove pressure property entirely
								delete point.z
							} else {
								// Convert from 0-1 float to 0-100 integer
								// Cap at 1.0 to handle any values > 1 from pen pressure multiplication
								const clampedPressure = Math.min(1.0, Math.max(0.0, point.z))
								point.z = Math.round(clampedPressure * 100)
							}
						}
					}
				}
			},
			down: (props) => {
				// Convert back to old float system
				for (const segment of props.segments) {
					for (const point of segment.points) {
						if (point.z !== undefined) {
							// Convert from 0-100 integer to 0-1 float
							point.z = point.z / 100
						} else {
							// Add back the default "no pressure" value
							point.z = 0.5
						}
					}
				}
			},
		},
	],
})
