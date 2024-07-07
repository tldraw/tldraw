import {
	BaseRecord,
	RecordId,
	T,
	createMigrationIds,
	createRecordMigrationSequence,
	createRecordType,
	idValidator,
} from 'tldraw'

export interface TldrawAppWorkspace extends BaseRecord<'workspace', RecordId<TldrawAppWorkspace>> {
	name: string
	avatar: string
	createdAt: number
	updatedAt: number
}

export type TldrawAppWorkspaceId = RecordId<TldrawAppWorkspace>

/** @public */
export const tldrawAppWorkspaceValidator: T.Validator<TldrawAppWorkspace> = T.model(
	'workspace',
	T.object({
		typeName: T.literal('workspace'),
		id: idValidator<TldrawAppWorkspaceId>('workspace'),
		name: T.string,
		avatar: T.string,
		createdAt: T.number,
		updatedAt: T.number,
	})
)

/** @public */
export const tldrawAppWorkspaceVersions = createMigrationIds('com.tldraw.workspace', {} as const)

/** @public */
export const tldrawAppWorkspaceMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw-app.workspace',
	recordType: 'workspace',
	sequence: [],
})

/** @public */
export const TldrawAppWorkspaceRecordType = createRecordType<TldrawAppWorkspace>('workspace', {
	validator: tldrawAppWorkspaceValidator,
	scope: 'document',
}).withDefaultProperties(
	(): Omit<TldrawAppWorkspace, 'id' | 'typeName'> => ({
		name: 'Steve Ruiz',
		avatar: '',
		createdAt: Date.now(),
		updatedAt: Date.now(),
	})
)
