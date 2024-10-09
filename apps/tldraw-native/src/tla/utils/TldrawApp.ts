import {
	TldrawAppFile,
	TldrawAppFileEdit,
	TldrawAppFileEditRecordType,
	TldrawAppFileId,
	TldrawAppFileRecordType,
	TldrawAppFileVisitRecordType,
	TldrawAppRecord,
	TldrawAppSessionState,
	TldrawAppSessionStateRecordType,
	TldrawAppUser,
	TldrawAppUserId,
	TldrawAppUserRecordType,
} from '@tldraw/dotcom-shared'
import { Editor, Store, computed } from 'tldraw'

export class TldrawApp {
	private constructor(store: Store<TldrawAppRecord>) {
		this.store = store

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

	dispose() {
		this.store.dispose()
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

	toggleSidebar() {
		const sessionState = this.getSessionState()

		this.store.put([
			{
				...sessionState,
				isSidebarOpen: !sessionState.isSidebarOpen,
			},
		])
	}

	toggleSidebarMobile() {
		const sessionState = this.getSessionState()

		this.store.put([
			{
				...sessionState,
				isSidebarOpenMobile: !sessionState.isSidebarOpenMobile,
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

	getFileName(fileId: TldrawAppFileId) {
		const file = this.store.get(fileId)
		// TODO(david): handle 'shared with me' files that exist in other users's areas
		// gonna require a message queue or something.
		if (!file) return null
		return TldrawApp.getFileName(file)
	}

	claimTemporaryFile(fileId: TldrawAppFileId, owner: TldrawAppUserId) {
		// TODO(david): check that you can't claim someone else's file (the db insert should fail and trigger a resync)
		this.store.put([
			TldrawAppFileRecordType.create({
				id: fileId,
				owner,
			}),
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

	setFileSharedLinkType(
		userId: TldrawAppUserId,
		fileId: TldrawAppFileId,
		sharedLinkType: TldrawAppFile['sharedLinkType'] | 'no-access'
	) {
		const file = this.get(fileId) as TldrawAppFile
		if (!file) throw Error(`No file with that id`)

		if (userId !== file.owner) {
			throw Error('user cannot edit that file')
		}

		if (sharedLinkType === 'no-access') {
			this.store.put([{ ...file, shared: false }])
			return
		}
		this.store.put([{ ...file, sharedLinkType, shared: true }])
	}

	duplicateFile(userId: TldrawAppUserId, fileId: TldrawAppFileId) {
		const file = this.get(fileId) as TldrawAppFile
		if (!file) throw Error(`No file with that id`)

		const newFile = TldrawAppFileRecordType.create({
			...file,
			id: TldrawAppFileRecordType.createId(),
			owner: userId,
			// todo: maybe iterate the file name
			createdAt: Date.now(),
		})

		this.store.put([newFile])

		return newFile
	}

	createSnapshotLink(_userId: TldrawAppUserId, _fileId: TldrawAppFileId) {
		// noop
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

	setUserExportBackground(userId: TldrawAppUserId, exportBackground: boolean) {
		const user = this.store.get(userId)
		if (!user) throw Error('no user')
		this.store.put([{ ...user, exportBackground }])
	}

	setUserExportPadding(userId: TldrawAppUserId, exportPadding: boolean) {
		const user = this.store.get(userId)
		if (!user) throw Error('no user')
		this.store.put([{ ...user, exportPadding }])
	}

	setUserExportFormat(userId: TldrawAppUserId, exportFormat: TldrawAppUser['exportFormat']) {
		const user = this.store.get(userId)
		if (!user) throw Error('no user')
		this.store.put([{ ...user, exportFormat }])
	}

	setUserExportTheme(userId: TldrawAppUserId, exportTheme: TldrawAppUser['exportTheme']) {
		const user = this.store.get(userId)
		if (!user) throw Error('no user')
		this.store.put([{ ...user, exportTheme }])
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
		if (!user) return

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

	static async create(opts: {
		userId: string
		fullName: string
		email: string
		avatar: string
		store: Store<TldrawAppRecord>
	}) {
		const { store } = opts

		const userId = TldrawAppUserRecordType.createId(opts.userId)
		if (!store.get(TldrawApp.SessionStateId)) {
			store.put([
				TldrawAppSessionStateRecordType.create({
					id: TldrawApp.SessionStateId,
					auth: {
						userId,
					},
				}),
			])
		}

		if (!store.get(userId)) {
			store.put([
				TldrawAppUserRecordType.create({
					id: userId,
					name: opts.fullName,
					email: opts.email,
					color: 'salmon',
					avatar: opts.avatar,
					presence: {
						fileIds: [],
					},
				}),
			])
		}

		return { store: new TldrawApp(store), userId }
	}

	static SessionStateId = TldrawAppSessionStateRecordType.createId('session')

	static getFileName(file: TldrawAppFile) {
		return file.name.trim() || new Date(file.createdAt).toLocaleString('en-gb')
	}
}
