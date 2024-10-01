import {
	BaseRecord,
	RecordId,
	createMigrationIds,
	createRecordMigrationSequence,
	createRecordType,
} from '@tldraw/store'
import { T } from '@tldraw/validate'
import { TldrawAppFileId } from './TldrawAppFile'
import { TldrawAppUserId } from './TldrawAppUser'
import { idValidator } from './idValidator'

export interface TldrawAppFileEdit extends BaseRecord<'file-edit', RecordId<TldrawAppFileEdit>> {
	userId: TldrawAppUserId
	fileId: TldrawAppFileId
	sessionStartedAt: number
	fileOpenedAt: number
	createdAt: number
	updatedAt: number
}

export type TldrawAppFileEditId = RecordId<TldrawAppFileEdit>

/** @public */
export const tldrawAppFileEditValidator: T.Validator<TldrawAppFileEdit> = T.model(
	'file-edit',
	T.object({
		typeName: T.literal('file-edit'),
		id: idValidator<TldrawAppFileEditId>('file-edit'),
		userId: idValidator<TldrawAppUserId>('user'),
		fileId: idValidator<TldrawAppFileId>('file'),
		sessionStartedAt: T.number,
		fileOpenedAt: T.number,
		createdAt: T.number,
		updatedAt: T.number,
	})
)

/** @public */
export const tldrawAppFileEditVersions = createMigrationIds('com.tldraw.file-edit', {} as const)

/** @public */
export const tldrawAppFileEditMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw-app.file-edit',
	recordType: 'visit',
	sequence: [],
})

/** @public */
export const TldrawAppFileEditRecordType = createRecordType<TldrawAppFileEdit>('file-edit', {
	validator: tldrawAppFileEditValidator,
	scope: 'document',
}).withDefaultProperties(
	(): Omit<
		TldrawAppFileEdit,
		'id' | 'typeName' | 'workspaceId' | 'userId' | 'fileId' | 'fileOpenedAt' | 'sessionStartedAt'
	> => ({
		createdAt: Date.now(),
		updatedAt: Date.now(),
	})
)
