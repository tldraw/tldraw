import { defineMigrations } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { TLHandle, handleValidator } from '../misc/TLHandle'
import { TLColorType, colorValidator } from '../styles/TLColorStyle'
import { TLDashType, dashValidator } from '../styles/TLDashStyle'
import { TLSizeType, sizeValidator } from '../styles/TLSizeStyle'
import { TLSplineType, splineValidator } from '../styles/TLSplineStyle'
import { ShapeProps, TLBaseShape } from './TLBaseShape'

/** @public */
export type TLLineShapeProps = {
	color: TLColorType
	dash: TLDashType
	size: TLSizeType
	spline: TLSplineType
	handles: {
		[key: string]: TLHandle
	}
}

/** @public */
export type TLLineShape = TLBaseShape<'line', TLLineShapeProps>

/** @internal */
export const lineShapeProps: ShapeProps<TLLineShape> = {
	color: colorValidator,
	dash: dashValidator,
	size: sizeValidator,
	spline: splineValidator,
	handles: T.dict(T.string, handleValidator),
}

/** @internal */
export const lineShapeMigrations = defineMigrations({})
