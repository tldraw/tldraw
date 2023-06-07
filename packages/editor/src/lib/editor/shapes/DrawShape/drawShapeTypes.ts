import {
	SetValue,
	TLBaseShape,
	TLColorType,
	TLDashType,
	TLFillType,
	TLSizeType,
	Vec2dModel,
} from '@tldraw/tlschema'

/** @public */
export const TL_DRAW_SHAPE_SEGMENT_TYPE = new Set(['free', 'straight'] as const)

/** @public */
export type TLDrawShapeSegment = {
	type: SetValue<typeof TL_DRAW_SHAPE_SEGMENT_TYPE>
	points: Vec2dModel[]
}

/** @public */
export type TLDrawShapeProps = {
	color: TLColorType
	fill: TLFillType
	dash: TLDashType
	size: TLSizeType
	segments: TLDrawShapeSegment[]
	isComplete: boolean
	isClosed: boolean
	isPen: boolean
}

/** @public */
export type TLDrawShape = TLBaseShape<'draw', TLDrawShapeProps>
