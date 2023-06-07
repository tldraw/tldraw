import {
	colorValidator,
	createShapeValidator,
	dashValidator,
	handleValidator,
	sizeValidator,
	splineValidator,
} from '@tldraw/tlschema'
import { T } from '@tldraw/validate'
import { TLLineShape } from './lineShapeTypes'

/** @internal */
export const lineShapeValidator: T.Validator<TLLineShape> = createShapeValidator(
	'line',
	T.object({
		color: colorValidator,
		dash: dashValidator,
		size: sizeValidator,
		spline: splineValidator,
		handles: T.dict(T.string, handleValidator),
	})
)
