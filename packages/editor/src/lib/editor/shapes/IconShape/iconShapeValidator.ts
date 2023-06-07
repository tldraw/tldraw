import {
	colorValidator,
	createShapeValidator,
	dashValidator,
	iconValidator,
	sizeValidator,
} from '@tldraw/tlschema'
import { T } from '@tldraw/validate'
import { TLIconShape } from './iconShapeTypes'

/** @internal */
export const iconShapeValidator: T.Validator<TLIconShape> = createShapeValidator(
	'icon',
	T.object({
		size: sizeValidator,
		icon: iconValidator,
		dash: dashValidator,
		color: colorValidator,
		scale: T.number,
	})
)
