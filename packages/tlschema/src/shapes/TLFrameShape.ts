import { T } from '@tldraw/validate'
import { createShapePropsMigrationSequence } from '../records/TLShape'
import { RecordProps } from '../recordsWithProps'
import { TLBaseShape } from './TLBaseShape'

/** @public */
export interface TLFrameShapeProps {
	w: number
	h: number
	name: string
}

/** @public */
export type TLFrameShape = TLBaseShape<'frame', TLFrameShapeProps>

/** @public */
export const frameShapeProps: RecordProps<TLFrameShape> = {
	w: T.nonZeroNumber,
	h: T.nonZeroNumber,
	name: T.string,
}

/** @public */
export const frameShapeMigrations = createShapePropsMigrationSequence({
	sequence: [],
})
