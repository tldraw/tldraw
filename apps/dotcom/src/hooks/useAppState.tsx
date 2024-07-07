import { ReactNode, createContext, useContext, useMemo, useState } from 'react'
import {
	TldrawAppDb,
	TldrawAppFile,
	TldrawAppFileId,
	TldrawAppGroup,
	TldrawAppGroupId,
	TldrawAppUser,
	TldrawAppUserId,
	TldrawAppWorkspace,
	TldrawAppWorkspaceId,
	createTlaId,
	defaultDb,
} from '../utils/tla/db'

export interface TldrawAppState {
	db: TldrawAppDb
	session: {
		userId: TldrawAppUserId
		workspaceId: TldrawAppWorkspaceId
	} | null
	isSidebarOpen: boolean
	sidebarActiveTab: 'recent' | 'groups'
}

export interface TldrawAppApi {
	signIn: (user: TldrawAppUser) => Promise<{ success: true } | { success: false; error: string }>
	signOut: () => Promise<{ success: true } | { success: false; error: string }>
	toggleSidebar: () => void
	setSidebarActiveTab: (tab: TldrawAppState['sidebarActiveTab']) => void
	getUser(db: TldrawAppDb, id: TldrawAppUserId): TldrawAppUser | undefined
	getFile(db: TldrawAppDb, id: TldrawAppFileId): TldrawAppFile | undefined
	getGroup(db: TldrawAppDb, id: TldrawAppGroupId): TldrawAppGroup | undefined
	getWorkspace(db: TldrawAppDb, id: TldrawAppWorkspaceId): TldrawAppWorkspace | undefined
	getWorkspaceUsers(db: TldrawAppDb, workspaceId: TldrawAppWorkspaceId): TldrawAppUser[]
	getWorkspaceGroups(db: TldrawAppDb, workspaceId: TldrawAppWorkspaceId): TldrawAppGroup[]
	getUserFiles(
		db: TldrawAppDb,
		userId: TldrawAppUserId,
		workspaceId: TldrawAppWorkspaceId
	): TldrawAppFile[]
	getUserRecentFiles(
		db: TldrawAppDb,
		userId: TldrawAppUserId,
		workspaceId: TldrawAppWorkspaceId
	): TldrawAppFile[]
	getUserStarredFiles(
		db: TldrawAppDb,
		userId: TldrawAppUserId,
		workspaceId: TldrawAppWorkspaceId
	): TldrawAppFile[]
	getUserSharedFiles(
		db: TldrawAppDb,
		userId: TldrawAppUserId,
		workspaceId: TldrawAppWorkspaceId
	): TldrawAppFile[]
	getUserGroups(
		db: TldrawAppDb,
		userId: TldrawAppUserId,
		workspaceId: TldrawAppWorkspaceId
	): TldrawAppGroup[]
	getGroupFiles(
		db: TldrawAppDb,
		groupId: TldrawAppGroupId,
		workspaceId: TldrawAppWorkspaceId
	): TldrawAppFile[]
	logVisit(
		db: TldrawAppDb,
		userId: TldrawAppUserId,
		workspaceId: TldrawAppWorkspaceId,
		fileId: TldrawAppFileId
	): void
}

const apiContext = createContext<TldrawAppApi>({} as TldrawAppApi)

const appStateContext = createContext<TldrawAppState>({} as TldrawAppState)

