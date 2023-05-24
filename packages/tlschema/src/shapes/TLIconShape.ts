import { Migrator } from '@tldraw/tlstore'
import { TLColorType, TLDashType, TLIconType, TLOpacityType, TLSizeType } from '../style-types'
import { TLBaseShape } from './shape-validation'

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
export const iconShapeTypeMigrator = new Migrator({})
