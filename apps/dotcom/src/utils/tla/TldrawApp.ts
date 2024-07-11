import { deleteDB } from 'idb'
import { computed, Store } from 'tldraw'
import { getAllIndexDbNames, LocalSyncClient } from './local-sync'
import { TldrawAppFile, TldrawAppFileId, TldrawAppFileRecordType } from './schema/TldrawAppFile'
import { TldrawAppFileVisitRecordType } from './schema/TldrawAppFileVisit'
import { TldrawAppGroup, TldrawAppGroupId, TldrawAppGroupRecordType } from './schema/TldrawAppGroup'
import { TldrawAppGroupMembershipRecordType } from './schema/TldrawAppGroupMembership'
import {
	TldrawAppSessionState,
	TldrawAppSessionStateRecordType,
} from './schema/TldrawAppSessionState'
import { TldrawAppStarRecordType } from './schema/TldrawAppStar'
import { TldrawAppUser, TldrawAppUserId, TldrawAppUserRecordType } from './schema/TldrawAppUser'
import {
	TldrawAppWorkspace,
	TldrawAppWorkspaceId,
	TldrawAppWorkspaceRecordType,
} from './schema/TldrawAppWorkspace'
import { TldrawAppWorkspaceMembershipRecordType } from './schema/TldrawAppWorkspaceMembership'
import { TldrawAppRecord, tldrawAppSchema } from './tldrawAppSchema'

export class TldrawApp {
	private constructor(store: Store<TldrawAppRecord>, client: LocalSyncClient<TldrawAppRecord>) {
		this.store = store
		this.client = client
	}

	store: Store<TldrawAppRecord>
	client: LocalSyncClient<TldrawAppRecord>

	dispose = () => {
		this.client.close()
	}

	getSessionState() {
		return this.store.get(TldrawApp.SessionStateId)!
	}

	setSessionState(sessionState: TldrawAppSessionState) {
		return this.store.put([sessionState])
	}

	@computed getTheme() {
		return this.getSessionState().theme
	}

	getSortedFilteredFiles(viewName: string, files: TldrawAppFile[]) {
		// Get the current view from session state
		const sessionState = this.getSessionState()
		const { auth } = sessionState

		if (!auth) return files // can't sort

		const currentView = sessionState.views[viewName] ?? {
			sort: 'recent',
			view: 'grid',
			search: '',
		}

		let filteredFiles = files

		// If there's a search, filter the files
		if (currentView.search.length) {
			const query = currentView.search.toLowerCase()
			filteredFiles = files.filter((file) =>
				TldrawApp.getFileName(file).toLowerCase().includes(query)
			)
		}

		// Sort the filtered files
		switch (currentView.sort) {
			case 'atoz': {
				// a to z
				filteredFiles.sort((a, b) => {
					const nameA = TldrawApp.getFileName(a)
					const nameB = TldrawApp.getFileName(b)
					return nameA.localeCompare(nameB)
				})
				break
			}
			case 'ztoa': {
				// z to a
				filteredFiles.sort((a, b) => {
					const nameA = TldrawApp.getFileName(a)
					const nameB = TldrawApp.getFileName(b)
					return nameB.localeCompare(nameA)
				})
				break
			}
			case 'newest': {
				// newest created files first
				filteredFiles.sort((a, b) => b.createdAt - a.createdAt)
				break
			}
			case 'oldest': {
				// oldest created files first
				filteredFiles.sort((a, b) => a.createdAt - b.createdAt)
				break
			}
			case 'recent': {
				// never visited first, then recently visited first
				const visits = this.getAll('file-visit')
					.filter((v) => v.userId === auth.userId)
					.sort((a, b) => b.createdAt - a.createdAt)

				const now = Date.now()

				filteredFiles.sort((a, b) => {
					const visitA = visits.find((v) => v.fileId === a.id)?.createdAt ?? now
					const visitB = visits.find((v) => v.fileId === b.id)?.createdAt ?? now
					return visitA > visitB ? -1 : 1
				})
				break
			}
		}

		return filteredFiles
	}

