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

export interface TldrawAppGroupMembership
	extends BaseRecord<'group-membership', RecordId<TldrawAppGroupMembership>> {
	workspaceId: TldrawAppWorkspaceId
	groupId: TldrawAppGroupId
	userId: TldrawAppUserId
	createdAt: number
	updatedAt: number
}

export type TldrawAppGroupMembershipId = RecordId<TldrawAppGroupMembership>

/** @public */
export const tldrawAppGroupMembershipValidator: T.Validator<TldrawAppGroupMembership> = T.model(
	'group-membership',
	T.object({
		typeName: T.literal('group-membership'),
		id: idValidator<TldrawAppGroupMembershipId>('group-membership'),
		workspaceId: idValidator<TldrawAppWorkspaceId>('workspace'),
		groupId: idValidator<TldrawAppGroupId>('group'),
		userId: idValidator<TldrawAppUserId>('user'),
		createdAt: T.number,
		updatedAt: T.number,
	})
)

/** @public */
export const tldrawAppGroupMembershipVersions = createMigrationIds(
	'com.tldraw.group-membership',
	{} as const
)

/** @public */
export const tldrawAppGroupMembershipMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw-app.group-membership',
	recordType: 'group-membership',
	sequence: [],
})

/** @public */
export const TldrawAppGroupMembershipRecordType = createRecordType<TldrawAppGroupMembership>(
	'group-membership',
	{
		validator: tldrawAppGroupMembershipValidator,
		scope: 'document',
	}
).withDefaultProperties(
	(): Omit<TldrawAppGroupMembership, 'id' | 'typeName' | 'workspaceId' | 'groupId' | 'userId'> => ({
		createdAt: Date.now(),
		updatedAt: Date.now(),
	})
)
