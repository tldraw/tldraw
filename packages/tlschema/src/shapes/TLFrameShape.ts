import { Migrator } from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'
import { TLOpacityType } from '../style-types'
import { opacityValidator } from '../validation'
import { TLBaseShape, createShapeValidator } from './shape-validation'

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
export const frameShapeTypeValidator = createShapeValidator<TLFrameShape>(
	'frame',
	T.object({
		opacity: opacityValidator,
		w: T.nonZeroNumber,
		h: T.nonZeroNumber,
		name: T.string,
	})
)

/** @public */
export const frameShapeTypeMigrator = new Migrator()
