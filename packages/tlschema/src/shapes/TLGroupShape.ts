import { createShapePropsMigrationSequence } from '../records/TLShape'
import { RecordProps } from '../recordsWithProps'
import { TLBaseShape } from './TLBaseShape'

/**
 * Properties for a group shape. Group shapes are used to organize and manage collections of shapes as a single unit.
 * Group shapes themselves have no visual properties and serve only as containers.
 *
 * @public
 * @example
 * ```ts
 * const groupProps: TLGroupShapeProps = {}
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TLGroupShapeProps {}

/**
 * A group shape that acts as a container for organizing multiple shapes into a single logical unit.
 * Groups enable users to move, transform, and manage collections of shapes together while maintaining
 * their relative positions and properties.
 *
 * @public
 * @example
 * ```ts
 * const groupShape: TLGroupShape = {
 *   id: 'shape:group1',
 *   type: 'group',
 *   x: 100,
 *   y: 100,
 *   rotation: 0,
 *   index: 'a1',
 *   parentId: 'page:main',
 *   isLocked: false,
 *   opacity: 1,
 *   props: {},
 *   meta: {},
 *   typeName: 'shape'
 * }
 * ```
 */
export type TLGroupShape = TLBaseShape<'group', TLGroupShapeProps>

/**
 * Validation schema for group shape properties. Since group shapes have no visual properties,
 * this is an empty object that serves as a placeholder for the schema system.
 *
 * @public
 * @example
 * ```ts
 * import { groupShapeProps } from '@tldraw/tlschema'
 *
 * // Used internally by the validation system
 * const validator = T.object(groupShapeProps)
 * ```
 */
export const groupShapeProps: RecordProps<TLGroupShape> = {}

/**
 * Migration sequence for group shapes. Currently contains no migrations.
 *
 * @public
 */
export const groupShapeMigrations = createShapePropsMigrationSequence({ sequence: [] })
