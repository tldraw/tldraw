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

export interface TldrawAppVisit extends BaseRecord<'visit', RecordId<TldrawAppVisit>> {
	workspaceId: TldrawAppWorkspaceId
	userId: TldrawAppUserId
	fileId: TldrawAppFileId
	createdAt: number
	updatedAt: number
}

export type TldrawAppVisitId = RecordId<TldrawAppVisit>

/** @public */
export const tldrawAppVisitValidator: T.Validator<TldrawAppVisit> = T.model(
	'visit',
	T.object({
		typeName: T.literal('visit'),
		id: idValidator<TldrawAppVisitId>('visit'),
		workspaceId: idValidator<TldrawAppWorkspaceId>('workspace'),
		userId: idValidator<TldrawAppUserId>('user'),
		fileId: idValidator<TldrawAppFileId>('file'),
		createdAt: T.number,
		updatedAt: T.number,
	})
)

/** @public */
export const tldrawAppVisitVersions = createMigrationIds('com.tldraw.visit', {} as const)

/** @public */
export const tldrawAppVisitMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw-app.visit',
	recordType: 'visit',
	sequence: [],
})

/** @public */
export const TldrawAppVisitRecordType = createRecordType<TldrawAppVisit>('visit', {
	validator: tldrawAppVisitValidator,
	scope: 'document',
}).withDefaultProperties(
	(): Omit<TldrawAppVisit, 'id' | 'typeName' | 'workspaceId' | 'userId' | 'fileId'> => ({
		createdAt: Date.now(),
		updatedAt: Date.now(),
	})
)
