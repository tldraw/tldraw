import {
	BaseRecord,
	RecordId,
	T,
	createMigrationIds,
	createRecordMigrationSequence,
	createRecordType,
	idValidator,
} from 'tldraw'
import { TldrawAppFileId } from './TldrawAppFile'
import { TldrawAppUserId } from './TldrawAppUser'
import { TldrawAppWorkspaceId } from './TldrawAppWorkspace'

export interface TldrawAppFileVisit extends BaseRecord<'file-visit', RecordId<TldrawAppFileVisit>> {
	workspaceId: TldrawAppWorkspaceId
	userId: TldrawAppUserId
	fileId: TldrawAppFileId
	createdAt: number
	editedSessionDate: number | null
}

export type TldrawAppFileVisitId = RecordId<TldrawAppFileVisit>

/** @public */
export const tldrawAppFileVisitValidator: T.Validator<TldrawAppFileVisit> = T.model(
	'file-visit',
	T.object({
		typeName: T.literal('file-visit'),
		id: idValidator<TldrawAppFileVisitId>('file-visit'),
		workspaceId: idValidator<TldrawAppWorkspaceId>('workspace'),
		userId: idValidator<TldrawAppUserId>('user'),
		fileId: idValidator<TldrawAppFileId>('file'),
		createdAt: T.number,
		editedSessionDate: T.number.nullable(),
	})
)

/** @public */
export const tldrawAppFileVisitVersions = createMigrationIds('com.tldraw.file-visit', {} as const)

/** @public */
export const tldrawAppFileVisitMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw-app.file-visit',
	recordType: 'visit',
	sequence: [],
})

/** @public */
export const TldrawAppFileVisitRecordType = createRecordType<TldrawAppFileVisit>('file-visit', {
	validator: tldrawAppFileVisitValidator,
	scope: 'document',
}).withDefaultProperties(
	(): Omit<TldrawAppFileVisit, 'id' | 'typeName' | 'workspaceId' | 'userId' | 'fileId'> => ({
		createdAt: Date.now(),
		editedSessionDate: null,
	})
)
