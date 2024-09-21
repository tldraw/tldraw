import { deleteDB } from 'idb'
import { computed, Editor, Store } from 'tldraw'
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

		this.store.sideEffects.registerAfterChangeHandler('session', (prev, next) => {
			if (prev.theme !== next.theme) {
				const editor = this.getCurrentEditor()
				if (editor) {
					const editorIsDark = editor.user.getIsDarkMode()
					const appIsDark = next.theme === 'dark'
					if (appIsDark && !editorIsDark) {
						editor.user.updateUserPreferences({ colorScheme: 'dark' })
					} else if (!appIsDark && editorIsDark) {
						editor.user.updateUserPreferences({ colorScheme: 'light' })
					}
				}
			}
		})
	}

	store: Store<TldrawAppRecord>
	client: LocalSyncClient<TldrawAppRecord>

	dispose() {
		this.client.close()
	}

	private _currentEditor: Editor | null = null

	getCurrentEditor() {
		return this._currentEditor
	}

	setCurrentEditor(editor: Editor | null) {
		this._currentEditor = editor
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

	setSidebarActiveTab(tab: TldrawAppSessionState['sidebarActiveTab']) {
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

	getUser(userId: TldrawAppUserId): TldrawAppUser | undefined {
		return this.get(userId)
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

	getUserOwnFiles(userId: TldrawAppUserId, workspaceId: TldrawAppWorkspaceId) {
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

	createFile(ownerId: TldrawAppUserId | TldrawAppGroupId, workspaceId: TldrawAppWorkspaceId) {
		const file = TldrawAppFileRecordType.create({
			workspaceId,
			owner: ownerId,
		})
		this.store.put([file])
		return file
	}

	getFileCollaborators(
		workspaceId: TldrawAppWorkspaceId,
		fileId: TldrawAppFileId
	): TldrawAppUserId[] {
		const { auth } = this.getSessionState()
		if (!auth) throw Error('no auth')

		const workspace = this.store.get(workspaceId)
		if (!workspace) throw Error('no auth')

		const file = this.store.get(fileId)
		if (!file) throw Error('no auth')

		const users = this.getWorkspaceUsers(workspaceId)

		return users.filter((user) => user.presence.fileIds.includes(fileId)).map((user) => user.id)
	}

	onFileEnter(userId: TldrawAppUserId, workspaceId: TldrawAppWorkspaceId, fileId: TldrawAppFileId) {
		const user = this.store.get(userId)
		if (!user) throw Error('no user')

		this.store.put([
			TldrawAppFileVisitRecordType.create({
				workspaceId,
				userId,
				fileId,
			}),
			{
				...user,
				presence: {
					...user.presence,
					fileIds: [...user.presence.fileIds, fileId],
				},
			},
		])
	}

	onFileExit(userId: TldrawAppUserId, workspaceId: TldrawAppWorkspaceId, fileId: TldrawAppFileId) {
		const user = this.store.get(userId)
		if (!user) throw Error('no user')

		this.store.put([
			{
				...user,
				presence: {
					...user.presence,
					fileIds: user.presence.fileIds.filter((id) => id !== fileId),
				},
			},
		])
	}

	async resetDatabase() {
		await Promise.all(getAllIndexDbNames().map((db) => deleteDB(db)))
	}

	static async create(opts: {
		persistenceKey: string
		onLoad(app: TldrawApp): void
		onLoadError(err: unknown): void
	}) {
		const { persistenceKey, onLoad, onLoadError } = opts

		const day = 1000 * 60 * 60 * 24

		// tldraw workspace
		const workspace1 = TldrawAppWorkspaceRecordType.create({
			id: TldrawAppWorkspaceRecordType.createId('0'),
			name: 'tldraw',
			avatar: 'tldraw',
		})

		// Steve
		const user1 = TldrawAppUserRecordType.create({
			id: TldrawAppUserRecordType.createId('0'),
			name: 'Steve Ruiz',
			email: 'steve@tldraw.com',
			color: 'seagreen',
			presence: {
				workspaceId: workspace1.id,
				fileIds: [],
			},
		})

		// David
		const user2 = TldrawAppUserRecordType.create({
			id: TldrawAppUserRecordType.createId('1'),
			name: 'David Sheldrick',
			email: 'david@tldraw.com',
			color: 'salmon',
			presence: {
				workspaceId: workspace1.id,
				fileIds: [TldrawAppFileRecordType.createId('0'), TldrawAppFileRecordType.createId('1')],
			},
		})

		// Alex
		const user3 = TldrawAppUserRecordType.create({
			id: TldrawAppUserRecordType.createId('2'),
			name: 'Alex Dytrych',
			email: 'alex@tldraw.com',
			color: 'tomato',
			presence: {
				workspaceId: workspace1.id,
				fileIds: [TldrawAppFileRecordType.createId('1')],
			},
		})

		// Steve's membership to tldraw workspace
		const workspaceMembership1 = TldrawAppWorkspaceMembershipRecordType.create({
			id: TldrawAppWorkspaceMembershipRecordType.createId('0'),
			workspaceId: workspace1.id,
			userId: user1.id,
			createdAt: Date.now(),
		})

		// David's membership to tldraw workspace
		const workspaceMembership2 = TldrawAppWorkspaceMembershipRecordType.create({
			id: TldrawAppWorkspaceMembershipRecordType.createId('1'),
			workspaceId: workspace1.id,
			userId: user2.id,
			createdAt: Date.now(),
		})

		// Alex's membership to tldraw workspace
		const workspaceMembership3 = TldrawAppWorkspaceMembershipRecordType.create({
			id: TldrawAppWorkspaceMembershipRecordType.createId('2'),
			workspaceId: workspace1.id,
			userId: user3.id,
			createdAt: Date.now(),
		})

		// Group A
		const group1 = TldrawAppGroupRecordType.create({
			id: TldrawAppGroupRecordType.createId('0'),
			workspaceId: workspace1.id,
			name: 'Group A',
		})

		// Group B
		const group2 = TldrawAppGroupRecordType.create({
			id: TldrawAppGroupRecordType.createId('1'),
			workspaceId: workspace1.id,
			name: 'Group B',
		})

		// Steve's membership to Group A
		const groupMembership1 = TldrawAppGroupMembershipRecordType.create({
			id: TldrawAppGroupMembershipRecordType.createId('0'),
			workspaceId: workspace1.id,
			userId: user1.id,
			groupId: group1.id,
			createdAt: Date.now(),
		})

		// Steve's membership to Group B
		const groupMembership2 = TldrawAppGroupMembershipRecordType.create({
			id: TldrawAppGroupMembershipRecordType.createId('1'),
			workspaceId: workspace1.id,
			userId: user1.id,
			groupId: group2.id,
			createdAt: Date.now(),
		})

		// David's membership to Group A
		const groupMembership3 = TldrawAppGroupMembershipRecordType.create({
			id: TldrawAppGroupMembershipRecordType.createId('0'),
			workspaceId: workspace1.id,
			userId: user2.id,
			groupId: group1.id,
			createdAt: Date.now(),
		})

		const star = TldrawAppStarRecordType.create({
			id: TldrawAppStarRecordType.createId('0'),
			workspaceId: workspace1.id,
			userId: user1.id,
			fileId: TldrawAppFileRecordType.createId('0'),
			createdAt: Date.now(),
		})

		const files = [
			// Steve's files
			...[0.5, 0.6, 0.7, 1.2, 1.3, 1.4, 1.6, 2.5, 3.5].map((n, i) =>
				TldrawAppFileRecordType.create({
					id: TldrawAppFileRecordType.createId(i.toString()),
					workspaceId: workspace1.id,
					owner: user1.id,
					createdAt: Date.now() - day * n,
					name: i === 0 ? 'A very long name file here we go' : '',
				})
			),
			// David's files
			...[0.5, 0.6, 0.7, 1.2, 1.3, 1.4, 1.6, 2.5, 3.5].map((n, i) =>
				TldrawAppFileRecordType.create({
					id: TldrawAppFileRecordType.createId('david' + i.toString()),
					workspaceId: workspace1.id,
					owner: user2.id,
					createdAt: Date.now() - day * n,
				})
			),
			// Alex's files
			...[0.5, 0.6, 0.7, 1.2, 1.3, 1.4, 1.6, 2.5, 3.5].map((n, i) =>
				TldrawAppFileRecordType.create({
					id: TldrawAppFileRecordType.createId('alex' + i.toString()),
					workspaceId: workspace1.id,
					owner: user3.id,
					createdAt: Date.now() - day * n,
				})
			),
			// Group A's files
			TldrawAppFileRecordType.create({
				id: TldrawAppFileRecordType.createId('7'),
				workspaceId: workspace1.id,
				owner: group1.id,
				createdAt: Date.now() - day * 1,
			}),
			TldrawAppFileRecordType.create({
				id: TldrawAppFileRecordType.createId('8'),
				workspaceId: workspace1.id,
				owner: group1.id,
				createdAt: Date.now() - day * 2,
			}),
			TldrawAppFileRecordType.create({
				id: TldrawAppFileRecordType.createId('9'),
				workspaceId: workspace1.id,
				owner: group1.id,
				createdAt: Date.now() - day * 3,
			}),
			// Group B's files
			TldrawAppFileRecordType.create({
				id: TldrawAppFileRecordType.createId('10'),
				workspaceId: workspace1.id,
				owner: group2.id,
				createdAt: Date.now() - day * 3,
			}),
			TldrawAppFileRecordType.create({
				id: TldrawAppFileRecordType.createId('11'),
				workspaceId: workspace1.id,
				owner: group2.id,
				createdAt: Date.now() - day * 3,
			}),
		]

		// steve's visit to his own file
		const visit1 = TldrawAppFileVisitRecordType.create({
			id: TldrawAppFileVisitRecordType.createId('0'),
			workspaceId: workspace1.id,
			userId: user1.id,
			fileId: TldrawAppFileRecordType.createId('0'),
			createdAt: Date.now() - day * 1,
		})

		// steve's visit to david's file
		const visit2 = TldrawAppFileVisitRecordType.create({
			id: TldrawAppFileVisitRecordType.createId('1'),
			workspaceId: workspace1.id,
			userId: user1.id,
			fileId: TldrawAppFileRecordType.createId('david0'),
			createdAt: Date.now() - day * 1.2,
		})

		const session1 = TldrawAppSessionStateRecordType.create({
			id: TldrawApp.SessionStateId,
			auth: {
				userId: user1.id,
				workspaceId: workspace1.id,
			},
		})

		const store = new Store<TldrawAppRecord>({
			id: persistenceKey,
			schema: tldrawAppSchema,
			initialData: Object.fromEntries(
				[
					user1,
					user2,
					user3,
					workspace1,
					workspaceMembership1,
					workspaceMembership2,
					workspaceMembership3,
					group1,
					group2,
					star,
					groupMembership1,
					groupMembership2,
					groupMembership3,
					...files,
					visit1,
					visit2,
					session1,
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

	static getFileName(file: TldrawAppFile) {
		return file.name || new Date(file.createdAt).toLocaleString('en-gb')
	}
}
