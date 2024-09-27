import {
	BaseRecord,
	RecordId,
	createMigrationIds,
	createRecordMigrationSequence,
	createRecordType,
} from '@tldraw/store'
import { T } from '@tldraw/validate'
import { TldrawAppUserId } from './TldrawAppUser'
import { idValidator } from './idValidator'

export interface TldrawAppFile extends BaseRecord<'file', RecordId<TldrawAppFile>> {
	name: string
	owner: TldrawAppUserId | 'temporary'
	thumbnail: string
	shared: boolean
	sharedLinkType: 'view' | 'edit'
	createdAt: number
	updatedAt: number
	isEmpty: boolean
}

export type TldrawAppFileId = RecordId<TldrawAppFile>

/** @public */
export const tldrawAppFileValidator: T.Validator<TldrawAppFile> = T.model(
	'user',
	T.object({
		typeName: T.literal('file'),
		id: idValidator<TldrawAppFileId>('file'),
		name: T.string,
		owner: T.or(T.literal('temporary'), idValidator<TldrawAppUserId>('user')),
		shared: T.boolean,
		sharedLinkType: T.or(T.literal('view'), T.literal('edit')),
		thumbnail: T.string,
		createdAt: T.number,
		updatedAt: T.number,
		isEmpty: T.boolean,
	})
)

/** @public */
export const tldrawAppFileVersions = createMigrationIds('com.tldraw.file', {} as const)

/** @public */
export const tldrawAppFileMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw-app.file',
	recordType: 'user',
	sequence: [],
})

/** @public */
export const TldrawAppFileRecordType = createRecordType<TldrawAppFile>('file', {
	validator: tldrawAppFileValidator,
	scope: 'document',
}).withDefaultProperties(
	(): Omit<TldrawAppFile, 'id' | 'typeName' | 'workspaceId' | 'owner'> => ({
		name: '',
		thumbnail: '',
		createdAt: Date.now(),
		updatedAt: Date.now(),
		isEmpty: false,
		shared: false,
		sharedLinkType: 'edit',
	})
)