	async signIn(_user: TldrawAppUser, forceError = false) {
		await new Promise((resolve) => setTimeout(resolve, 1000))
		if (forceError) {
			return { error: 'An error occurred', success: false }
		}
		const sessionState = this.getSessionState()

		this.store.put([
			{
				...sessionState,
				auth: {
					userId: TldrawAppUserRecordType.createId('0'), // null,
					workspaceId: TldrawAppWorkspaceRecordType.createId('0'),
				},
			},
		])

		return { success: true }
	}

	async signOut() {
		const sessionState = this.getSessionState()

		this.store.put([
			{
				...sessionState,
				auth: undefined,
			},
		])

		return { success: true }
	}

	toggleSidebar() {
		const sessionState = this.getSessionState()

		this.store.put([
			{
				...sessionState,
				isSidebarOpen: !sessionState.isSidebarOpen,
			},
		])
	}

	setSidebarActiveTab(tab: 'recent' | 'groups') {
		const sessionState = this.getSessionState()

		this.store.put([
			{
				...sessionState,
				sidebarActiveTab: tab,
			},
		])
	}

	// Simple

	getAll<T extends TldrawAppRecord['typeName']>(
		typeName: T
	): (TldrawAppRecord & { typeName: T })[] {
		return this.store.allRecords().filter((r) => r.typeName === typeName) as (TldrawAppRecord & {
			typeName: T
		})[]
	}

	get<T extends TldrawAppRecord>(id: T['id']): T | undefined {
		return this.store.get(id) as T | undefined
	}

	// Complex

	getWorkspaceUsers(workspaceId: TldrawAppWorkspaceId) {
		return Array.from(
			new Set(
				this.getAll('workspace-membership')
					.filter((r) => r.workspaceId === workspaceId)
					.map((r) => this.get(r.userId))
					.filter(Boolean) as TldrawAppUser[]
			)
		)
	}

	getWorkspaceGroups(workspaceId: TldrawAppWorkspaceId) {
		return Array.from(
			new Set(
				this.getAll('group')
					.filter((r) => r.workspaceId === workspaceId)
					.filter(Boolean) as TldrawAppGroup[]
			)
		)
	}

	getUserWorkspaces(userId: TldrawAppUserId) {
		return Array.from(
			new Set(
				this.getAll('workspace-membership')
					.filter((r) => r.userId === userId)
					.map((r) => this.get(r.workspaceId))
					.filter(Boolean) as TldrawAppWorkspace[]
			)
		)
	}

	getUserFiles(userId: TldrawAppUserId, workspaceId: TldrawAppWorkspaceId) {
		return Array.from(
			new Set(
				this.getAll('file').filter((f) => f.workspaceId === workspaceId && f.owner === userId)
			)
		)
	}

	getUserRecentFiles(userId: TldrawAppUserId, workspaceId: TldrawAppWorkspaceId) {
		return Array.from(
			new Set(
				this.getAll('file-visit')
					.filter((r) => r.userId === userId && r.workspaceId === workspaceId)
					.map((s) => {
						const file = this.get<TldrawAppFile>(s.fileId)
						if (!file) return
						return { visit: s, file: file }
					})
					.filter(Boolean) as { visit: TldrawAppRecord; file: TldrawAppFile }[]
			)
		)
	}

	getUserStarredFiles(userId: TldrawAppUserId, workspaceId: TldrawAppWorkspaceId) {
		return Array.from(
			new Set(
				this.getAll('star')
					.filter((f) => f.workspaceId === workspaceId && f.userId === userId)
					.map((s) => this.get(s.fileId))
					.filter(Boolean) as TldrawAppFile[]
			)
		)
	}

	getUserSharedFiles(userId: TldrawAppUserId, workspaceId: TldrawAppWorkspaceId) {
		return Array.from(
			new Set(
				this.getAll('file-visit')
					.filter((r) => r.userId === userId && r.workspaceId === workspaceId)
					.map((s) => {
						const file = this.get<TldrawAppFile>(s.fileId)
						if (!file) return
						// skip files where the owner is the current user
						if (file.owner === userId) return
						return file
					})
					.filter(Boolean) as TldrawAppFile[]
			)
		)
	}

