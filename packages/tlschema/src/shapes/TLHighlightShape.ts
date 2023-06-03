import { defineMigrations } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { TLColorType, colorValidator } from '../styles/TLColorStyle'
import { TLOpacityType, opacityValidator } from '../styles/TLOpacityStyle'
import { TLSizeType, sizeValidator } from '../styles/TLSizeStyle'
import { TLDrawShapeSegment, drawShapeSegmentValidator } from './TLDrawShape'
import { TLBaseShape, createShapeValidator } from './base-shape'

/** @public */
export type TLHighlightShapeProps = {
	color: TLColorType
	size: TLSizeType
	opacity: TLOpacityType
	segments: TLDrawShapeSegment[]
	isComplete: boolean
	isPen: boolean
}

/** @public */
export type TLHighlightShape = TLBaseShape<'highlight', TLHighlightShapeProps>

/** @public */
export const highlightShapeValidator: T.Validator<TLHighlightShape> = createShapeValidator(
	'highlight',
	T.object({
		color: colorValidator,
		size: sizeValidator,
		opacity: opacityValidator,
		segments: T.arrayOf(drawShapeSegmentValidator),
		isComplete: T.boolean,
		isPen: T.boolean,
	})
)

/** @public */
export const highlightShapeMigrations = defineMigrations({})
