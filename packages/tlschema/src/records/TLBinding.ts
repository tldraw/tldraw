import {
	RecordId,
	UnknownRecord,
	createMigrationIds,
	createRecordMigrationSequence,
	createRecordType,
} from '@tldraw/store'
import { Expand, mapObjectMapValues, uniqueId } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { TLArrowBinding } from '../bindings/TLArrowBinding'
import { TLBaseBinding, createBindingValidator } from '../bindings/TLBaseBinding'
import { SchemaPropsInfo } from '../createTLSchema'
import { TLPropsMigrations } from '../recordsWithProps'

/**
 * The default set of bindings that are available in the editor.
 * Currently includes only arrow bindings, but can be extended with custom bindings.
 *
 * @example
 * ```ts
 * // Arrow binding connects an arrow to shapes
 * const arrowBinding: TLDefaultBinding = {
 *   id: 'binding:arrow1',
 *   typeName: 'binding',
 *   type: 'arrow',
 *   fromId: 'shape:arrow1',
 *   toId: 'shape:rectangle1',
 *   props: {
 *     terminal: 'end',
 *     normalizedAnchor: { x: 0.5, y: 0.5 },
 *     isExact: false,
 *     isPrecise: true
 *   }
 * }
 * ```
 *
 * @public
 */
export type TLDefaultBinding = TLArrowBinding

/**
 * A type for a binding that is available in the editor but whose type is
 * unknown—either one of the editor's default bindings or else a custom binding.
 * Used internally for type-safe handling of bindings with unknown structure.
 *
 * @example
 * ```ts
 * // Function that works with any binding type
 * function processBinding(binding: TLUnknownBinding) {
 *   console.log(`Processing ${binding.type} binding from ${binding.fromId} to ${binding.toId}`)
 *   // Handle binding properties generically
 * }
 * ```
 *
 * @public
 */
export type TLUnknownBinding = TLBaseBinding<string, object>

/**
 * The set of all bindings that are available in the editor, including unknown bindings.
 * Bindings represent relationships between shapes, such as arrows connecting to other shapes.
 *
 * @example
 * ```ts
 * // Check binding type and handle accordingly
 * function handleBinding(binding: TLBinding) {
 *   switch (binding.type) {
 *     case 'arrow':
 *       // Handle arrow binding
 *       break
 *     default:
 *       // Handle unknown custom binding
 *       break
 *   }
 * }
 * ```
 *
 * @public
 */
export type TLBinding = TLDefaultBinding | TLUnknownBinding

/**
 * Type for updating existing bindings with partial properties.
 * Only the id and type are required, all other properties are optional.
 *
 * @example
 * ```ts
 * // Update arrow binding properties
 * const bindingUpdate: TLBindingUpdate<TLArrowBinding> = {
 *   id: 'binding:arrow1',
 *   type: 'arrow',
 *   props: {
 *     normalizedAnchor: { x: 0.7, y: 0.3 } // Only update anchor position
 *   }
 * }
 *
 * editor.updateBindings([bindingUpdate])
 * ```
 *
 * @public
 */
export type TLBindingUpdate<T extends TLBinding = TLBinding> = Expand<{
	id: TLBindingId
	type: T['type']
	typeName?: T['typeName']
	fromId?: T['fromId']
	toId?: T['toId']
	props?: Partial<T['props']>
	meta?: Partial<T['meta']>
}>

/**
 * Type for creating new bindings with required fromId and toId.
 * The id is optional and will be generated if not provided.
 *
 * @example
 * ```ts
 * // Create a new arrow binding
 * const newBinding: TLBindingCreate<TLArrowBinding> = {
 *   type: 'arrow',
 *   fromId: 'shape:arrow1',
 *   toId: 'shape:rectangle1',
 *   props: {
 *     terminal: 'end',
 *     normalizedAnchor: { x: 0.5, y: 0.5 },
 *     isExact: false,
 *     isPrecise: true
 *   }
 * }
 *
 * editor.createBindings([newBinding])
 * ```
 *
 * @public
 */
export type TLBindingCreate<T extends TLBinding = TLBinding> = Expand<{
	id?: TLBindingId
	type: T['type']
	typeName?: T['typeName']
	fromId: T['fromId']
	toId: T['toId']
	props?: Partial<T['props']>
	meta?: Partial<T['meta']>
}>

/**
 * Branded string type for binding record identifiers.
 * Prevents mixing binding IDs with other types of record IDs at compile time.
 *
 * @example
 * ```ts
 * import { createBindingId } from '@tldraw/tlschema'
 *
 * // Create a new binding ID
 * const bindingId: TLBindingId = createBindingId()
 *
 * // Use in binding records
 * const binding: TLBinding = {
 *   id: bindingId,
 *   type: 'arrow',
 *   fromId: 'shape:arrow1',
 *   toId: 'shape:rectangle1',
 *   // ... other properties
 * }
 * ```
 *
 * @public
 */
export type TLBindingId = RecordId<TLUnknownBinding>

/**
 * Migration version identifiers for the root binding record schema.
 * Currently empty as no migrations have been applied to the base binding structure.
 *
 * @example
 * ```ts
 * // Future migrations would be defined here
 * const rootBindingVersions = createMigrationIds('com.tldraw.binding', {
 *   AddNewProperty: 1,
 * } as const)
 * ```
 *
 * @public
 */
export const rootBindingVersions = createMigrationIds('com.tldraw.binding', {} as const)

/**
 * Migration sequence for the root binding record structure.
 * Currently empty as the binding schema has not required any migrations yet.
 *
 * @example
 * ```ts
 * // Migrations would be automatically applied when loading old documents
 * const migratedStore = migrator.migrateStoreSnapshot({
 *   schema: oldSchema,
 *   store: oldStoreSnapshot
 * })
 * ```
 *
 * @public
 */
