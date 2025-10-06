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
 * Union type representing all possible record types in a tldraw store.
 * This includes both persistent records (documents, pages, shapes, assets, bindings)
 * and session/presence records (cameras, instances, pointers, page states).
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
export type TLRecord =
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
