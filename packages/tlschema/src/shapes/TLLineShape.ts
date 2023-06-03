import { defineMigrations } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { TLHandle, handleTypeValidator } from '../misc/TLHandle'
import { TLColorType, colorValidator } from '../styles/color'
import { TLDashType, dashValidator } from '../styles/dash'
import { TLOpacityType, opacityValidator } from '../styles/opacity'
import { TLSizeType, sizeValidator } from '../styles/size'
import { TLSplineType, splineValidator } from '../styles/spline'
import { TLBaseShape, createShapeValidator } from './TLBaseShape'

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
