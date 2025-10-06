import { BaseRecord } from '@tldraw/store'
import { JsonObject } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { idValidator } from '../misc/id-validator'
import { TLBindingId } from '../records/TLBinding'
import { TLShapeId } from '../records/TLShape'
import { shapeIdValidator } from '../shapes/TLBaseShape'

/**
 * Base interface for all binding types in tldraw. Bindings represent relationships
 * between shapes, such as arrows connecting to other shapes or organizational connections.
 *
 * All bindings extend this base interface with specific type and property definitions.
 * The binding system enables shapes to maintain relationships that persist through
 * transformations, movements, and other operations.
 *
 * @param Type - String literal type identifying the specific binding type (e.g., 'arrow')
 * @param Props - Object containing binding-specific properties and configuration
 *
 * @example
 * ```ts
 * // Define a custom binding type
 * interface MyCustomBinding extends TLBaseBinding<'custom', MyCustomProps> {}
 *
 * interface MyCustomProps {
 *   strength: number
 *   color: string
 * }
 *
 * // Create a binding instance
 * const binding: MyCustomBinding = {
 *   id: 'binding:abc123',
 *   typeName: 'binding',
 *   type: 'custom',
 *   fromId: 'shape:source1',
 *   toId: 'shape:target1',
 *   props: {
 *     strength: 0.8,
 *     color: 'red'
 *   },
 *   meta: {}
 * }
 * ```
 *
 * @public
 */
export interface TLBaseBinding<Type extends string, Props extends object>
	extends BaseRecord<'binding', TLBindingId> {
	/** The specific type of this binding (e.g., 'arrow', 'custom') */
	type: Type
	/** ID of the source shape in this binding relationship */
	fromId: TLShapeId
	/** ID of the target shape in this binding relationship */
	toId: TLShapeId
	/** Binding-specific properties that define behavior and appearance */
	props: Props
	/** User-defined metadata for extending binding functionality */
	meta: JsonObject
}

/**
 * Validator for binding IDs. Ensures that binding identifiers follow the correct
 * format and type constraints required by the tldraw schema system.
 *
 * Used internally by the schema validation system to verify binding IDs when
 * records are created or modified. All binding IDs must be prefixed with 'binding:'.
 *
 * @example
 * ```ts
 * import { bindingIdValidator } from '@tldraw/tlschema'
 *
 * // Validate a binding ID
 * const isValid = bindingIdValidator.isValid('binding:abc123') // true
 * const isInvalid = bindingIdValidator.isValid('shape:abc123') // false
 *
 * // Use in custom validation schema
 * const customBindingValidator = T.object({
 *   id: bindingIdValidator,
 *   // ... other properties
 * })
 * ```
 *
 * @public
 */
export const bindingIdValidator = idValidator<TLBindingId>('binding')

/**
 * Creates a runtime validator for a specific binding type. This factory function
 * generates a complete validation schema for custom bindings that extends TLBaseBinding.
 *
 * The validator ensures all binding records conform to the expected structure with
 * proper type safety and runtime validation. It validates the base binding properties
 * (id, type, fromId, toId) along with custom props and meta fields.
 *
 * @param type - The string literal type identifier for this binding (e.g., 'arrow', 'custom')
 * @param props - Optional validation schema for binding-specific properties
 * @param meta - Optional validation schema for metadata fields
 *
 * @returns A validator object that can validate complete binding records
 *
 * @example
 * ```ts
 * import { createBindingValidator } from '@tldraw/tlschema'
 * import { T } from '@tldraw/validate'
 *
 * // Create validator for a custom binding type
 * const myBindingValidator = createBindingValidator(
 *   'myBinding',
 *   {
 *     strength: T.number,
 *     color: T.string,
 *     enabled: T.boolean
 *   },
 *   {
 *     createdAt: T.number,
 *     author: T.string
 *   }
 * )
 *
 * // Validate a binding instance
 * const bindingData = {
 *   id: 'binding:123',
 *   typeName: 'binding',
 *   type: 'myBinding',
 *   fromId: 'shape:abc',
 *   toId: 'shape:def',
 *   props: {
 *     strength: 0.8,
 *     color: 'red',
 *     enabled: true
 *   },
 *   meta: {
 *     createdAt: Date.now(),
 *     author: 'user123'
 *   }
 * }
 *
 * const isValid = myBindingValidator.isValid(bindingData) // true
 * ```
 *
 * @example
 * ```ts
 * // Simple binding without custom props or meta
 * const simpleBindingValidator = createBindingValidator('simple')
 *
 * // This will use JsonValue validation for props and meta
 * const binding = {
 *   id: 'binding:456',
 *   typeName: 'binding',
 *   type: 'simple',
 *   fromId: 'shape:start',
 *   toId: 'shape:end',
 *   props: {}, // Any JSON value allowed
 *   meta: {}   // Any JSON value allowed
 * }
 * ```
 *
 * @public
 */
export function createBindingValidator<
	Type extends string,
	Props extends JsonObject,
	Meta extends JsonObject,
>(
	type: Type,
	props?: { [K in keyof Props]: T.Validatable<Props[K]> },
	meta?: { [K in keyof Meta]: T.Validatable<Meta[K]> }
) {
	return T.object<TLBaseBinding<Type, Props>>({
		id: bindingIdValidator,
		typeName: T.literal('binding'),
		type: T.literal(type),
		fromId: shapeIdValidator,
		toId: shapeIdValidator,
		props: props ? T.object(props) : (T.jsonValue as any),
		meta: meta ? T.object(meta) : (T.jsonValue as any),
	})
}
