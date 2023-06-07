import { SetValue, Vec2dModel } from '@tldraw/tlschema'

/** @public */
export const TL_DRAW_SHAPE_SEGMENT_TYPE = new Set(['free', 'straight'] as const)

/** @public */
export type TLDrawShapeSegment = {
	type: SetValue<typeof TL_DRAW_SHAPE_SEGMENT_TYPE>
	points: Vec2dModel[]
}
