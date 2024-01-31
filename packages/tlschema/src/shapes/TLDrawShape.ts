import { T } from '@tldraw/validate'
import { vecModelValidator } from '../misc/geometry-types'
import { DefaultColorStyle } from '../styles/TLColorStyle'
import { DefaultDashStyle } from '../styles/TLDashStyle'
import { DefaultFillStyle } from '../styles/TLFillStyle'
import { DefaultSizeStyle } from '../styles/TLSizeStyle'
import { ShapePropsType, TLBaseShape } from './TLBaseShape'

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
export type TLDrawShapeProps = ShapePropsType<typeof drawShapeProps>

/** @public */
export type TLDrawShape = TLBaseShape<'draw', TLDrawShapeProps>
