import { Migrator } from '@tldraw/tlstore'
import { TLOpacityType } from '../style-types'
import { TLBaseShape } from './shape-validation'

/** @public */
export type TLGroupShapeProps = {
	opacity: TLOpacityType
}

/** @public */
export type TLGroupShape = TLBaseShape<'group', TLGroupShapeProps>

/** @public */
export const groupShapeTypeMigrator = new Migrator({})
