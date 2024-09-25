import {
	BaseRecord,
	RecordId,
	T,
	createMigrationIds,
	createRecordMigrationSequence,
	createRecordType,
	idValidator,
} from 'tldraw'
import { TldrawAppUserId } from './TldrawAppUser'
import { TldrawAppWorkspaceId } from './TldrawAppWorkspace'

export interface TldrawAppWorkspaceVisit
	extends BaseRecord<'workspace-visit', RecordId<TldrawAppWorkspaceVisit>> {
	workspaceId: TldrawAppWorkspaceId
	userId: TldrawAppUserId
	createdAt: number
}

export type TldrawAppFileVisitId = RecordId<TldrawAppWorkspaceVisit>

/** @public */
export const tldrawAppWorkspaceVisitValidator: T.Validator<TldrawAppWorkspaceVisit> = T.model(
	'workspace-visit',
	T.object({
		typeName: T.literal('workspace-visit'),
		id: idValidator<TldrawAppFileVisitId>('workspace-visit'),
		workspaceId: idValidator<TldrawAppWorkspaceId>('workspace'),
		userId: idValidator<TldrawAppUserId>('user'),
		createdAt: T.number,
	})
)

/** @public */
export const tldrawAppWorkspaceVisitVersions = createMigrationIds(
	'com.tldraw.workspace-visit',
	{} as const
)

/** @public */
export const tldrawAppWorkspaceVisitMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw-app.workspace-visit',
	recordType: 'visit',
	sequence: [],
})

/** @public */
export const TldrawAppWorkspaceVisitRecordType = createRecordType<TldrawAppWorkspaceVisit>(
	'workspace-visit',
	{
		validator: tldrawAppWorkspaceVisitValidator,
		scope: 'document',
	}
).withDefaultProperties(
	(): Omit<TldrawAppWorkspaceVisit, 'id' | 'typeName' | 'workspaceId' | 'userId' | 'fileId'> => ({
		createdAt: Date.now(),
	})
)
