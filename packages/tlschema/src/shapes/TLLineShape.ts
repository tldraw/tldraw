import { defineMigrations } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { TLColorType, TLDashType, TLOpacityType, TLSizeType, TLSplineType } from '../style-types'
import { TLHandle, handleTypeValidator } from '../ui-types'
import {
	colorValidator,
	dashValidator,
	opacityValidator,
	sizeValidator,
	splineValidator,
} from '../validation'
import { TLBaseShape, createShapeValidator } from './shape-validation'

/** @public */
export type TLLineShapeProps = {
	color: TLColorType
	dash: TLDashType
	size: TLSizeType
	opacity: TLOpacityType
	spline: TLSplineType
	handles: {
		[key: string]: TLHandle
	}
}

/** @public */
export type TLLineShape = TLBaseShape<'line', TLLineShapeProps>

/** @public */
export const lineShapeTypeValidator: T.Validator<TLLineShape> = createShapeValidator(
	'line',
	T.object({
		color: colorValidator,
		dash: dashValidator,
		size: sizeValidator,
		opacity: opacityValidator,
		spline: splineValidator,
		handles: T.dict(T.string, handleTypeValidator),
	})
)

/** @public */
export const lineShapeTypeMigrations = defineMigrations({})
