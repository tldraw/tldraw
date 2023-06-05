import { defineMigrations } from '@tldraw/store'
import { T } from '@tldraw/validate'
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
export const highlightShapePropsValidators = {
	color: colorValidator,
	size: sizeValidator,
	opacity: opacityValidator,
	segments: T.arrayOf(drawShapeSegmentValidator),
	isComplete: T.boolean,
	isPen: T.boolean,
}

/** @internal */
export const highlightShapeValidator: T.Validator<TLHighlightShape> = createShapeValidator(
	'highlight',
	T.object(highlightShapePropsValidators)
)

/** @internal */
export const highlightShapeMigrations = defineMigrations({})
