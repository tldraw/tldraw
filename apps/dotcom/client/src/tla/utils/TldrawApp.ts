import {
	TldrawAppFile,
	TldrawAppFileEdit,
	TldrawAppFileEditRecordType,
	TldrawAppFileId,
	TldrawAppFileRecordType,
	TldrawAppFileVisitRecordType,
	TldrawAppRecord,
	TldrawAppUser,
	TldrawAppUserId,
	TldrawAppUserRecordType,
} from '@tldraw/dotcom-shared'
import { Store, TLStoreSnapshot, assertExists } from 'tldraw'
import { globalEditor } from '../../utils/globalEditor'
import { getLocalSessionState } from './local-session-state'

export class TldrawApp {
	private constructor(store: Store<TldrawAppRecord>) {
		this.store = store

		// todo: replace this when we have application-level user preferences
		this.store.sideEffects.registerAfterChangeHandler('session', (prev, next) => {
			if (prev.theme !== next.theme) {
				const editor = globalEditor.get()
				if (!editor) return
				const editorIsDark = editor.user.getIsDarkMode()
				const appIsDark = next.theme === 'dark'
				if (appIsDark && !editorIsDark) {
					editor.user.updateUserPreferences({ colorScheme: 'dark' })
				} else if (!appIsDark && editorIsDark) {
					editor.user.updateUserPreferences({ colorScheme: 'light' })
				}
			}
		})
	}

	store: Store<TldrawAppRecord>

