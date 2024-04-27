import { createShapePropsMigrationSequence } from '../records/TLShape'
import { ShapeProps, TLBaseShape } from './TLBaseShape'

/** @public */
export type TLGroupShapeProps = { [key in never]: undefined }

/** @public */
export type TLGroupShape = TLBaseShape<'group', TLGroupShapeProps>

/** @public */
export const groupShapeProps: ShapeProps<TLGroupShape> = {}

/** @public */
export const groupShapeMigrations = createShapePropsMigrationSequence({ sequence: [] })
