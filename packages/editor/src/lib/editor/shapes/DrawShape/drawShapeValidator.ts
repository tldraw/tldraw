import {
	TLDrawShapeSegment,
	colorValidator,
	createShapeValidator,
	dashValidator,
	fillValidator,
	sizeValidator,
} from '@tldraw/tlschema'
import { T } from '@tldraw/validate'
import { TLDrawShape, TL_DRAW_SHAPE_SEGMENT_TYPE } from './drawShapeTypes'

/** @internal */
export const drawShapeSegmentValidator: T.Validator<TLDrawShapeSegment> = T.object({
	type: T.setEnum(TL_DRAW_SHAPE_SEGMENT_TYPE),
	points: T.arrayOf(T.point),
})

/** @internal */
export const drawShapeValidator: T.Validator<TLDrawShape> = createShapeValidator(
	'draw',
	T.object({
		color: colorValidator,
		fill: fillValidator,
		dash: dashValidator,
		size: sizeValidator,
		segments: T.arrayOf(drawShapeSegmentValidator),
		isComplete: T.boolean,
		isClosed: T.boolean,
		isPen: T.boolean,
	})
)