	dispose() {
		this.store.dispose()
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

	getUserOwnFiles() {
		const userId = this.getCurrentUserId()
		return Array.from(new Set(this.getAll('file').filter((f) => f.ownerId === userId)))
	}

	getUserFileEdits(userId: TldrawAppUserId) {
		return this.store.allRecords().filter((r) => {
			if (r.typeName !== 'file-edit') return
			if (r.ownerId !== userId) return
			return true
		}) as TldrawAppFileEdit[]
	}

	getCurrentUserId() {
		return assertExists(getLocalSessionState().auth).userId
	}

	getCurrentUser() {
		return assertExists(this.getUser(this.getCurrentUserId()), 'no current user')
	}

	getUserRecentFiles(sessionStart: number) {
		const userId = this.getCurrentUserId()
		// For now, just the user's files; but generally we also want
		// to get all files the user has access to, including shared files.
		const fileRecords = this.getUserOwnFiles()

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

	getUserSharedFiles() {
		const userId = this.getCurrentUserId()
		return Array.from(
			new Set(
				this.getAll('file-visit')
					.filter((r) => r.ownerId === userId)
					.map((s) => {
						const file = this.get<TldrawAppFile>(s.fileId)
						if (!file) return
						// skip files where the owner is the current user
						if (file.ownerId === userId) return
						return file
					})
					.filter(Boolean) as TldrawAppFile[]
			)
		)
	}

	createFile(userId: TldrawAppUserId | 'temporary', fileId?: TldrawAppFileId) {
		const file = TldrawAppFileRecordType.create({
			ownerId: this.getCurrentUserId(),
			isEmpty: true,
			id: fileId ?? TldrawAppFileRecordType.createId(),
		})
		this.store.put([file])
		return file
	}

	getFileName(fileId: TldrawAppFileId) {
		const file = this.store.get(fileId)
		if (!file) return null
		return TldrawApp.getFileName(file)
	}

	claimTemporaryFile(fileId: TldrawAppFileId) {
		// TODO(david): check that you can't claim someone else's file (the db insert should fail and trigger a resync)
		this.store.put([
			TldrawAppFileRecordType.create({
				id: fileId,
				ownerId: this.getCurrentUserId(),
			}),
		])
	}

	getFileCollaborators(fileId: TldrawAppFileId): TldrawAppUserId[] {
		const file = this.store.get(fileId)
		if (!file) throw Error('no auth')

		const users = this.getAll('user')

		return users.filter((user) => user.presence.fileIds.includes(fileId)).map((user) => user.id)
	}

	toggleFileShared(fileId: TldrawAppFileId) {
		const userId = this.getCurrentUserId()

		const file = this.get(fileId) as TldrawAppFile
		if (!file) throw Error(`No file with that id`)

		if (userId !== file.ownerId) {
			throw Error('user cannot edit that file')
		}

		this.store.put([{ ...file, shared: !file.shared }])
	}

	setFileSharedLinkType(
		fileId: TldrawAppFileId,
		sharedLinkType: TldrawAppFile['sharedLinkType'] | 'no-access'
	) {
		const userId = this.getCurrentUserId()

		const file = this.get(fileId) as TldrawAppFile
		if (!file) throw Error(`No file with that id`)

		if (userId !== file.ownerId) {
			throw Error('user cannot edit that file')
		}

		if (sharedLinkType === 'no-access') {
			this.store.put([{ ...file, shared: false }])
			return
		}

		this.store.put([{ ...file, sharedLinkType, shared: true }])
	}

	duplicateFile(fileId: TldrawAppFileId) {
		const userId = this.getCurrentUserId()

		const file = this.get(fileId) as TldrawAppFile
		if (!file) throw Error(`No file with that id`)

		const newFile = TldrawAppFileRecordType.create({
			...file,
			id: TldrawAppFileRecordType.createId(),
			ownerId: userId,
			// todo: maybe iterate the file name
			createdAt: Date.now(),
		})

		this.store.put([newFile])

		return newFile
	}

	async deleteFile(_fileId: TldrawAppFileId) {
		// todo: delete the file from the server
		console.warn('tldraw file deletes are not implemented yet, but you are in the right place')
		return new Promise((r) => setTimeout(r, 2000))
	}

	async createFilesFromTldrFiles(_snapshots: TLStoreSnapshot[]) {
		// todo: upload the files to the server and create files locally
		console.warn('tldraw file uploads are not implemented yet, but you are in the right place')
		return new Promise((r) => setTimeout(r, 2000))
	}

	async createSnapshotLink(_userId: TldrawAppUserId, _fileId: TldrawAppFileId) {
		// todo: create a snapshot link on the server and return the url
		console.warn('snapshot links are not implemented yet, but you are in the right place')
		return new Promise((r) => setTimeout(r, 2000))
	}

	onFileEnter(fileId: TldrawAppFileId) {
		const userId = this.getCurrentUserId()
		const user = this.store.get(userId) as TldrawAppUser
		this.store.put([
			TldrawAppFileVisitRecordType.create({
				ownerId: userId,
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

	updateUserExportPreferences(
		exportPreferences: Partial<
			Pick<TldrawAppUser, 'exportFormat' | 'exportPadding' | 'exportBackground' | 'exportTheme'>
		>
	) {
		const userId = this.getCurrentUserId()
		const user = this.store.get(userId)
		if (!user) throw Error('no user')
		this.store.put([{ ...user, ...exportPreferences }])
	}

	onFileEdit(fileId: TldrawAppFileId, sessionStartedAt: number, fileOpenedAt: number) {
		const userId = this.getCurrentUserId()
		// Find the store's most recent file edit record for this user
		const fileEdit = this.store
			.allRecords()
			.filter((r) => r.typeName === 'file-edit' && r.fileId === fileId && r.ownerId === userId)
			.sort((a, b) => b.createdAt - a.createdAt)[0] as TldrawAppFileEdit | undefined

		// If the most recent file edit is part of this session or a later session, ignore it
		if (fileEdit && fileEdit.createdAt >= fileOpenedAt) {
			return
		}

		// Create the file edit record
		this.store.put([
			TldrawAppFileEditRecordType.create({
				ownerId: userId,
				fileId,
				sessionStartedAt,
				fileOpenedAt,
			}),
		])
	}

	onFileExit(fileId: TldrawAppFileId) {
		const user = this.getCurrentUser()

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

		if (!store.get(userId)) {
			store.put([
				TldrawAppUserRecordType.create({
					id: userId,
					ownerId: userId,
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

	static getFileName(file: TldrawAppFile) {
		return file.name.trim() || new Date(file.createdAt).toLocaleString('en-gb')
	}
}
