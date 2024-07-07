import { ReactNode, createContext, useContext, useState } from 'react'
import {
	TldrawAppDb,
	TldrawAppFile,
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
	signIn: (user: TldrawAppUser) => Promise<{ success: true } | { success: false; error: string }>
	signOut: () => Promise<{ success: true } | { success: false; error: string }>
	toggleSidebar: () => void
	getUser(id: TldrawAppUserId): TldrawAppUser | undefined
	getWorkspace(id: TldrawAppWorkspaceId): TldrawAppWorkspace | undefined
	getWorkspaceUsers(workspaceId: TldrawAppWorkspaceId): TldrawAppUser[]
	getWorkspaceGroups(workspaceId: TldrawAppWorkspaceId): TldrawAppGroup[]
	getUserFiles(userId: TldrawAppUserId, workspaceId: TldrawAppWorkspaceId): TldrawAppFile[]
	getUserGroups(userId: TldrawAppUserId, workspaceId: TldrawAppWorkspaceId): TldrawAppGroup[]
	getGroupFiles(groupId: TldrawAppGroupId, workspaceId: TldrawAppWorkspaceId): TldrawAppFile[]
}

const appStateContext = createContext<TldrawAppState>({} as TldrawAppState)

export function AppStateProvider({ children }: { children: ReactNode }) {
	const [appState, setAppState] = useState<TldrawAppState>({
		db: defaultDb,
		// auth
		session: {
			userId: createTlaId('user', 0), // null,
			workspaceId: createTlaId('workspace', 0),
		},
		signIn: async (user: TldrawAppUser, forceError = false) => {
			await new Promise((resolve) => setTimeout(resolve, 1000))
			if (forceError) {
				return { error: 'An error occurred', success: false }
			}
			setAppState((appState: TldrawAppState) => ({
				...appState,
				session: {
					userId: createTlaId('user', 0), // null,
					workspaceId: createTlaId('workspace', 0),
				},
			}))

			return { success: true }
		},
		signOut: async () => {
			setAppState((appState: TldrawAppState) => ({
				...appState,
				session: null,
			}))

			return { success: true }
		},
		// sidebar
		isSidebarOpen: true,
		toggleSidebar: () => {
			setAppState((appState: TldrawAppState) => ({
				...appState,
				isSidebarOpen: !appState.isSidebarOpen,
			}))
		},
		getUser(id: TldrawAppUserId) {
			return defaultDb.users.find((u) => u.id === id)
		},
		getWorkspace(id: TldrawAppWorkspaceId) {
			return defaultDb.workspaces.find((w) => w.id === id)
		},
		getWorkspaceUsers(workspaceId: TldrawAppWorkspaceId) {
			return defaultDb.workspaceMemberships
				.filter((m) => m.workspaceId === workspaceId)
				.map((m) => defaultDb.users.find((u) => u.id === m.userId))
				.filter(Boolean) as TldrawAppUser[]
		},
		getWorkspaceGroups(workspaceId: TldrawAppWorkspaceId) {
			return defaultDb.groupMemberships
				.filter((m) => m.workspaceId === workspaceId)
				.map((m) => defaultDb.groups.find((g) => g.id === m.groupId))
				.filter(Boolean) as TldrawAppGroup[]
		},
		getUserFiles(userId: TldrawAppUserId, workspaceId: TldrawAppWorkspaceId) {
			return defaultDb.files.filter((f) => f.workspaceId === workspaceId && f.owner === userId)
		},
		getUserGroups(userId: TldrawAppUserId, workspaceId: TldrawAppWorkspaceId) {
			return defaultDb.groupMemberships
				.filter((g) => g.userId === userId && g.workspaceId === workspaceId)
				.map((g) => defaultDb.groups.find((group) => group.id === g.groupId))
				.filter(Boolean) as TldrawAppGroup[]
		},
		getGroupFiles(groupId: TldrawAppGroupId, workspaceId: TldrawAppWorkspaceId) {
			return defaultDb.files.filter((f) => f.workspaceId === workspaceId && f.owner === groupId)
		},
	})

	return <appStateContext.Provider value={appState}>{children}</appStateContext.Provider>
}

export function useAppState() {
	return useContext(appStateContext)
}