export function AppStateProvider({ children }: { children: ReactNode }) {
	const [appState, setAppState] = useState<TldrawAppState>({
		db: defaultDb,
		// auth
		session: {
			userId: createTlaId('user', 0), // null,
			workspaceId: createTlaId('workspace', 0),
		},
		// sidebar
		isSidebarOpen: true,
		sidebarActiveTab: 'recent',
	})

	const api = useMemo<TldrawAppApi>(
		() => ({
			signIn: async (user, forceError = false) => {
				await new Promise((resolve) => setTimeout(resolve, 1000))
				if (forceError) {
					return { error: 'An error occurred', success: false }
				}
				setAppState((appState) => ({
					...appState,
					session: {
						userId: createTlaId('user', 0), // null,
						workspaceId: createTlaId('workspace', 0),
					},
				}))

				return { success: true }
			},
			signOut: async () => {
				setAppState((appState) => ({
					...appState,
					session: null,
				}))

				return { success: true }
			},
			toggleSidebar: () => {
				setAppState((appState) => ({
					...appState,
					isSidebarOpen: !appState.isSidebarOpen,
				}))
			},
			setSidebarActiveTab: (tab) => {
				setAppState((appState) => ({
					...appState,
					sidebarActiveTab: tab,
				}))
			},
			getUser(db, id) {
				return db.users.find((u) => u.id === id)
			},
			getWorkspace(db, id) {
				return db.workspaces.find((w) => w.id === id)
			},
			getWorkspaceUsers(db, workspaceId) {
				return db.workspaceMemberships
					.filter((m) => m.workspaceId === workspaceId)
					.map((m) => db.users.find((u) => u.id === m.userId))
					.filter(Boolean) as TldrawAppUser[]
			},
			getWorkspaceGroups(db, workspaceId) {
				return db.groupMemberships
					.filter((m) => m.workspaceId === workspaceId)
					.map((m) => db.groups.find((g) => g.id === m.groupId))
					.filter(Boolean) as TldrawAppGroup[]
			},
			getUserFiles(db, userId, workspaceId) {
				return db.files.filter((f) => f.workspaceId === workspaceId && f.owner === userId)
			},
			getUserRecentFiles(db, userId, workspaceId) {
				return db.visits
					.filter((f) => f.userId === userId)
					.sort((a, b) => b.createdAt - a.createdAt)
					.map((s) => db.files.find((f) => f.id === s.fileId && f.workspaceId === workspaceId))
					.filter(Boolean) as TldrawAppFile[]
			},
			getUserStarredFiles(db, userId, workspaceId) {
				return db.stars
					.filter((f) => f.workspaceId === workspaceId && f.userId === userId)
					.map((s) => db.files.find((f) => f.id === s.fileId))
					.filter(Boolean) as TldrawAppFile[]
			},
			getUserSharedFiles(db, userId, workspaceId) {
				return db.visits
					.filter((f) => f.userId === userId)
					.map((s) => db.files.find((f) => f.id === s.fileId && f.workspaceId === workspaceId))
					.filter(Boolean)
					.filter((f) => f!.owner !== userId) as TldrawAppFile[]
			},
			getUserGroups(db, userId, workspaceId) {
				return db.groupMemberships
					.filter((g) => g.userId === userId && g.workspaceId === workspaceId)
					.map((g) => db.groups.find((group) => group.id === g.groupId))
					.filter(Boolean) as TldrawAppGroup[]
			},
			getGroupFiles(db, groupId, workspaceId) {
				return db.files.filter((f) => f.workspaceId === workspaceId && f.owner === groupId)
			},
			getFile(db, id) {
				return db.files.find((f) => f.id === id)
			},
			getGroup(db, id) {
				return db.groups.find((g) => g.id === id)
			},
			logVisit(db, userId, workspaceId, fileId) {
				setAppState((appState) => ({
					...appState,
					db: {
						...db,
						visits: [
							...db.visits,
							{
								id: createTlaId('visit'),
								createdAt: Date.now(),
								createdBy: userId,
								updatedAt: Date.now(),
								updatedBy: userId,
								workspaceId,
								userId,
								fileId,
							},
						],
					},
				}))
			},
		}),
		[]
	)

	return (
		<appStateContext.Provider value={appState}>
			<apiContext.Provider value={api}>{children}</apiContext.Provider>
		</appStateContext.Provider>
	)
}

export function useAppState() {
	return useContext(appStateContext)
}

export function useAppApi() {
	return useContext(apiContext)
}
