import { defineMigrations } from '@tldraw/tlstore'
import { T } from '@tldraw/validate'
import { TLColorType, TLDashType, TLIconType, TLOpacityType, TLSizeType } from '../style-types'
import {
	colorValidator,
	dashValidator,
	iconValidator,
	opacityValidator,
	sizeValidator,
} from '../validation'
import { TLBaseShape, createShapeValidator } from './shape-validation'

/** @public */
export type TLIconShapeProps = {
	size: TLSizeType
	icon: TLIconType
	dash: TLDashType
	color: TLColorType
	opacity: TLOpacityType
	scale: number
}

/** @public */
export type TLIconShape = TLBaseShape<'icon', TLIconShapeProps>

/** @public */
export const iconShapeTypeValidator: T.Validator<TLIconShape> = createShapeValidator(
	'icon',
	T.object({
		size: sizeValidator,
		icon: iconValidator,
		dash: dashValidator,
		color: colorValidator,
		opacity: opacityValidator,
		scale: T.number,
	})
)

/** @public */
export const iconShapeTypeMigrations = defineMigrations({})
