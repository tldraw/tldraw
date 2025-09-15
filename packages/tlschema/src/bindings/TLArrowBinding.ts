import { T } from '@tldraw/validate'
import { VecModel, vecModelValidator } from '../misc/geometry-types'
import {
	createBindingPropsMigrationIds,
	createBindingPropsMigrationSequence,
} from '../records/TLBinding'
import { RecordProps } from '../recordsWithProps'
import { arrowShapeVersions } from '../shapes/TLArrowShape'
import { TLBaseBinding } from './TLBaseBinding'

/**
 * Defines the snapping behavior for elbow-style arrows when binding to shapes.
 * Controls how the arrow segment aligns with the target shape's geometry.
 *
 * @example
 * ```ts
 * const binding: TLArrowBindingProps = {
 *   terminal: 'end',
 *   normalizedAnchor: { x: 0.5, y: 0.5 },
 *   isExact: false,
 *   isPrecise: true,
 *   snap: 'edge' // Snap to shape edge
 * }
 * ```
 *
 * @public
 */
export const ElbowArrowSnap = T.literalEnum('center', 'edge-point', 'edge', 'none')
/**
 * Type representing the possible elbow arrow snap modes.
 *
 * - `'center'` - Snap to the center of the target shape
 * - `'edge-point'` - Snap to a specific point on the shape's edge
 * - `'edge'` - Snap to the nearest edge of the shape
 * - `'none'` - No snapping behavior
 *
 * @public
 */
export type ElbowArrowSnap = T.TypeOf<typeof ElbowArrowSnap>

/**
 * Properties that define how an arrow binds to a target shape.
 * These properties control the visual and behavioral aspects of the arrow-to-shape connection.
 *
 * @example
 * ```ts
 * const arrowBindingProps: TLArrowBindingProps = {
 *   terminal: 'end', // Bind the arrow's end point
 *   normalizedAnchor: { x: 0.5, y: 0.0 }, // Bind to top center of shape
 *   isExact: true, // Arrow head enters the shape
 *   isPrecise: true, // Use exact anchor position
 *   snap: 'edge' // Snap to shape edge
 * }
 * ```
 *
 * @public
 */
export interface TLArrowBindingProps {
	/** Which end of the arrow is bound - either 'start' or 'end' */
	terminal: 'start' | 'end'
	/**
	 * Normalized anchor point on the target shape (0,0 = top-left, 1,1 = bottom-right).
	 * Coordinates are relative to the shape's bounding box.
	 */
	normalizedAnchor: VecModel
	/**
	 * Whether the arrow head 'enters' the bound shape to point directly at the binding
	 * anchor point. When true, the arrow head will be positioned inside the target shape.
	 */
	isExact: boolean
	/**
	 * Whether to bind to the exact normalizedAnchor position, or to the center of the shape.
	 * When false, the arrow will connect to the shape's center regardless of anchor position.
	 */
	isPrecise: boolean
	/** Snapping behavior for elbow-style arrows */
	snap: ElbowArrowSnap
}

/**
 * Validation schema for arrow binding properties.
 * Defines the runtime validation rules for each property in TLArrowBindingProps.
 *
 * @example
 * ```ts
 * import { arrowBindingProps } from '@tldraw/tlschema'
 *
 * // Use in custom shape schema
 * const customSchema = createTLSchema({
 *   bindings: {
 *     arrow: {
 *       props: arrowBindingProps,
 *       migrations: arrowBindingMigrations
 *     }
 *   }
 * })
 * ```
 *
 * @public
 */
export const arrowBindingProps: RecordProps<TLArrowBinding> = {
	terminal: T.literalEnum('start', 'end'),
	normalizedAnchor: vecModelValidator,
	isExact: T.boolean,
	isPrecise: T.boolean,
	snap: ElbowArrowSnap,
}

/**
 * Represents a binding relationship between an arrow shape and another shape.
 * Arrow bindings allow arrows to connect to and follow other shapes, maintaining
 * the connection even when shapes are moved or transformed.
 *
 * @example
 * ```ts
 * const arrowBinding: TLArrowBinding = {
 *   id: 'binding:abc123',
 *   typeName: 'binding',
 *   type: 'arrow',
 *   fromId: 'shape:arrow1', // The arrow shape
 *   toId: 'shape:rectangle1', // The target shape
 *   props: {
 *     terminal: 'end',
 *     normalizedAnchor: { x: 0.5, y: 0.5 },
 *     isExact: false,
 *     isPrecise: true,
 *     snap: 'edge'
 *   },
 *   meta: {}
 * }
 * ```
 *
 * @public
 */
export type TLArrowBinding = TLBaseBinding<'arrow', TLArrowBindingProps>

/**
 * Version identifiers for arrow binding property migrations.
 * Each version represents a schema change that requires data migration.
 *
 * @example
 * ```ts
 * // Check if migration is needed
 * if (bindingVersion < arrowBindingVersions.AddSnap) {
 *   // Apply AddSnap migration
 * }
 * ```
 *
 * @public
 */
export const arrowBindingVersions = createBindingPropsMigrationIds('arrow', {
	AddSnap: 1,
})

/**
 * Migration sequence for arrow binding properties.
 * Handles schema evolution over time by defining how to migrate data between versions.
 *
 * The sequence includes:
 * - **AddSnap (v1)**: Adds the `snap` property with default value 'none'
 *
 * @example
 * ```ts
 * import { arrowBindingMigrations } from '@tldraw/tlschema'
 *
 * // Apply migrations when loading older data
 * const migratedBinding = arrowBindingMigrations.migrate(oldBinding)
 * ```
 *
 * @public
 */
export const arrowBindingMigrations = createBindingPropsMigrationSequence({
	sequence: [
		{ dependsOn: [arrowShapeVersions.ExtractBindings] },
		{
			id: arrowBindingVersions.AddSnap,
			up: (props) => {
				props.snap = 'none'
			},
			down: (props) => {
				delete props.snap
			},
		},
	],
})
