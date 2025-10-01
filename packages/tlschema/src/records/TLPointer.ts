import {
	BaseRecord,
	createMigrationIds,
	createRecordMigrationSequence,
	createRecordType,
	RecordId,
} from '@tldraw/store'
import { JsonObject } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { idValidator } from '../misc/id-validator'

/**
 * Represents the current pointer/cursor position and activity state.
 * This record tracks the mouse or touch pointer coordinates and when
 * the pointer was last active, useful for cursor synchronization in
 * collaborative environments.
 *
 * There is typically one pointer record per browser tab that gets updated
 * as the user moves their mouse or touches the screen.
 *
 * @example
 * ```ts
 * const pointer: TLPointer = {
 *   id: 'pointer:pointer',
 *   typeName: 'pointer',
 *   x: 150,
 *   y: 200,
 *   lastActivityTimestamp: Date.now(),
 *   meta: {}
 * }
 * ```
 *
 * @public
 */
export interface TLPointer extends BaseRecord<'pointer', TLPointerId> {
	x: number
	y: number
	lastActivityTimestamp: number
	meta: JsonObject
}

/**
 * A unique identifier for TLPointer records.
 *
 * Pointer IDs follow the format 'pointer:' followed by a unique identifier.
 * Typically there is one pointer record with a constant ID per session.
 *
 * @example
 * ```ts
 * const pointerId: TLPointerId = 'pointer:pointer'
 * ```
 *
 * @public
 */
export type TLPointerId = RecordId<TLPointer>

/**
 * Runtime validator for TLPointer records. Validates the structure
 * and types of all pointer properties to ensure data integrity.
 *
 * @example
 * ```ts
 * const pointer = {
 *   id: 'pointer:pointer',
 *   typeName: 'pointer',
 *   x: 100,
 *   y: 200,
 *   lastActivityTimestamp: Date.now(),
 *   meta: {}
 * }
 * const isValid = pointerValidator.isValid(pointer) // true
 * ```
 *
 * @public
 */
export const pointerValidator: T.Validator<TLPointer> = T.model(
	'pointer',
	T.object({
		typeName: T.literal('pointer'),
		id: idValidator<TLPointerId>('pointer'),
		x: T.number,
		y: T.number,
		lastActivityTimestamp: T.number,
		meta: T.jsonValue as T.ObjectValidator<JsonObject>,
	})
)

/**
 * Migration version identifiers for TLPointer records. Each version
 * represents a schema change that requires data transformation when
 * loading older documents.
 *
 * @public
 */
export const pointerVersions = createMigrationIds('com.tldraw.pointer', {
	AddMeta: 1,
})

/**
 * Migration sequence for TLPointer records. Defines how to transform
 * pointer records between different schema versions, ensuring data
 * compatibility when loading documents created with different versions.
 *
 * @example
 * ```ts
 * // Migrations are applied automatically when loading documents
 * const migratedPointer = pointerMigrations.migrate(oldPointer, targetVersion)
 * ```
 *
 * @public
 */
export const pointerMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw.pointer',
	recordType: 'pointer',
	sequence: [
		{
			id: pointerVersions.AddMeta,
			up: (record: any) => {
				record.meta = {}
			},
		},
	],
})

/**
 * The RecordType definition for TLPointer records. Defines validation,
 * scope, and default properties for pointer records in the tldraw store.
 *
 * Pointer records are scoped to the session level, meaning they are
 * specific to a browser tab and don't persist across sessions.
 *
 * @example
 * ```ts
 * const pointer = PointerRecordType.create({
 *   id: 'pointer:pointer',
 *   x: 0,
 *   y: 0
 * })
 * ```
 *
 * @public
 */
export const PointerRecordType = createRecordType<TLPointer>('pointer', {
	validator: pointerValidator,
	scope: 'session',
}).withDefaultProperties(
	(): Omit<TLPointer, 'id' | 'typeName'> => ({
		x: 0,
		y: 0,
		lastActivityTimestamp: 0,
		meta: {},
	})
)

/**
 * The constant ID used for the singleton TLPointer record.
 *
 * Since each browser tab typically has one pointer, this constant ID
 * is used universally across the application.
 *
 * @example
 * ```ts
 * const pointer = store.get(TLPOINTER_ID)
 * if (pointer) {
 *   console.log('Pointer at:', pointer.x, pointer.y)
 * }
 * ```
 *
 * @public
 */
export const TLPOINTER_ID = PointerRecordType.createId('pointer')
