import { deleteDB } from 'idb'
import { computed, Editor, Store } from 'tldraw'
import { getAllIndexDbNames, LocalSyncClient } from './local-sync'
import { TldrawAppFile, TldrawAppFileId, TldrawAppFileRecordType } from './schema/TldrawAppFile'
import { TldrawAppFileEdit, TldrawAppFileEditRecordType } from './schema/TldrawAppFileEdit'
import { TldrawAppFileVisitRecordType } from './schema/TldrawAppFileVisit'
import {
	TldrawAppSessionState,
	TldrawAppSessionStateRecordType,
} from './schema/TldrawAppSessionState'
import { TldrawAppUser, TldrawAppUserId, TldrawAppUserRecordType } from './schema/TldrawAppUser'
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

		this.setSessionState({
			...this.getSessionState(),
			createdAt: Date.now(),
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

	getSessionState(): TldrawAppSessionState {
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
				return this.getUserRecentFiles(auth.userId, sessionState.createdAt).map((f) => f.file)
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

	setShareMenuActiveTab(tab: TldrawAppSessionState['shareMenuActiveTab']) {
		const sessionState = this.getSessionState()

		this.store.put([
			{
				...sessionState,
				shareMenuActiveTab: tab,
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

	getUser(userId: TldrawAppUserId): TldrawAppUser | undefined {
		return this.get(userId)
	}

	getUserOwnFiles(userId: TldrawAppUserId) {
		return Array.from(new Set(this.getAll('file').filter((f) => f.owner === userId)))
	}

	getUserFileEdits(userId: TldrawAppUserId) {
		return this.store.allRecords().filter((r) => {
			if (r.typeName !== 'file-edit') return
			if (r.userId !== userId) return
			return true
		}) as TldrawAppFileEdit[]
	}

	getUserRecentFiles(userId: TldrawAppUserId, sessionStart: number) {
		// For now, just the user's files; but generally we also want
		// to get all files the user has access to, including shared files.
		const fileRecords = this.getUserOwnFiles(userId)

		// Now look at which files the user has edited
		const fileEditRecords = this.getUserFileEdits(userId)

		// A map of file IDs to the most recent date we have for them
		// the default date is the file's creation date; but we'll use the
		// file edits to get the most recent edit that occurred before the
		// current session started.
		const filesToDates = Object.fromEntries(
			fileRecords.map((file) => [
				file.id,
				{
					file,
					date: file.createdAt,
				},
			])
		)

		for (const fileEdit of fileEditRecords) {
			// Skip file edits that happened in the current or later sessions
			if (fileEdit.sessionStartedAt >= sessionStart) continue

			// Check the current time that we have for the file
			const item = filesToDates[fileEdit.fileId]
			if (!item) continue

			// If this edit has a more recent file open time, replace the item's date
			if (item.date < fileEdit.fileOpenedAt) {
				item.date = fileEdit.fileOpenedAt
			}
		}

		// Sort the file pairs by date
		return Object.values(filesToDates).sort((a, b) => b.date - a.date)
	}

	getUserSharedFiles(userId: TldrawAppUserId) {
		return Array.from(
			new Set(
				this.getAll('file-visit')
					.filter((r) => r.userId === userId)
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

	createFile(ownerId: TldrawAppUserId | 'temporary', fileId?: TldrawAppFileId) {
		const file = TldrawAppFileRecordType.create({
			owner: ownerId,
			isEmpty: true,
			id: fileId ?? TldrawAppFileRecordType.createId(),
		})
		this.store.put([file])
		return file
	}

	claimTemporaryFile(ownerId: TldrawAppUserId | 'temporary', fileId: TldrawAppFileId) {
		const file = this.store.get(fileId)

		if (!file) {
			// the file doesn't exist
			return
		}

		if (file.owner !== 'temporary') {
			// the file is already claimed
			return
		}

		this.store.put([
			{
				...file,
				owner: ownerId,
			},
		])
	}

	getFileCollaborators(fileId: TldrawAppFileId): TldrawAppUserId[] {
		const { auth } = this.getSessionState()
		if (!auth) throw Error('no auth')

		const file = this.store.get(fileId)
		if (!file) throw Error('no auth')

		const users = this.getAll('user')

		return users.filter((user) => user.presence.fileIds.includes(fileId)).map((user) => user.id)
	}

	toggleFileShared(userId: TldrawAppUserId, fileId: TldrawAppFileId) {
		const file = this.get(fileId) as TldrawAppFile
		if (!file) throw Error(`No file with that id`)

		if (userId !== file.owner) {
			throw Error('user cannot edit that file')
		}

		this.store.put([{ ...file, shared: !file.shared }])
	}

	toggleFileShareLinkType(userId: TldrawAppUserId, fileId: TldrawAppFileId) {
		const file = this.get(fileId) as TldrawAppFile
		if (!file) throw Error(`No file with that id`)

		if (userId !== file.owner) {
			throw Error('user cannot edit that file')
		}

		this.store.put([{ ...file, sharedLinkType: file.sharedLinkType === 'edit' ? 'view' : 'edit' }])
	}

	onFileEnter(userId: TldrawAppUserId, fileId: TldrawAppFileId) {
		const user = this.store.get(userId)
		if (!user) throw Error('no user')

		this.store.put([
			TldrawAppFileVisitRecordType.create({
				userId,
				fileId,
			}),
			{
				...user,
				presence: {
					...user.presence,
					fileIds: [...user.presence.fileIds.filter((id) => id !== fileId), fileId],
				},
			},
		])
	}

	setUserExportFormat(userId: TldrawAppUserId, exportFormat: TldrawAppUser['exportFormat']) {
		const user = this.store.get(userId)
		if (!user) throw Error('no user')

		this.store.put([
			{
				...user,
				exportFormat,
			},
		])
	}

	onFileEdit(
		userId: TldrawAppUserId,
		fileId: TldrawAppFileId,
		sessionStartedAt: number,
		fileOpenedAt: number
	) {
		// Find the store's most recent file edit record for this user
		const fileEdit = this.store
			.allRecords()
			.filter((r) => r.typeName === 'file-edit' && r.fileId === fileId && r.userId === userId)
			.sort((a, b) => b.createdAt - a.createdAt)[0] as TldrawAppFileEdit | undefined

		// If the most recent file edit is part of this session or a later session, ignore it
		if (fileEdit && fileEdit.createdAt >= fileOpenedAt) {
			return
		}

		// Create the file edit record
		this.store.put([
			TldrawAppFileEditRecordType.create({
				userId,
				fileId,
				sessionStartedAt,
				fileOpenedAt,
			}),
		])
	}

	onFileExit(userId: TldrawAppUserId, fileId: TldrawAppFileId) {
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

		// Steve
		const user1 = TldrawAppUserRecordType.create({
			id: TldrawAppUserRecordType.createId('0'),
			name: 'Steve Ruiz',
			email: 'steve@tldraw.com',
			color: 'seagreen',
			presence: {
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
				fileIds: [TldrawAppFileRecordType.createId('1')],
			},
		})

		const files = [
			// Steve's files
			...[0.5, 0.6, 0.7, 1.2, 1.3, 1.4, 1.6, 2.5, 3.5].map((n, i) =>
				TldrawAppFileRecordType.create({
					id: TldrawAppFileRecordType.createId(i.toString()),
					owner: user1.id,
					createdAt: Date.now() - day * n,
					name: i === 0 ? 'A very long name file here we go' : '',
				})
			),
			// David's files
			...[0.5, 0.6, 0.7, 1.2, 1.3, 1.4, 1.6, 2.5, 3.5].map((n, i) =>
				TldrawAppFileRecordType.create({
					id: TldrawAppFileRecordType.createId('david' + i.toString()),
					owner: user2.id,
					createdAt: Date.now() - day * n,
				})
			),
			// Alex's files
			...[0.5, 0.6, 0.7, 1.2, 1.3, 1.4, 1.6, 2.5, 3.5].map((n, i) =>
				TldrawAppFileRecordType.create({
					id: TldrawAppFileRecordType.createId('alex' + i.toString()),
					owner: user3.id,
					createdAt: Date.now() - day * n,
				})
			),
		]

		// steve's visit to his own file
		const visit1 = TldrawAppFileVisitRecordType.create({
			id: TldrawAppFileVisitRecordType.createId('0'),
			userId: user1.id,
			fileId: TldrawAppFileRecordType.createId('0'),
			createdAt: Date.now() - day * 1,
		})

		// steve's visit to david's file
		const visit2 = TldrawAppFileVisitRecordType.create({
			id: TldrawAppFileVisitRecordType.createId('1'),
			userId: user2.id,
			fileId: TldrawAppFileRecordType.createId('0'),
			createdAt: Date.now() - day * 1.2,
		})

		// steve's session
		const session1 = TldrawAppSessionStateRecordType.create({
			id: TldrawApp.SessionStateId,
			auth: {
				userId: user1.id,
			},
		})

		const store = new Store<TldrawAppRecord>({
			id: persistenceKey,
			schema: tldrawAppSchema,
			initialData: Object.fromEntries(
				[user1, user2, user3, ...files, visit1, visit2, session1].map((r) => [r.id, r])
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
