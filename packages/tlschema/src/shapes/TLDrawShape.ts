import { defineMigrations } from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'
import { Vec2dModel } from '../geometry-types'
import { TLColorType, TLDashType, TLFillType, TLOpacityType, TLSizeType } from '../style-types'
import { SetValue } from '../util-types'
import {
	colorValidator,
	dashValidator,
	fillValidator,
	opacityValidator,
	sizeValidator,
} from '../validation'
import { TLBaseShape, createShapeValidator } from './shape-validation'

/** @public */
export const TL_DRAW_SHAPE_SEGMENT_TYPE = new Set(['free', 'straight'] as const)

/** @public */
export type TLDrawShapeSegment = {
	type: SetValue<typeof TL_DRAW_SHAPE_SEGMENT_TYPE>
	points: Vec2dModel[]
}

export const drawShapeSegmentValidator: T.Validator<TLDrawShapeSegment> = T.object({
	type: T.setEnum(TL_DRAW_SHAPE_SEGMENT_TYPE),
	points: T.arrayOf(T.point),
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

/** @public */
export const drawShapeTypeValidator: T.Validator<TLDrawShape> = createShapeValidator(
	'draw',
	T.object({
		color: colorValidator,
		fill: fillValidator,
		dash: dashValidator,
		size: sizeValidator,
		opacity: opacityValidator,
		segments: T.arrayOf(drawShapeSegmentValidator),
		isComplete: T.boolean,
		isClosed: T.boolean,
		isPen: T.boolean,
	})
)

const Versions = {
	AddInPen: 1,
} as const

/** @public */
export const drawShapeTypeMigrations = defineMigrations({
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
