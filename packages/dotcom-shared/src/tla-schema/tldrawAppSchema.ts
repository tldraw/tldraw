import { StoreSchema, createMigrationIds, createMigrationSequence } from '@tldraw/store'
import { TldrawAppFile, TldrawAppFileRecordType, tldrawAppFileMigrations } from './TldrawAppFile'
import { TldrawAppFileState, TldrawAppFileStateRecordType } from './TldrawAppFileState'
import { TldrawAppSessionState, TldrawAppSessionStateRecordType } from './TldrawAppSessionState'
import { TldrawAppUser, TldrawAppUserRecordType } from './TldrawAppUser'

export type TldrawAppRecord =
	| TldrawAppFile
	| TldrawAppUser
	| TldrawAppSessionState
	| TldrawAppFileState

export type TldrawAppRecordId = TldrawAppRecord['id']

const versions = createMigrationIds('com.tldraw.app', {
	RemoveVisitAndEditRecords: 1,
} as const)

const migrations = createMigrationSequence({
	sequenceId: 'com.tldraw.app',
	sequence: [
		{
			id: versions.RemoveVisitAndEditRecords,
			scope: 'store',
			up(store) {
				for (const record of Object.values(store)) {
					if (record.typeName === 'file-edit' || record.typeName === 'file-view') {
						delete store[record.id]
					}
				}
			},
		},
	],
})

export const tldrawAppSchema = StoreSchema.create<TldrawAppRecord>(
	{
		user: TldrawAppUserRecordType,
		file: TldrawAppFileRecordType,
		'file-state': TldrawAppFileStateRecordType,
		session: TldrawAppSessionStateRecordType,
	},
	{
		migrations: [migrations, tldrawAppFileMigrations],
	}
)
