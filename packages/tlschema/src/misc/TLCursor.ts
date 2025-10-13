import { T } from '@tldraw/validate'
import { SetValue } from '../util-types'

/**
 * All available cursor types used throughout the tldraw editor.
 *
 * These cursor types correspond to CSS cursor values and are used to indicate
 * different interaction modes and states within the editor. The cursor types
 * cover selection, resizing, rotation, text editing, and various other editor
 * interactions.
 *
 * @example
 * ```ts
 * // Check if a cursor type is valid
 * if (TL_CURSOR_TYPES.has('resize-corner')) {
 *   console.log('Valid cursor type')
 * }
 *
 * // Get all available cursor types
 * const allCursors = Array.from(TL_CURSOR_TYPES)
 * ```
 *
 * @public
 */
export const TL_CURSOR_TYPES = new Set([
	'none',
	'default',
	'pointer',
	'cross',
	'grab',
	'rotate',
	'grabbing',
	'resize-edge',
	'resize-corner',
	'text',
	'move',
	'ew-resize',
	'ns-resize',
	'nesw-resize',
	'nwse-resize',
	'nesw-rotate',
	'nwse-rotate',
	'swne-rotate',
	'senw-rotate',
	'zoom-in',
	'zoom-out',
])

/**
 * A union type representing all available cursor types in the tldraw editor.
 *
 * Each cursor type corresponds to a different interaction mode or state,
 * helping users understand what action they can perform at any given moment.
 *
 * @example
 * ```ts
 * const defaultCursor: TLCursorType = 'default'
 * const textCursor: TLCursorType = 'text'
 * const resizeCursor: TLCursorType = 'resize-corner'
 * const rotateCursor: TLCursorType = 'nesw-rotate'
 * ```
 *
 * @public
 */
export type TLCursorType = SetValue<typeof TL_CURSOR_TYPES>

/**
 * A validator for cursor types.
 *
 * This validator ensures that cursor type values are one of the valid types
 * defined in {@link TL_CURSOR_TYPES}. It provides runtime type checking for
 * cursor properties throughout the editor.
 *
 * @example
 * ```ts
 * import { cursorTypeValidator } from '@tldraw/tlschema'
 *
 * // Validate a cursor type
 * try {
 *   const validCursor = cursorTypeValidator.validate('pointer')
 *   console.log('Valid cursor:', validCursor)
 * } catch (error) {
 *   console.error('Invalid cursor:', error.message)
 * }
 * ```
 *
 * @public
 */
export const cursorTypeValidator = T.setEnum(TL_CURSOR_TYPES)

/**
 * A cursor object used throughout the tldraw editor.
 *
 * Represents both the cursor type (which determines the visual appearance)
 * and its rotation angle. The rotation is particularly useful for resize
 * and rotation cursors that need to align with the current interaction angle.
 *
 * @example
 * ```ts
 * // Default cursor
 * const defaultCursor: TLCursor = {
 *   type: 'default',
 *   rotation: 0
 * }
 *
 * // Rotated resize cursor
 * const rotatedResizeCursor: TLCursor = {
 *   type: 'resize-corner',
 *   rotation: Math.PI / 4 // 45 degrees
 * }
 *
 * // Text editing cursor
 * const textCursor: TLCursor = {
 *   type: 'text',
 *   rotation: 0
 * }
 * ```
 *
 * @public
 */
export interface TLCursor {
	/** The cursor type, determining the visual appearance and interaction mode */
	type: TLCursorType
	/** The rotation angle in radians, used for rotated cursors like resize handles */
	rotation: number
}

/**
 * A validator for TLCursor objects.
 *
 * This validator ensures that cursor objects have valid cursor types and
 * numeric rotation values. It provides runtime validation for cursor
 * properties used throughout the editor.
 *
 * @example
 * ```ts
 * import { cursorValidator } from '@tldraw/tlschema'
 *
 * // Validate a cursor object
 * try {
 *   const validCursor = cursorValidator.validate({
 *     type: 'pointer',
 *     rotation: 0.5
 *   })
 *   console.log('Valid cursor:', validCursor)
 * } catch (error) {
 *   console.error('Invalid cursor:', error.message)
 * }
 * ```
 *
 * @public
 */
export const cursorValidator: T.ObjectValidator<TLCursor> = T.object<TLCursor>({
	type: cursorTypeValidator,
	rotation: T.number,
})
