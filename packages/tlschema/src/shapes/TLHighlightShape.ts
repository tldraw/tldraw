import { defineMigrations } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { TLColorType, colorValidator } from '../styles/color'
import { TLOpacityType, opacityValidator } from '../styles/opacity'
import { TLSizeType, sizeValidator } from '../styles/size'
import { TLBaseShape, createShapeValidator } from './TLBaseShape'
import { TLDrawShapeSegment, drawShapeSegmentValidator } from './TLDrawShape'

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
