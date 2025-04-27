import { createShapePropsMigrationSequence } from '../records/TLShape'
import { RecordProps } from '../recordsWithProps'
import { TLBaseShape } from './TLBaseShape'

/** @public */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TLGroupShapeProps {}

/** @public */
export type TLGroupShape = TLBaseShape<'group', TLGroupShapeProps>

/** @public */
export const groupShapeProps: RecordProps<TLGroupShape> = {}

/** @public */
export const groupShapeMigrations = createShapePropsMigrationSequence({ sequence: [] })
