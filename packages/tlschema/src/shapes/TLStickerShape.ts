import { T } from '@tldraw/validate'
import { createShapePropsMigrationSequence } from '../records/TLShape'
import { RecordProps } from '../recordsWithProps'
import { TLBaseShape } from './TLBaseShape'

/** @public */
export interface TLStickerShapeProps {
	w: number
	h: number
	emoji: string
}

/** @public */
export type TLStickerShape = TLBaseShape<'sticker', TLStickerShapeProps>

/** @public */
export const stickerShapeProps: RecordProps<TLStickerShape> = {
	w: T.nonZeroNumber,
	h: T.nonZeroNumber,
	emoji: T.string,
}

/** @public */
export const stickerShapeMigrations = createShapePropsMigrationSequence({
	sequence: [],
})
