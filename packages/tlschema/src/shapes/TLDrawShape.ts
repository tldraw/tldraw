import { defineMigrations } from '@tldraw/store'
import {
	TypeValidator,
	arrayOfValidator,
	booleanValidator,
	objectValidator,
	pointValidator,
	setEnumValidator,
} from '@tldraw/validate'
import { Vec2dModel } from '../misc/geometry-types'
import { TLColorType, colorValidator } from '../styles/TLColorStyle'
import { TLDashType, dashValidator } from '../styles/TLDashStyle'
import { TLFillType, fillValidator } from '../styles/TLFillStyle'
import { TLOpacityType, opacityValidator } from '../styles/TLOpacityStyle'
import { TLSizeType, sizeValidator } from '../styles/TLSizeStyle'
import { SetValue } from '../util-types'
import { TLBaseShape, createShapeValidator } from './TLBaseShape'

/** @public */
const TL_DRAW_SHAPE_SEGMENT_TYPE = new Set(['free', 'straight'] as const)

/** @public */
export type TLDrawShapeSegment = {
	type: SetValue<typeof TL_DRAW_SHAPE_SEGMENT_TYPE>
	points: Vec2dModel[]
}

/** @internal */
export const drawShapeSegmentValidator: TypeValidator<TLDrawShapeSegment> = objectValidator({
	type: setEnumValidator(TL_DRAW_SHAPE_SEGMENT_TYPE),
	points: arrayOfValidator(pointValidator),
})

/** @public */
export type TLDrawShapeProps = {
	color: TLColorType
	fill: TLFillType
	dash: TLDashType
	size: TLSizeType
	opacity: TLOpacityType
	segments: TLDrawShapeSegment[]
	isComplete: boolean
	isClosed: boolean
	isPen: boolean
}

/** @public */
export type TLDrawShape = TLBaseShape<'draw', TLDrawShapeProps>

/** @internal */
export const drawShapeValidator: TypeValidator<TLDrawShape> = createShapeValidator(
	'draw',
	objectValidator({
		color: colorValidator,
		fill: fillValidator,
		dash: dashValidator,
		size: sizeValidator,
		opacity: opacityValidator,
		segments: arrayOfValidator(drawShapeSegmentValidator),
		isComplete: booleanValidator,
		isClosed: booleanValidator,
		isPen: booleanValidator,
	})
)

const Versions = {
	AddInPen: 1,
} as const

/** @internal */
export const drawShapeMigrations = defineMigrations({
	currentVersion: Versions.AddInPen,
	migrators: {
		[Versions.AddInPen]: {
			up: (shape) => {
				// Rather than checking to see whether the shape is a pen at runtime,
				// from now on we're going to use the type of device reported to us
				// as well as the pressure data received; but for existing shapes we
				// need to check the pressure data to see if it's a pen or not.

				const { points } = shape.props.segments[0]

				if (points.length === 0) {
					return {
						...shape,
						props: {
							...shape.props,
							isPen: false,
						},
					}
				}

				let isPen = !(points[0].z === 0 || points[0].z === 0.5)

				if (points[1]) {
					// Double check if we have a second point (we probably should)
					isPen = isPen && !(points[1].z === 0 || points[1].z === 0.5)
				}

				return {
					...shape,
					props: {
						...shape.props,
						isPen,
					},
				}
			},
			down: (shape) => {
				const { isPen: _isPen, ...propsWithOutIsPen } = shape.props
				return {
					...shape,
					props: {
						...propsWithOutIsPen,
					},
				}
			},
		},
	},
})
