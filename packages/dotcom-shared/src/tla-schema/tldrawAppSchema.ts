import { StoreSchema, createMigrationSequence } from '@tldraw/store'
import { TldrawAppFile, TldrawAppFileRecordType } from './TldrawAppFile'
import { TldrawAppFileEdit, TldrawAppFileEditRecordType } from './TldrawAppFileEdit'
import { TldrawAppFileVisit, TldrawAppFileVisitRecordType } from './TldrawAppFileVisit'
import { TldrawAppSessionState, TldrawAppSessionStateRecordType } from './TldrawAppSessionState'
import { TldrawAppUser, TldrawAppUserRecordType } from './TldrawAppUser'

export type TldrawAppRecord =
	| TldrawAppFile
	| TldrawAppFileVisit
	| TldrawAppFileEdit
	| TldrawAppUser
	| TldrawAppSessionState

export type TldrawAppRecordId = TldrawAppRecord['id']

const migrations = createMigrationSequence({
	sequenceId: 'com.tldraw.app',
	sequence: [],
})

export const tldrawAppSchema = StoreSchema.create<TldrawAppRecord>(
	{
		user: TldrawAppUserRecordType,
		file: TldrawAppFileRecordType,
		'file-visit': TldrawAppFileVisitRecordType,
		'file-edit': TldrawAppFileEditRecordType,
		session: TldrawAppSessionStateRecordType,
	},
	{
		migrations: [migrations],
	}
)
