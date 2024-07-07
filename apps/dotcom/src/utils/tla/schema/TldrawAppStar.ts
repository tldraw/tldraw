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

export interface TldrawAppStar extends BaseRecord<'star', RecordId<TldrawAppStar>> {
	workspaceId: TldrawAppWorkspaceId
	userId: TldrawAppUserId
	fileId: TldrawAppFileId
	createdAt: number
	updatedAt: number
}

export type TldrawAppStarId = RecordId<TldrawAppStar>

/** @public */
export const tldrawAppStarValidator: T.Validator<TldrawAppStar> = T.model(
	'star',
	T.object({
		typeName: T.literal('star'),
		id: idValidator<TldrawAppStarId>('star'),
		workspaceId: idValidator<TldrawAppWorkspaceId>('workspace'),
		userId: idValidator<TldrawAppUserId>('user'),
		fileId: idValidator<TldrawAppFileId>('file'),
		createdAt: T.number,
		updatedAt: T.number,
	})
)

/** @public */
export const tldrawAppStarVersions = createMigrationIds('com.tldraw.star', {} as const)

/** @public */
export const tldrawAppStarMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw-app.star',
	recordType: 'star',
	sequence: [],
})

/** @public */
export const TldrawAppStarRecordType = createRecordType<TldrawAppStar>('star', {
	validator: tldrawAppStarValidator,
	scope: 'document',
}).withDefaultProperties(
	(): Omit<TldrawAppStar, 'id' | 'typeName' | 'workspaceId' | 'userId' | 'fileId'> => ({
		createdAt: Date.now(),
		updatedAt: Date.now(),
	})
)
