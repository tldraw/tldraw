import {
	BaseRecord,
	RecordId,
	T,
	createMigrationIds,
	createRecordMigrationSequence,
	createRecordType,
	idValidator,
} from 'tldraw'
import { TldrawAppWorkspaceId } from './TldrawAppWorkspace'

export interface TldrawAppGroup extends BaseRecord<'group', RecordId<TldrawAppGroup>> {
	name: string
	avatar: string
	color: string
	workspaceId: TldrawAppWorkspaceId
	createdAt: number
	updatedAt: number
}

export type TldrawAppGroupId = RecordId<TldrawAppGroup>

/** @public */
export const tldrawAppGroupValidator: T.Validator<TldrawAppGroup> = T.model(
	'group',
	T.object({
		typeName: T.literal('group'),
		id: idValidator<TldrawAppGroupId>('group'),
		name: T.string,
		color: T.string,
		workspaceId: idValidator<TldrawAppWorkspaceId>('workspace'),
		avatar: T.string,
		createdAt: T.number,
		updatedAt: T.number,
	})
)

/** @public */
export const tldrawAppGroupVersions = createMigrationIds('com.tldraw.group', {} as const)

/** @public */
export const tldrawAppGroupMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw-app.group',
	recordType: 'group',
	sequence: [],
})

/** @public */
export const TldrawAppGroupRecordType = createRecordType<TldrawAppGroup>('group', {
	validator: tldrawAppGroupValidator,
	scope: 'document',
}).withDefaultProperties(
	(): Omit<TldrawAppGroup, 'id' | 'typeName' | 'workspaceId'> => ({
		name: 'New group',
		avatar: '',
		color: 'coral',
		createdAt: Date.now(),
		updatedAt: Date.now(),
	})
)
