import { createShapePropsMigrationSequence } from '../records/TLShape'
import { RecordProps } from '../recordsWithProps'
import { TLBaseShape } from './TLBaseShape'

/** @public */
export type TLGroupShapeProps = { [key in never]: undefined }

/** @public */
export type TLGroupShape = TLBaseShape<'group', TLGroupShapeProps>

/** @public */
export const groupShapeProps: RecordProps<TLGroupShape> = {}

/** @public */
export const groupShapeMigrations = createShapePropsMigrationSequence({ sequence: [] })
