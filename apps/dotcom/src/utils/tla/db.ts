function createWithDefault<T>(partial: Partial<T>, defaults: Partial<T>): T {
	return {
		...defaults,
		...partial,
	} as T
}

/* -------------------- Id types -------------------- */

export type TldrawAppUserId = `user:${string}` & { __brand: 'user' }
export type TldrawAppFileId = `file:${string}` & { __brand: 'file' }
export type TldrawAppWorkspaceId = `workspace:${string}` & { __brand: 'workspace' }
export type TldrawAppGroupId = `group:${string}` & { __brand: 'group' }
export type TldrawAppWorkspaceMembershipId = `workspaceMembership:${string}` & {
	__brand: 'workspaceMembership'
}
export type TldrawAppGroupMembershipId = `groupMembership:${string}` & {
	__brand: 'groupMembership'
}
export type TldrawAppStarId = `star:${string}` & { __brand: 'star' }
export type TldrawAppVisitId = `visit:${string}` & { __brand: 'visit' }

type TldrawAppId =
	| TldrawAppUserId
	| TldrawAppFileId
	| TldrawAppWorkspaceId
	| TldrawAppGroupId
	| TldrawAppWorkspaceMembershipId
	| TldrawAppGroupMembershipId
	| TldrawAppStarId
	| TldrawAppVisitId

let _id = 1

export function createTlaId<const T extends TldrawAppId['__brand']>(
	brand: T,
	id?: number | string
) {
	return `${brand}:${id ?? _id++}` as TldrawAppId & { __brand: T }
}

export function getCleanId<T extends TldrawAppId>(id: T) {
	return id.split(':')[1] as string
}

export interface TldrawAppRow {
	createdAt: number
	createdBy: TldrawAppUserId
	updatedAt: number
	updatedBy: TldrawAppUserId
}

/* ---------------------- User ---------------------- */

export interface TldrawAppUser extends TldrawAppRow {
	id: TldrawAppUserId
	name: string
	email: string
	icon: string
}

const defaultUser: TldrawAppUser = {
	id: createTlaId('user', 0),
	createdAt: Date.now(),
	createdBy: createTlaId('user', 0),
	updatedAt: Date.now(),
	updatedBy: createTlaId('user', 0),
	name: 'Steve Ruiz',
	email: 'steve@tldraw.com',
	icon: '',
}

export function createTldrawAppUser(
	user: Partial<Omit<TldrawAppUser, 'id'>> & { id: TldrawAppUser['id'] }
): TldrawAppUser {
	return createWithDefault(user, defaultUser)
}

/* -------------------- Workspace ------------------- */

export interface TldrawAppWorkspace extends TldrawAppRow {
	id: TldrawAppWorkspaceId
	name: string
	icon: string
}

const defaultWorkspace: TldrawAppWorkspace = {
	id: createTlaId('workspace', 0),
	createdAt: Date.now(),
	createdBy: defaultUser.id,
	updatedAt: Date.now(),
	updatedBy: defaultUser.id,
	name: 'tldraw',
	icon: 'tldraw',
}

export function createTldrawAppWorkspace(
	workspace: Partial<Omit<TldrawAppWorkspace, 'id'>> & { id: TldrawAppWorkspace['id'] }
): TldrawAppWorkspace {
	return createWithDefault(workspace, defaultWorkspace)
}

/* ---------------------- Group --------------------- */

export interface TldrawAppGroup extends TldrawAppRow {
	id: TldrawAppGroupId
	workspaceId: TldrawAppWorkspaceId
	name: string
}

const defaultGroup: TldrawAppGroup = {
	id: createTlaId('group', 0),
	workspaceId: defaultWorkspace.id,
	createdAt: Date.now(),
	createdBy: defaultUser.id,
	updatedAt: Date.now(),
	updatedBy: defaultUser.id,
	name: 'My group',
}

export function createTldrawAppGroup(
	group: Partial<Omit<TldrawAppGroup, 'id'>> & { id: TldrawAppGroup['id'] }
): TldrawAppGroup {
	return createWithDefault(group, defaultGroup)
}

/* -------------- Workspace membership -------------- */

export interface TldrawAppWorkspaceMembership extends TldrawAppRow {
	id: TldrawAppWorkspaceMembershipId
	workspaceId: TldrawAppWorkspaceId
	userId: TldrawAppUserId
}

const defaultMembership: TldrawAppWorkspaceMembership = {
	id: createTlaId('workspaceMembership', 0),
	createdAt: Date.now(),
	createdBy: defaultUser.id,
	updatedAt: Date.now(),
	updatedBy: defaultUser.id,
	workspaceId: defaultWorkspace.id,
	userId: defaultUser.id,
}

export function createTldrawAppWorkspaceMembership(
	membership: Partial<Omit<TldrawAppWorkspaceMembership, 'id'>> & {
		id: TldrawAppWorkspaceMembership['id']
	}
): TldrawAppWorkspaceMembership {
	return createWithDefault(membership, defaultMembership)
}

/* ---------------- Group membership ---------------- */

export interface TldrawAppGroupMembership extends TldrawAppRow {
	id: TldrawAppGroupMembershipId
	workspaceId: TldrawAppWorkspaceId
	userId: TldrawAppUserId
	groupId: TldrawAppGroupId
}

const defaultGroupMembership: TldrawAppGroupMembership = {
	id: createTlaId('groupMembership', 0),
	createdAt: Date.now(),
	createdBy: defaultUser.id,
	updatedAt: Date.now(),
	updatedBy: defaultUser.id,
	workspaceId: defaultWorkspace.id,
	userId: defaultUser.id,
	groupId: defaultGroup.id,
}

