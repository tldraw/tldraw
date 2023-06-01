import { defineMigrations } from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'
import { TLColorType, TLOpacityType, TLSizeType } from '../style-types'
import { colorValidator, opacityValidator, sizeValidator } from '../validation'
import { TLDrawShapeSegment, drawShapeSegmentValidator } from './TLDrawShape'
import { TLBaseShape, createShapeValidator } from './shape-validation'

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
export const highlightShapeTypeValidator: T.Validator<TLHighlightShape> = createShapeValidator(
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
export const highlightShapeTypeMigrations = defineMigrations({})
