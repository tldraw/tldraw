import { defineMigrations } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { TLColorType, colorValidator } from '../styles/color'
import { TLDashType, dashValidator } from '../styles/dash'
import { TLIconType, iconValidator } from '../styles/icon'
import { TLOpacityType, opacityValidator } from '../styles/opacity'
import { TLSizeType, sizeValidator } from '../styles/size'
import { TLBaseShape, createShapeValidator } from './TLBaseShape'

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