export const rootBindingMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw.binding',
	recordType: 'binding',
	sequence: [],
})

/**
 * Type guard to check if a record is a TLBinding.
 * Useful for filtering or type narrowing when working with mixed record types.
 *
 * @param record - The record to check
 * @returns True if the record is a binding, false otherwise
 *
 * @example
 * ```ts
 * // Filter bindings from mixed records
 * const allRecords = store.allRecords()
 * const bindings = allRecords.filter(isBinding)
 *
 * // Type guard usage
 * function processRecord(record: UnknownRecord) {
 *   if (isBinding(record)) {
 *     // record is now typed as TLBinding
 *     console.log(`Binding from ${record.fromId} to ${record.toId}`)
 *   }
 * }
 * ```
 *
 * @public
 */
export function isBinding(record?: UnknownRecord): record is TLBinding {
	if (!record) return false
	return record.typeName === 'binding'
}

/**
 * Type guard to check if a string is a valid TLBindingId.
 * Validates that the ID follows the correct format for binding identifiers.
 *
 * @param id - The string to check
 * @returns True if the string is a valid binding ID, false otherwise
 *
 * @example
 * ```ts
 * // Validate binding IDs
 * const maybeBindingId = 'binding:abc123'
 * if (isBindingId(maybeBindingId)) {
 *   // maybeBindingId is now typed as TLBindingId
 *   const binding = store.get(maybeBindingId)
 * }
 *
 * // Filter binding IDs from mixed ID array
 * const mixedIds = ['shape:1', 'binding:2', 'page:3']
 * const bindingIds = mixedIds.filter(isBindingId)
 * ```
 *
 * @public
 */
export function isBindingId(id?: string): id is TLBindingId {
	if (!id) return false
	return id.startsWith('binding:')
}

/**
 * Creates a new TLBindingId with proper formatting.
 * Generates a unique ID if none is provided, or formats a provided ID correctly.
 *
 * @param id - Optional custom ID suffix. If not provided, a unique ID is generated
 * @returns A properly formatted binding ID
 *
 * @example
 * ```ts
 * // Create with auto-generated ID
 * const bindingId1 = createBindingId() // 'binding:abc123'
 *
 * // Create with custom ID
 * const bindingId2 = createBindingId('myCustomBinding') // 'binding:myCustomBinding'
 *
 * // Use in binding creation
 * const binding: TLBinding = {
 *   id: createBindingId(),
 *   type: 'arrow',
 *   fromId: 'shape:arrow1',
 *   toId: 'shape:rectangle1',
 *   // ... other properties
 * }
 * ```
 *
 * @public
 */
export function createBindingId(id?: string): TLBindingId {
	return `binding:${id ?? uniqueId()}` as TLBindingId
}

/**
 * Creates a migration sequence for binding properties.
 * This is a pass-through function that validates and returns the provided migrations.
 *
 * @param migrations - The migration sequence for binding properties
 * @returns The validated migration sequence
 *
 * @example
 * ```ts
 * // Define migrations for custom binding properties
 * const myBindingMigrations = createBindingPropsMigrationSequence({
 *   sequence: [
 *     {
 *       id: 'com.myapp.binding.custom/1.0.0',
 *       up: (props) => ({ ...props, newProperty: 'default' }),
 *       down: ({ newProperty, ...props }) => props
 *     }
 *   ]
 * })
 * ```
 *
 * @public
 */
export function createBindingPropsMigrationSequence(
	migrations: TLPropsMigrations
): TLPropsMigrations {
	return migrations
}

/**
 * Creates properly formatted migration IDs for binding property migrations.
 * Follows the convention: 'com.tldraw.binding.\{bindingType\}/\{version\}'
 *
 * @param bindingType - The type of binding these migrations apply to
 * @param ids - Object mapping migration names to version numbers
 * @returns Object with formatted migration IDs
 *
 * @example
 * ```ts
 * // Create migration IDs for custom binding
 * const myBindingVersions = createBindingPropsMigrationIds('myCustomBinding', {
 *   AddNewProperty: 1,
 *   UpdateProperty: 2
 * })
 *
 * // Result:
 * // {
 * //   AddNewProperty: 'com.tldraw.binding.myCustomBinding/1',
 * //   UpdateProperty: 'com.tldraw.binding.myCustomBinding/2'
 * // }
 * ```
 *
 * @public
 */
export function createBindingPropsMigrationIds<S extends string, T extends Record<string, number>>(
	bindingType: S,
	ids: T
): { [k in keyof T]: `com.tldraw.binding.${S}/${T[k]}` } {
	return mapObjectMapValues(ids, (_k, v) => `com.tldraw.binding.${bindingType}/${v}`) as any
}

/**
 * Creates a record type for TLBinding with validation based on the provided binding schemas.
 * This function is used internally to configure the binding record type in the schema.
 *
 * @param bindings - Record mapping binding type names to their schema information
 * @returns A configured record type for bindings with validation
 *
 * @example
 * ```ts
 * // Used internally when creating schemas
 * const bindingRecordType = createBindingRecordType({
 *   arrow: {
 *     props: arrowBindingProps,
 *     meta: arrowBindingMeta
 *   }
 * })
 * ```
 *
 * @internal
 */
export function createBindingRecordType(bindings: Record<string, SchemaPropsInfo>) {
	return createRecordType<TLBinding>('binding', {
		scope: 'document',
		validator: T.model(
			'binding',
			T.union(
				'type',
				mapObjectMapValues(bindings, (type, { props, meta }) =>
					createBindingValidator(type, props, meta)
				)
			)
		),
	}).withDefaultProperties(() => ({
		meta: {},
	}))
}
