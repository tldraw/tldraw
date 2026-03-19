import { TLAsset } from './TLAsset'
import { TLBinding } from './TLBinding'
import { TLCamera } from './TLCamera'
import { TLDocument } from './TLDocument'
import { TLInstance } from './TLInstance'
import { TLPage } from './TLPage'
import { TLInstancePageState } from './TLPageState'
import { TLPointer } from './TLPointer'
import { TLInstancePresence } from './TLPresence'
import { TLShape } from './TLShape'

/**
 * Interface for extending tldraw with custom record types via TypeScript module augmentation.
 *
 * Custom record types allow you to add entirely new data types to the tldraw store that
 * don't fit into the existing shape, binding, or asset categories. Each key in this
 * interface becomes a new record type name, and the value should be your full record type.
 *
 * @example
 * ```ts
 * import { BaseRecord, RecordId } from '@tldraw/store'
 *
 * // Define your custom record type
 * interface TLComment extends BaseRecord<'comment', RecordId<TLComment>> {
 *   text: string
 *   shapeId: TLShapeId
 *   authorId: string
 *   createdAt: number
 * }
 *
 * // Augment the global record props map
 * declare module '@tldraw/tlschema' {
 *   interface TLGlobalRecordPropsMap {
 *     comment: TLComment
 *   }
 * }
 *
 * // Now TLRecord includes your custom comment type
 * // and you can use it with createTLSchema()
 * ```
 *
 * @public
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TLGlobalRecordPropsMap {}

/**
 * Union type of all built-in tldraw record types.
 *
 * This includes persistent records (documents, pages, shapes, assets, bindings)
 * and session/presence records (cameras, instances, pointers, page states).
 *
 * @public
 */
export type TLDefaultRecord =
	| TLAsset
	| TLBinding
	| TLCamera
	| TLDocument
	| TLInstance
	| TLInstancePageState
	| TLPage
	| TLShape
	| TLInstancePresence
	| TLPointer

/**
 * Index type that maps custom record type names to their record types.
 *
 * Similar to TLIndexedShapes and TLIndexedBindings, this type creates a mapping
 * from type name keys to their corresponding record types, filtering out any
 * disabled types (those set to null or undefined in TLGlobalRecordPropsMap).
 *
 * @public
 */
// prettier-ignore
export type TLIndexedRecords = {
	[K in keyof TLGlobalRecordPropsMap as TLGlobalRecordPropsMap[K] extends null | undefined
		? never
		: K]: TLGlobalRecordPropsMap[K]
}

/**
 * Union type representing a custom record from the TLGlobalRecordPropsMap.
 *
 * @public
 */
export type TLCustomRecord = TLIndexedRecords[keyof TLIndexedRecords]

/**
 * Union type representing all possible record types in a tldraw store.
 * This includes both persistent records (documents, pages, shapes, assets, bindings)
 * and session/presence records (cameras, instances, pointers, page states),
 * as well as any custom record types added via TLGlobalRecordPropsMap augmentation.
 *
 * Records are organized by scope:
 * - **document**: Persisted across sessions (shapes, pages, assets, bindings, documents)
 * - **session**: Local to current session (cameras, instances, page states)
 * - **presence**: Ephemeral user presence data (pointers, instance presence)
 *
 * @example
 * ```ts
 * // Function that works with any record type
 * function processRecord(record: TLRecord) {
 *   switch (record.typeName) {
 *     case 'shape':
 *       console.log(`Shape: ${record.type} at (${record.x}, ${record.y})`)
 *       break
 *     case 'page':
 *       console.log(`Page: ${record.name}`)
 *       break
 *     case 'asset':
 *       console.log(`Asset: ${record.type}`)
 *       break
 *     case 'camera':
 *       console.log(`Camera at (${record.x}, ${record.y}) zoom: ${record.z}`)
 *       break
 *     // ... handle other record types
 *   }
 * }
 *
 * // Get all records from store
 * const allRecords: TLRecord[] = store.allRecords()
 *
 * // Filter by record type using type guards
 * import { isShape, isPage, isAsset } from '@tldraw/tlschema'
 * const shapes = allRecords.filter(isShape)
 * const pages = allRecords.filter(isPage)
 * const assets = allRecords.filter(isAsset)
 * ```
 *
 * @public
 */
export type TLRecord = TLDefaultRecord | TLCustomRecord
