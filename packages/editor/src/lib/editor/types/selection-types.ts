import { RotateCorner, SelectionCorner, SelectionEdge } from '@tldraw/primitives'

/** @public */
export type TLSelectionHandle = SelectionCorner | SelectionEdge | RotateCorner

/** @public */
export type TLResizeHandle = SelectionCorner | SelectionEdge
