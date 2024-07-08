import { StoreSchema } from 'tldraw'
import { TldrawAppFile, TldrawAppFileRecordType } from './schema/TldrawAppFile'
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
import { TldrawAppVisit, TldrawAppVisitRecordType } from './schema/TldrawAppVisit'
import { TldrawAppWorkspace, TldrawAppWorkspaceRecordType } from './schema/TldrawAppWorkspace'
import {
	TldrawAppWorkspaceMembership,
	TldrawAppWorkspaceMembershipRecordType,
} from './schema/TldrawAppWorkspaceMembership'

export const tlaRecords = [
	TldrawAppFileRecordType,
	TldrawAppStarRecordType,
	TldrawAppVisitRecordType,
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
	| TldrawAppVisit
	| TldrawAppGroupMembership
	| TldrawAppWorkspaceMembership
	| TldrawAppWorkspace
	| TldrawAppUser
	| TldrawAppGroup
	| TldrawAppSessionState

export type TldrawAppRecordId = TldrawAppRecord['id']

export const tldrawAppSchema = StoreSchema.create<TldrawAppRecord>({
	user: TldrawAppUserRecordType,
	workspace: TldrawAppWorkspaceRecordType,
	group: TldrawAppGroupRecordType,
	file: TldrawAppFileRecordType,
	star: TldrawAppStarRecordType,
	visit: TldrawAppVisitRecordType,
	'group-membership': TldrawAppGroupMembershipRecordType,
	'workspace-membership': TldrawAppWorkspaceMembershipRecordType,
	session: TldrawAppSessionStateRecordType,
})
