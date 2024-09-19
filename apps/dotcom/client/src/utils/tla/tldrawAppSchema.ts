import { StoreSchema } from 'tldraw'
import { TldrawAppFile, TldrawAppFileRecordType } from './schema/TldrawAppFile'
import { TldrawAppFileVisit, TldrawAppFileVisitRecordType } from './schema/TldrawAppFileVisit'
import { TldrawAppGroup, TldrawAppGroupRecordType } from './schema/TldrawAppGroup'
import {
	TldrawAppGroupMembership,
	TldrawAppGroupMembershipRecordType,
} from './schema/TldrawAppGroupMembership'
import {
	TldrawAppSessionState,
	TldrawAppSessionStateRecordType,
} from './schema/TldrawAppSessionState'
import { TldrawAppStar, TldrawAppStarRecordType } from './schema/TldrawAppStar'
import { TldrawAppUser, TldrawAppUserRecordType } from './schema/TldrawAppUser'
import { TldrawAppWorkspace, TldrawAppWorkspaceRecordType } from './schema/TldrawAppWorkspace'
import {
	TldrawAppWorkspaceMembership,
	TldrawAppWorkspaceMembershipRecordType,
} from './schema/TldrawAppWorkspaceMembership'
import { TldrawAppWorkspaceVisit } from './schema/TldrawAppWorkspaceVisit'

export const tlaRecords = [
	TldrawAppFileRecordType,
	TldrawAppStarRecordType,
	TldrawAppFileVisitRecordType,
	TldrawAppGroupMembershipRecordType,
	TldrawAppWorkspaceMembershipRecordType,
	TldrawAppWorkspaceRecordType,
	TldrawAppUserRecordType,
	TldrawAppGroupRecordType,
	TldrawAppSessionStateRecordType,
]

export type TldrawAppRecord =
	| TldrawAppFile
	| TldrawAppStar
	| TldrawAppFileVisit
	| TldrawAppGroupMembership
	| TldrawAppWorkspaceMembership
	| TldrawAppWorkspace
	| TldrawAppUser
	| TldrawAppGroup
	| TldrawAppSessionState
	| TldrawAppWorkspaceVisit

export type TldrawAppRecordId = TldrawAppRecord['id']

export const tldrawAppSchema = StoreSchema.create<TldrawAppRecord>({
	user: TldrawAppUserRecordType,
	workspace: TldrawAppWorkspaceRecordType,
	group: TldrawAppGroupRecordType,
	file: TldrawAppFileRecordType,
	star: TldrawAppStarRecordType,
	'file-visit': TldrawAppFileVisitRecordType,
	'workspace-visit': TldrawAppGroupMembershipRecordType,
	'group-membership': TldrawAppGroupMembershipRecordType,
	'workspace-membership': TldrawAppWorkspaceMembershipRecordType,
	session: TldrawAppSessionStateRecordType,
})

export function getCleanId(id: string) {
	return id.split(':')[1]
}