export function createTldrawAppGroupMembership(
	membership: Partial<Omit<TldrawAppGroupMembership, 'id'>> & { id: TldrawAppGroupMembership['id'] }
): TldrawAppGroupMembership {
	return createWithDefault(membership, defaultGroupMembership)
}

/* ---------------------- File ---------------------- */

export interface TldrawAppFile extends TldrawAppRow {
	id: TldrawAppFileId
	workspaceId: TldrawAppWorkspaceId
	owner: TldrawAppUserId | TldrawAppGroupId
	name: string
	thumbnail: string
	shared: boolean
}

const defaultFile: TldrawAppFile = {
	id: createTlaId('file', 0),
	createdAt: Date.now(),
	createdBy: defaultUser.id,
	updatedAt: Date.now(),
	updatedBy: defaultUser.id,
	workspaceId: defaultWorkspace.id,
	owner: defaultUser.id,
	name: '',
	thumbnail: '',
	shared: false,
}

export function createTldrawAppFile(
	file: Partial<Omit<TldrawAppFile, 'id'>> & { id: TldrawAppFile['id'] }
): TldrawAppFile {
	return createWithDefault(file, defaultFile)
}

/* ---------------------- Star ---------------------- */

export interface TldrawAppStar extends TldrawAppRow {
	id: TldrawAppStarId
	workspaceId: TldrawAppWorkspaceId
	userId: TldrawAppUserId
	fileId: TldrawAppFileId
}

const defaultStar: TldrawAppStar = {
	id: createTlaId('star', 0),
	createdAt: Date.now(),
	createdBy: defaultUser.id,
	updatedAt: Date.now(),
	updatedBy: defaultUser.id,
	workspaceId: defaultWorkspace.id,
	userId: defaultUser.id,
	fileId: defaultFile.id,
}

export function createTldrawAppStar(
	star: Partial<Omit<TldrawAppStar, 'id'>> & { id: TldrawAppStar['id'] }
): TldrawAppStar {
	return createWithDefault(star, defaultStar)
}

/* ---------------------- Visits ---------------------- */

export interface TldrawAppVisit extends TldrawAppRow {
	id: TldrawAppVisitId
	workspaceId: TldrawAppWorkspaceId
	userId: TldrawAppUserId
	fileId: TldrawAppFileId
}

const defaultVisit: TldrawAppVisit = {
	id: createTlaId('visit', 0),
	createdAt: Date.now(),
	createdBy: defaultUser.id,
	updatedAt: Date.now(),
	updatedBy: defaultUser.id,
	workspaceId: defaultWorkspace.id,
	userId: defaultUser.id,
	fileId: defaultFile.id,
}

export function createTldrawAppVisit(
	visit: Partial<Omit<TldrawAppVisit, 'id'>> & { id: TldrawAppVisit['id'] }
): TldrawAppVisit {
	return createWithDefault(visit, defaultVisit)
}

/* -------------------- Database -------------------- */

export interface TldrawAppDb {
	users: TldrawAppUser[]
	files: TldrawAppFile[]
	groups: TldrawAppGroup[]
	workspaces: TldrawAppWorkspace[]
	stars: TldrawAppStar[]
	workspaceMemberships: TldrawAppWorkspaceMembership[]
	groupMemberships: TldrawAppGroupMembership[]
	visits: TldrawAppVisit[]
}

const day = 1000 * 60 * 60 * 24
export const defaultDb: TldrawAppDb = {
	users: [defaultUser],
	visits: [],
	files: [
		defaultFile,
		createTldrawAppFile({
			id: createTlaId('file'),
			createdAt: Date.now() - day * 0.5,
		}),
		createTldrawAppFile({
			id: createTlaId('file'),
			createdAt: Date.now() - day * 0.6,
		}),
		createTldrawAppFile({
			id: createTlaId('file'),
			createdAt: Date.now() - day * 0.7,
		}),
		createTldrawAppFile({
			id: createTlaId('file'),
			createdAt: Date.now() - day * 1.2,
		}),
		createTldrawAppFile({
			id: createTlaId('file'),
			createdAt: Date.now() - day * 1.3,
		}),
		createTldrawAppFile({
			id: createTlaId('file'),
			createdAt: Date.now() - day * 1.4,
		}),
		createTldrawAppFile({
			id: createTlaId('file'),
			createdAt: Date.now() - day * 1.6,
		}),
		createTldrawAppFile({
			id: createTlaId('file'),
			createdAt: Date.now() - day * 2.5,
		}),
		createTldrawAppFile({
			id: createTlaId('file'),
			createdAt: Date.now() - day * 3.5,
		}),
		// Group files
		createTldrawAppFile({
			id: createTlaId('file'),
			owner: defaultGroup.id,
			createdAt: Date.now() - day * 1,
		}),
		createTldrawAppFile({
			id: createTlaId('file'),
			owner: defaultGroup.id,
			createdAt: Date.now() - day * 2,
		}),
		createTldrawAppFile({
			id: createTlaId('file'),
			owner: defaultGroup.id,
			createdAt: Date.now() - day * 3,
		}),
		createTldrawAppFile({
			id: createTlaId('file'),
			owner: createTlaId('group', 2),
			createdAt: Date.now() - day * 3,
		}),
	],
	stars: [defaultStar],
	groups: [
		defaultGroup,
		createTldrawAppGroup({ id: createTlaId('group', 2), name: 'My other group' }),
	],
	workspaces: [defaultWorkspace],
	workspaceMemberships: [defaultMembership],
	groupMemberships: [
		defaultGroupMembership,
		createTldrawAppGroupMembership({
			id: createTlaId('groupMembership'),
			userId: defaultUser.id,
			workspaceId: defaultWorkspace.id,
			groupId: createTlaId('group', 2),
		}),
	],
}
