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

export interface TldrawAppFileVisit extends BaseRecord<'file-visit', RecordId<TldrawAppFileVisit>> {
	userId: TldrawAppUserId
	fileId: TldrawAppFileId
	createdAt: number
}

export type TldrawAppFileVisitId = RecordId<TldrawAppFileVisit>

/** @public */
export const tldrawAppFileVisitValidator: T.Validator<TldrawAppFileVisit> = T.model(
	'file-visit',
	T.object({
		typeName: T.literal('file-visit'),
		id: idValidator<TldrawAppFileVisitId>('file-visit'),
		userId: idValidator<TldrawAppUserId>('user'),
		fileId: idValidator<TldrawAppFileId>('file'),
		createdAt: T.number,
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
	})
)
