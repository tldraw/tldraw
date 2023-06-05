import { defineMigrations } from '@tldraw/store'

import {
	TypeValidator,
	arrayOfValidator,
	booleanValidator,
	objectValidator,
} from '@tldraw/validate'
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
	objectValidator({
		color: colorValidator,
		size: sizeValidator,
		opacity: opacityValidator,
		segments: arrayOfValidator(drawShapeSegmentValidator),
		isComplete: booleanValidator,
		isPen: booleanValidator,
	})
)

/** @internal */
export const highlightShapeMigrations = defineMigrations({})
