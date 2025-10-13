import { IndexKey } from '@tldraw/utils'
import { SetValue } from '../util-types'

/**
 * All available handle types used by shapes in the tldraw editor.
 *
 * Handles are interactive control points on shapes that allow users to
 * modify the shape's geometry. Different handle types serve different purposes:
 *
 * - `vertex`: A control point that defines a vertex of the shape
 * - `virtual`: A handle that exists between vertices for adding new points
 * - `create`: A handle for creating new geometry (like extending a line)
 * - `clone`: A handle for duplicating or cloning shape elements
 *
 * @example
 * ```ts
 * // Check if a handle type is valid
 * if (TL_HANDLE_TYPES.has('vertex')) {
 *   console.log('Valid handle type')
 * }
 *
 * // Get all available handle types
 * const allHandleTypes = Array.from(TL_HANDLE_TYPES)
 * ```
 *
 * @public
 */
export const TL_HANDLE_TYPES = new Set(['vertex', 'virtual', 'create', 'clone'] as const)

/**
 * A union type representing all available handle types.
 *
 * Handle types determine how a handle behaves when interacted with and
 * what kind of shape modification it enables.
 *
 * @example
 * ```ts
 * const vertexHandle: TLHandleType = 'vertex'
 * const virtualHandle: TLHandleType = 'virtual'
 * const createHandle: TLHandleType = 'create'
 * const cloneHandle: TLHandleType = 'clone'
 * ```
 *
 * @public
 */
export type TLHandleType = SetValue<typeof TL_HANDLE_TYPES>

/**
 * A handle object representing an interactive control point on a shape.
 *
 * Handles allow users to manipulate shape geometry by dragging control points.
 * Each handle has a position, type, and various properties that control its
 * behavior during interactions.
 *
 * @example
 * ```ts
 * // A vertex handle for a line endpoint
 * const lineEndHandle: TLHandle = {
 *   id: 'end',
 *   label: 'End point',
 *   type: 'vertex',
 *   canSnap: true,
 *   index: 'a1',
 *   x: 100,
 *   y: 50
 * }
 *
 * // A virtual handle for adding new points
 * const virtualHandle: TLHandle = {
 *   id: 'virtual-1',
 *   type: 'virtual',
 *   canSnap: false,
 *   index: 'a1V',
 *   x: 75,
 *   y: 25
 * }
 *
 * // A create handle for extending geometry
 * const createHandle: TLHandle = {
 *   id: 'create',
 *   type: 'create',
 *   canSnap: true,
 *   index: 'a2',
 *   x: 200,
 *   y: 100
 * }
 * ```
 *
 * @public
 */
export interface TLHandle {
	/** A unique identifier for the handle within the shape */
	id: string
	/** Optional human-readable label for the handle */
	// TODO(mime): this needs to be required.
	label?: string
	/** The type of handle, determining its behavior and interaction mode */
	type: TLHandleType
	/**
	 * @deprecated Use `snapType` instead. Whether this handle should snap to other geometry during interactions.
	 */
	canSnap?: boolean
	/** The type of snap to use for this handle */
	snapType?: 'point' | 'align'
	/** The fractional index used for ordering handles */
	index: IndexKey
	/** The x-coordinate of the handle in the shape's local coordinate system */
	x: number
	/** The y-coordinate of the handle in the shape's local coordinate system */
	y: number
}
