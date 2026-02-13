import { RotateCorner, SelectionCorner, SelectionEdge } from '../../primitives/Box'

/** @public */
export type TLSelectionHandle = SelectionCorner | SelectionEdge | RotateCorner

/** @public */
export type TLResizeHandle = SelectionCorner | SelectionEdge

/** @public */
export type TLAdjacentDirection = 'next' | 'prev' | 'left' | 'right' | 'up' | 'down'
