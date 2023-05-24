import { Migrator } from '@tldraw/tlstore'
import { TLOpacityType } from '../style-types'
import { TLBaseShape } from './shape-validation'

/** @public */
export type TLFrameShapeProps = {
	opacity: TLOpacityType
	w: number
	h: number
	name: string
}

/** @public */
export type TLFrameShape = TLBaseShape<'frame', TLFrameShapeProps>

/** @public */
export const frameShapeTypeMigrator = new Migrator({})
