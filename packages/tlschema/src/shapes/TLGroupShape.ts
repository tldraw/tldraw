import { defineMigrations } from '@tldraw/store'
import { ShapeProps, TLBaseShape } from './TLBaseShape'

/** @public */
export type TLGroupShapeProps = { [key in never]: undefined }

/** @public */
export type TLGroupShape = TLBaseShape<'group', TLGroupShapeProps>

/** @internal */
export const groupShapeProps: ShapeProps<TLGroupShape> = {}

/** @internal */
export const groupShapeMigrations = defineMigrations({})
