import { Migrator } from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'
import { TLOpacityType } from '../style-types'
import { opacityValidator } from '../validation'
import { TLBaseShape, createShapeValidator } from './shape-validation'

/** @public */
export type TLGroupShapeProps = {
	opacity: TLOpacityType
}

/** @public */
export type TLGroupShape = TLBaseShape<'group', TLGroupShapeProps>

/** @public */
export const groupShapeTypeValidator = createShapeValidator<TLGroupShape>(
	'group',
	T.object({
		opacity: opacityValidator,
	})
)

/** @public */
export const groupShapeTypeMigrator = new Migrator()
