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

export interface TldrawAppWorkspaceMembership
	extends BaseRecord<'workspace-membership', RecordId<TldrawAppWorkspaceMembership>> {
	workspaceId: TldrawAppWorkspaceId
	userId: TldrawAppUserId
	createdAt: number
	updatedAt: number
}

export type TldrawAppWorkspaceMembershipId = RecordId<TldrawAppWorkspaceMembership>

/** @public */
export const tldrawAppWorkspaceMembershipValidator: T.Validator<TldrawAppWorkspaceMembership> =
	T.model(
		'workspace-membership',
		T.object({
			typeName: T.literal('workspace-membership'),
			id: idValidator<TldrawAppWorkspaceMembershipId>('workspace-membership'),
			workspaceId: idValidator<TldrawAppWorkspaceId>('workspace'),
			userId: idValidator<TldrawAppUserId>('user'),
			createdAt: T.number,
			updatedAt: T.number,
		})
	)

/** @public */
export const tldrawAppWorkspaceMembershipVersions = createMigrationIds(
	'com.tldraw.workspace-membership',
	{} as const
)

/** @public */
export const tldrawAppWorkspaceMembershipMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw-app.workspace-membership',
	recordType: 'workspace-membership',
	sequence: [],
})

/** @public */
export const TldrawAppWorkspaceMembershipRecordType =
	createRecordType<TldrawAppWorkspaceMembership>('workspace-membership', {
		validator: tldrawAppWorkspaceMembershipValidator,
		scope: 'document',
	}).withDefaultProperties(
		(): Omit<TldrawAppWorkspaceMembership, 'id' | 'typeName' | 'workspaceId' | 'userId'> => ({
			createdAt: Date.now(),
			updatedAt: Date.now(),
		})
	)
