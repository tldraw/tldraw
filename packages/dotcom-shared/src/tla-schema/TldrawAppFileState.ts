import {
	BaseRecord,
	RecordId,
	createMigrationIds,
	createRecordMigrationSequence,
	createRecordType,
} from '@tldraw/store'
import { T } from '@tldraw/validate'
import { TLSessionStateSnapshot } from 'tldraw'
import { TldrawAppFileId } from './TldrawAppFile'
import { TldrawAppUserId } from './TldrawAppUser'
import { idValidator } from './idValidator'

export interface TldrawAppFileState extends BaseRecord<'file-state', RecordId<TldrawAppFileState>> {
	ownerId: TldrawAppUserId
	fileId: TldrawAppFileId
	firstVisitAt: number | null
	lastEditAt: number | null
	lastSessionState: TLSessionStateSnapshot | null
	lastVisitAt: number | null
}

export type TldrawAppFileStateId = RecordId<TldrawAppFileState>

/** @public */
export const tldrawAppFileStateValidator: T.Validator<TldrawAppFileState> = T.model(
	'file-state',
	T.object({
		typeName: T.literal('file-state'),
		id: idValidator<TldrawAppFileStateId>('file-state'),
		ownerId: idValidator<TldrawAppUserId>('user'),
		fileId: idValidator<TldrawAppFileId>('file'),
		firstVisitAt: T.number.nullable(),
		lastEditAt: T.number.nullable(),
		lastVisitAt: T.number.nullable(),
		lastSessionState: T.jsonValue.nullable() as T.Validator<TLSessionStateSnapshot | null>,
	})
)

/** @public */
export const tldrawAppFileStateVersions = createMigrationIds(
	'com.tldraw-app.file-state',
	{} as const
)

/** @public */
export const tldrawAppFileStateMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw-app.file-state',
	recordType: 'visit',
	sequence: [],
})

/** @public */
export const TldrawAppFileStateRecordType = createRecordType<TldrawAppFileState>('file-state', {
	validator: tldrawAppFileStateValidator,
	scope: 'document',
}).withDefaultProperties(
	(): Omit<TldrawAppFileState, 'id' | 'typeName' | 'ownerId' | 'fileId'> => ({
		firstVisitAt: null,
		lastEditAt: null,
		lastSessionState: null,
		lastVisitAt: null,
	})
)
