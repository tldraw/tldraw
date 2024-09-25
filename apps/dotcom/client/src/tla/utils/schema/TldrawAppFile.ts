import {
	BaseRecord,
	RecordId,
	T,
	createMigrationIds,
	createRecordMigrationSequence,
	createRecordType,
	idValidator,
} from 'tldraw'
import { TldrawAppGroupId } from './TldrawAppGroup'
import { TldrawAppUserId } from './TldrawAppUser'
import { TldrawAppWorkspaceId } from './TldrawAppWorkspace'

export interface TldrawAppFile extends BaseRecord<'file', RecordId<TldrawAppFile>> {
	name: string
	workspaceId: TldrawAppWorkspaceId
	owner: TldrawAppUserId | TldrawAppGroupId | 'temporary'
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
		workspaceId: idValidator<TldrawAppWorkspaceId>('workspace'),
		owner: T.or(
			T.literal('temporary'),
			T.or(idValidator<TldrawAppUserId>('user'), idValidator<TldrawAppGroupId>('group'))
		),
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
