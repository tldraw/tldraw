import {
	BaseRecord,
	RecordId,
	createMigrationIds,
	createRecordMigrationSequence,
	createRecordType,
} from '@tldraw/store'
import { T } from '@tldraw/validate'
import { TldrawAppFileId } from './TldrawAppFile'
import { idValidator } from './idValidator'

export interface TldrawAppFileVisit extends BaseRecord<'file-visit', RecordId<TldrawAppFileVisit>> {
	fileId: TldrawAppFileId
	guestInfo?: {
		fileName: string
	}
	createdAt: number
}

export type TldrawAppFileVisitId = RecordId<TldrawAppFileVisit>

/** @public */
export const tldrawAppFileVisitValidator: T.Validator<TldrawAppFileVisit> = T.model(
	'file-visit',
	T.object({
		typeName: T.literal('file-visit'),
		id: idValidator<TldrawAppFileVisitId>('file-visit'),
		fileId: idValidator<TldrawAppFileId>('file'),
		guestInfo: T.object({
			fileName: T.string,
		}).optional(),
		createdAt: T.number,
	})
)

/** @public */
export const tldrawAppFileVisitVersions = createMigrationIds('com.tldraw-app.file-visit', {
	UserCentric: 1,
} as const)

/** @public */
export const tldrawAppFileVisitMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw-app.file-visit',
	recordType: 'visit',
	sequence: [
		{
			id: tldrawAppFileVisitVersions.UserCentric,
			up(record: any) {
				delete record.userId
				record.fileName = ''
			},
			down(record: any) {
				delete record.fileName
				record.userId = ''
			},
		},
	],
})

/** @public */
export const TldrawAppFileVisitRecordType = createRecordType<TldrawAppFileVisit>('file-visit', {
	validator: tldrawAppFileVisitValidator,
	scope: 'document',
}).withDefaultProperties(
	(): Omit<TldrawAppFileVisit, 'id' | 'typeName' | 'fileId'> => ({
		createdAt: Date.now(),
	})
)