	getUserGroups(userId: TldrawAppUserId, workspaceId: TldrawAppWorkspaceId) {
		return Array.from(
			new Set(
				this.getAll('group-membership')
					.filter((f) => f.workspaceId === workspaceId && f.userId === userId)
					.map((s) => this.get(s.groupId) as TldrawAppGroup)
			)
		)
	}

	getGroupFiles(groupId: TldrawAppGroupId, workspaceId: TldrawAppWorkspaceId) {
		return Array.from(
			new Set(
				this.getAll('file').filter((f) => f.workspaceId === workspaceId && f.owner === groupId)
			)
		)
	}

	createFile(owner: TldrawAppUserId | TldrawAppGroupId, workspaceId: TldrawAppWorkspaceId) {
		const file = TldrawAppFileRecordType.create({
			workspaceId,
			owner,
		})

		this.store.put([file])
		return file
	}

	logVisit(userId: TldrawAppUserId, workspaceId: TldrawAppWorkspaceId, fileId: TldrawAppFileId) {
		this.store.put([
			TldrawAppFileVisitRecordType.create({
				workspaceId,
				userId,
				fileId,
			}),
		])
	}

	static async create(opts: {
		persistenceKey: string
		onLoad: (app: TldrawApp) => void
		onLoadError: (err: unknown) => void
	}) {
		const { persistenceKey, onLoad, onLoadError } = opts

		const day = 1000 * 60 * 60 * 24

		const user = TldrawAppUserRecordType.create({
			id: TldrawAppUserRecordType.createId('0'),
			name: 'Steve Ruiz',
			email: 'steve@tldraw.com',
		})

		const workspace = TldrawAppWorkspaceRecordType.create({
			id: TldrawAppWorkspaceRecordType.createId('0'),
			name: 'tldraw',
			avatar: 'tldraw',
		})

		const workspaceMembership = TldrawAppWorkspaceMembershipRecordType.create({
			id: TldrawAppWorkspaceMembershipRecordType.createId('0'),
			workspaceId: workspace.id,
			userId: user.id,
			createdAt: Date.now(),
		})

		const group1 = TldrawAppGroupRecordType.create({
			id: TldrawAppGroupRecordType.createId('0'),
			workspaceId: workspace.id,
			name: 'Group 1',
		})

		const group2 = TldrawAppGroupRecordType.create({
			id: TldrawAppGroupRecordType.createId('1'),
			workspaceId: workspace.id,
			name: 'Group 2',
		})

		const groupMembership1 = TldrawAppGroupMembershipRecordType.create({
			id: TldrawAppGroupMembershipRecordType.createId('0'),
			workspaceId: workspace.id,
			userId: user.id,
			groupId: group1.id,
			createdAt: Date.now(),
		})

		const groupMembership2 = TldrawAppGroupMembershipRecordType.create({
			id: TldrawAppGroupMembershipRecordType.createId('1'),
			workspaceId: workspace.id,
			userId: user.id,
			groupId: group2.id,
			createdAt: Date.now(),
		})

		const star = TldrawAppStarRecordType.create({
			id: TldrawAppStarRecordType.createId('0'),
			workspaceId: workspace.id,
			userId: user.id,
			fileId: TldrawAppFileRecordType.createId('0'),
			createdAt: Date.now(),
		})

		const files = [
			TldrawAppFileRecordType.create({
				id: TldrawAppFileRecordType.createId('0'),
				workspaceId: workspace.id,
				owner: user.id,
				createdAt: Date.now() - day * 0.5,
			}),
			TldrawAppFileRecordType.create({
				id: TldrawAppFileRecordType.createId('1'),
				workspaceId: workspace.id,
				owner: user.id,
				createdAt: Date.now() - day * 0.6,
			}),
			TldrawAppFileRecordType.create({
				id: TldrawAppFileRecordType.createId('2'),
				workspaceId: workspace.id,
				owner: user.id,
				createdAt: Date.now() - day * 0.7,
			}),
			TldrawAppFileRecordType.create({
				id: TldrawAppFileRecordType.createId('3'),
				workspaceId: workspace.id,
				owner: user.id,
				createdAt: Date.now() - day * 1.2,
			}),
			TldrawAppFileRecordType.create({
				id: TldrawAppFileRecordType.createId('4'),
				workspaceId: workspace.id,
				owner: user.id,
				createdAt: Date.now() - day * 1.3,
			}),
			TldrawAppFileRecordType.create({
				id: TldrawAppFileRecordType.createId('5'),
				workspaceId: workspace.id,
				owner: user.id,
				createdAt: Date.now() - day * 1.4,
			}),
			TldrawAppFileRecordType.create({
				id: TldrawAppFileRecordType.createId('6'),
				workspaceId: workspace.id,
				owner: user.id,
				createdAt: Date.now() - day * 1.6,
			}),
			TldrawAppFileRecordType.create({
				id: TldrawAppFileRecordType.createId('7'),
				workspaceId: workspace.id,
				owner: user.id,
				createdAt: Date.now() - day * 2.5,
			}),
			TldrawAppFileRecordType.create({
				id: TldrawAppFileRecordType.createId('8'),
				workspaceId: workspace.id,
				owner: user.id,
				createdAt: Date.now() - day * 3.5,
			}),
			// group files
			TldrawAppFileRecordType.create({
				id: TldrawAppFileRecordType.createId('7'),
				workspaceId: workspace.id,
				owner: group1.id,
				createdAt: Date.now() - day * 1,
			}),
			TldrawAppFileRecordType.create({
				id: TldrawAppFileRecordType.createId('8'),
				workspaceId: workspace.id,
				owner: group1.id,
				createdAt: Date.now() - day * 2,
			}),
			TldrawAppFileRecordType.create({
				id: TldrawAppFileRecordType.createId('9'),
				workspaceId: workspace.id,
				owner: group1.id,
				createdAt: Date.now() - day * 3,
			}),
			TldrawAppFileRecordType.create({
				id: TldrawAppFileRecordType.createId('10'),
				workspaceId: workspace.id,
				owner: group2.id,
				createdAt: Date.now() - day * 3,
			}),
			TldrawAppFileRecordType.create({
				id: TldrawAppFileRecordType.createId('11'),
				workspaceId: workspace.id,
				owner: group2.id,
				createdAt: Date.now() - day * 3,
			}),
		]

		const session = TldrawAppSessionStateRecordType.create({
			id: TldrawApp.SessionStateId,
			auth: {
				userId: user.id,
				workspaceId: workspace.id,
			},
		})

		const store = new Store<TldrawAppRecord>({
			id: 'tla',
			schema: tldrawAppSchema,
			initialData: Object.fromEntries(
				[
					user,
					workspace,
					workspaceMembership,
					group1,
					group2,
					star,
					groupMembership1,
					groupMembership2,
					...files,
					session,
				].map((r) => [r.id, r])
			),
			props: {},
		})

		const client = await new Promise<LocalSyncClient<TldrawAppRecord>>((r) => {
			const client = new LocalSyncClient(store, {
				persistenceKey,
				onLoad: () => {
					r(client)
				},
				onLoadError: (e) => {
					Promise.all(getAllIndexDbNames().map((db) => deleteDB(db))).then(() => {
						window.location.reload()
					})
					onLoadError?.(e)
				},
			})
		})

		const app = new TldrawApp(store, client)

		onLoad(app)
		return app
	}

	static SessionStateId = TldrawAppSessionStateRecordType.createId('0')

	static getFileName = (file: TldrawAppFile) => {
		return file.name || new Date(file.createdAt).toLocaleString('en-gb')
	}
}

export function getCleanId(id: string) {
	return id.split(':')[1]
}
