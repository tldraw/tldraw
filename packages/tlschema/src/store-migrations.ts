import { createMigrationIds, createMigrationSequence } from '@tldraw/store'
import { IndexKey, objectMapEntries } from '@tldraw/utils'
import { TLPage } from './records/TLPage'
import { TLShape } from './records/TLShape'
import { TLLineShape } from './shapes/TLLineShape'

/**
 * Migration version constants for store-level schema changes.
 * Each version represents a breaking change that requires data transformation.
 *
 * @internal
 */
const Versions = createMigrationIds('com.tldraw.store', {
	RemoveCodeAndIconShapeTypes: 1,
	AddInstancePresenceType: 2,
	RemoveTLUserAndPresenceAndAddPointer: 3,
	RemoveUserDocument: 4,
	FixIndexKeys: 5,
} as const)

/**
 * Migration version identifiers for store-level migrations.
 * These versions track changes to the overall store structure and data model.
 *
 * @example
 * ```ts
 * import { storeVersions } from '@tldraw/tlschema'
 *
 * // Check if a specific migration version exists
 * const hasRemoveCodeShapes = storeVersions.RemoveCodeAndIconShapeTypes
 * ```
 *
 * @public
 */
export { Versions as storeVersions }

/**
 * Store-level migration sequence that handles evolution of the tldraw data model.
 * These migrations run when the store schema version changes and ensure backward
 * compatibility by transforming old data structures to new formats.
 *
 * The migrations handle:
 * - Removal of deprecated shape types (code, icon)
 * - Addition of new record types (instance presence)
 * - Cleanup of obsolete user and presence data
 * - Removal of deprecated user document records
 *
 * @example
 * ```ts
 * import { storeMigrations } from '@tldraw/tlschema'
 * import { migrate } from '@tldraw/store'
 *
 * // Apply store migrations to old data
 * const migratedStore = migrate({
 *   store: oldStoreData,
 *   migrations: storeMigrations,
 *   fromVersion: 0,
 *   toVersion: storeMigrations.currentVersion
 * })
 * ```
 *
 * @public
 */
export const storeMigrations = createMigrationSequence({
	sequenceId: 'com.tldraw.store',
	retroactive: false,
	sequence: [
		{
			id: Versions.RemoveCodeAndIconShapeTypes,
			scope: 'store',
			up: (store) => {
				for (const [id, record] of objectMapEntries(store)) {
					if (
						record.typeName === 'shape' &&
						((record as TLShape).type === 'icon' || (record as TLShape).type === 'code')
					) {
						delete store[id]
					}
				}
			},
		},
		{
			id: Versions.AddInstancePresenceType,
			scope: 'store',
			up(_store) {
				// noop
				// there used to be a down migration for this but we made down migrations optional
				// and we don't use them on store-level migrations so we can just remove it
			},
		},
		{
			// remove user and presence records and add pointer records
			id: Versions.RemoveTLUserAndPresenceAndAddPointer,
			scope: 'store',
			up: (store) => {
				for (const [id, record] of objectMapEntries(store)) {
					if (record.typeName.match(/^(user|user_presence)$/)) {
						delete store[id]
					}
				}
			},
		},
		{
			// remove user document records
			id: Versions.RemoveUserDocument,
			scope: 'store',
			up: (store) => {
				for (const [id, record] of objectMapEntries(store)) {
					if (record.typeName.match('user_document')) {
						delete store[id]
					}
				}
			},
		},
		{
			id: Versions.FixIndexKeys,
			scope: 'record',
			up: (record) => {
				if (['shape', 'page'].includes(record.typeName) && 'index' in record) {
					const recordWithIndex = record as TLShape | TLPage
					// Our newer fractional indexed library (more correctly) validates that indices
					// do not end with 0. ('a0' being an exception)
					if (recordWithIndex.index.endsWith('0') && recordWithIndex.index !== 'a0') {
						recordWithIndex.index = (recordWithIndex.index.slice(0, -1) +
							getNRandomBase62Digits(3)) as IndexKey
					}
					// Line shapes have 'points' that have indices as well.
					if (record.typeName === 'shape' && (recordWithIndex as TLShape).type === 'line') {
						const lineShape = recordWithIndex as TLLineShape
						for (const [_, point] of objectMapEntries(lineShape.props.points)) {
							if (point.index.endsWith('0') && point.index !== 'a0') {
								point.index = (point.index.slice(0, -1) + getNRandomBase62Digits(3)) as IndexKey
							}
						}
					}
				}
			},
			down: () => {
				// noop
				// Enables tlsync to support older clients so as to not force people to refresh immediately after deploying.
			},
		},
	],
})

const BASE_62_DIGITS_WITHOUT_ZERO = '123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const getRandomBase62Digit = () => {
	return BASE_62_DIGITS_WITHOUT_ZERO.charAt(
		Math.floor(Math.random() * BASE_62_DIGITS_WITHOUT_ZERO.length)
	)
}

const getNRandomBase62Digits = (n: number) => {
	return Array.from({ length: n }, getRandomBase62Digit).join('')
}
