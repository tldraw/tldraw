import { createMigrationIds, createMigrationSequence } from '@tldraw/store'
import { objectMapEntries } from '@tldraw/utils'
import { TLShape } from './records/TLShape'

const Versions = createMigrationIds('com.tldraw.store', {
	RemoveCodeAndIconShapeTypes: 1,
	AddInstancePresenceType: 2,
	RemoveTLUserAndPresenceAndAddPointer: 3,
	RemoveUserDocument: 4,
} as const)

export { Versions as storeVersions }

/** @public */
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
	],
})
