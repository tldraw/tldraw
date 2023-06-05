import { defineMigrations } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { TLColorType, colorValidator } from '../styles/TLColorStyle'
import { TLDashType, dashValidator } from '../styles/TLDashStyle'
import { TLIconType, iconValidator } from '../styles/TLIconStyle'
import { TLOpacityType, opacityValidator } from '../styles/TLOpacityStyle'
import { TLSizeType, sizeValidator } from '../styles/TLSizeStyle'
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

/** @internal */
export const iconShapePropsValidators = {
	size: sizeValidator,
	icon: iconValidator,
	dash: dashValidator,
	color: colorValidator,
	opacity: opacityValidator,
	scale: T.number,
}

/** @internal */
export const iconShapeValidator: T.Validator<TLIconShape> = createShapeValidator(
	'icon',
	T.object(iconShapePropsValidators)
)

/** @internal */
export const iconShapeMigrations = defineMigrations({})
