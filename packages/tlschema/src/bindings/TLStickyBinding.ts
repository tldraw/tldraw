import { T } from '@tldraw/validate'
import { VecModel, vecModelValidator } from '../misc/geometry-types'
import {
	createBindingPropsMigrationIds,
	createBindingPropsMigrationSequence,
} from '../records/TLBinding'
import { RecordProps } from '../recordsWithProps'
import { TLBaseBinding } from './TLBaseBinding'

/**
 * Properties that define how a sticky shape binds to a target shape.
 * Sticky bindings allow shapes marked as "sticky" to attach to and follow other shapes
 * when dragged over them.
 *
 * @example
 * ```ts
 * const stickyBindingProps: TLStickyBindingProps = {
 *   anchor: { x: 0.5, y: 0.5 }, // Bind to center of target shape
 *   offset: { x: 10, y: 10 }    // Offset from anchor point
 * }
 * ```
 *
 * @public
 */
export interface TLStickyBindingProps {
	/**
	 * Normalized anchor point on the target shape (0,0 = top-left, 1,1 = bottom-right).
	 * Coordinates are relative to the shape's bounding box.
	 */
	anchor: VecModel
	/**
	 * Offset from the anchor point in page coordinates.
	 * Used to preserve the exact position where the sticky shape was dropped.
	 */
	offset: VecModel
}

/**
 * Validation schema for sticky binding properties.
 * Defines the runtime validation rules for each property in TLStickyBindingProps.
 *
 * @public
 */
export const stickyBindingProps: RecordProps<TLStickyBinding> = {
	anchor: vecModelValidator,
	offset: vecModelValidator,
}

/**
 * Represents a binding relationship between a sticky shape and a target shape.
 * Sticky bindings allow shapes to attach to and follow other shapes, maintaining
 * the connection even when the target shape is moved or transformed.
 *
 * @example
 * ```ts
 * const stickyBinding: TLStickyBinding = {
 *   id: 'binding:abc123',
 *   typeName: 'binding',
 *   type: 'sticky',
 *   fromId: 'shape:stickyNote1', // The sticky shape
 *   toId: 'shape:rectangle1',    // The target shape
 *   props: {
 *     anchor: { x: 0.5, y: 0.5 },
 *     offset: { x: 0, y: 0 }
 *   },
 *   meta: {}
 * }
 * ```
 *
 * @public
 */
export type TLStickyBinding = TLBaseBinding<'sticky', TLStickyBindingProps>

/**
 * Version identifiers for sticky binding property migrations.
 * Each version represents a schema change that requires data migration.
 *
 * @public
 */
export const stickyBindingVersions = createBindingPropsMigrationIds('sticky', {})

/**
 * Migration sequence for sticky binding properties.
 * Handles schema evolution over time by defining how to migrate data between versions.
 *
 * @public
 */
export const stickyBindingMigrations = createBindingPropsMigrationSequence({
	sequence: [],
})
