import { StoreSchema, createMigrationSequence } from 'tldraw'
import { TldrawAppFile, TldrawAppFileRecordType } from './schema/TldrawAppFile'
import { TldrawAppFileEdit, TldrawAppFileEditRecordType } from './schema/TldrawAppFileEdit'
import { TldrawAppFileVisit, TldrawAppFileVisitRecordType } from './schema/TldrawAppFileVisit'
import {
	TldrawAppSessionState,
	TldrawAppSessionStateRecordType,
} from './schema/TldrawAppSessionState'
import { TldrawAppUser, TldrawAppUserRecordType } from './schema/TldrawAppUser'

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

export function getCleanId(id: string) {
	return id.split(':')[1]
}
