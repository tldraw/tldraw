import { defineMigrations } from '@tldraw/store'

import { TypeValidator, arrayOf, boolean, object } from '@tldraw/validate'
import { TLColorType, colorValidator } from '../styles/TLColorStyle'
import { TLOpacityType, opacityValidator } from '../styles/TLOpacityStyle'
import { TLSizeType, sizeValidator } from '../styles/TLSizeStyle'
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

/** @internal */
export const highlightShapeValidator: TypeValidator<TLHighlightShape> = createShapeValidator(
	'highlight',
	object({
		color: colorValidator,
		size: sizeValidator,
		opacity: opacityValidator,
		segments: arrayOf(drawShapeSegmentValidator),
		isComplete: boolean,
		isPen: boolean,
	})
)

/** @internal */
export const highlightShapeMigrations = defineMigrations({})
