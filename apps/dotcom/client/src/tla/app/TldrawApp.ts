import {
	CreateSnapshotRequestBody,
	CreateSnapshotResponseBody,
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
	UserPreferencesKeys,
} from '@tldraw/dotcom-shared'
import { Result, fetch } from '@tldraw/utils'
import pick from 'lodash.pick'
import {
	Editor,
	Store,
	TLStoreSnapshot,
	TLUserPreferences,
	assertExists,
	computed,
	createTLUser,
	getUserPreferences,
} from 'tldraw'
import { globalEditor } from '../../utils/globalEditor'
import { getSnapshotData } from '../../utils/sharing'
import { getCurrentEditor } from '../utils/getCurrentEditor'
import { getLocalSessionStateUnsafe } from '../utils/local-session-state'

export const PUBLISH_ENDPOINT = `/api/app/publish`

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

	tlUser = createTLUser({
		userPreferences: computed('user prefs', () => {
			const userId = this.getCurrentUserId()
			if (!userId) throw Error('no user')
			const user = this.getUser(userId)
			return pick(user, UserPreferencesKeys) as TLUserPreferences
		}),
		setUserPreferences: (prefs: Partial<TLUserPreferences>) => {
			const user = this.getCurrentUser()
			if (!user) throw Error('no user')

			this.store.put([
				{
					...user,
					...(prefs as TldrawAppUser),
				},
			])
		},
	})

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
		const user = this.getCurrentUser()
		if (!user) throw Error('no user')
		return Array.from(new Set(this.getAll('file').filter((f) => f.ownerId === user.id)))
	}

	getUserFileEdits() {
		const user = this.getCurrentUser()
		if (!user) throw Error('no user')
		return this.store.allRecords().filter((r) => {
			if (r.typeName !== 'file-edit') return
			if (r.ownerId !== user.id) return
			return true
		}) as TldrawAppFileEdit[]
	}

	getCurrentUserId() {
		return assertExists(getLocalSessionStateUnsafe().auth).userId
	}

	getCurrentUser() {
		const user = this.getUser(this.getCurrentUserId())
		if (!user?.id) {
			throw Error('no user')
		}
		return assertExists(user, 'no current user')
	}

	getUserRecentFiles(sessionStart: number) {
		const userId = this.getCurrentUserId()

		// Now look at which files the user has edited
		const fileEditRecords = this.getUserFileEdits()

		// Include any files that the user has edited
		const fileRecords = fileEditRecords
			.map((r) => this.get(r.fileId))
			.filter(Boolean) as TldrawAppFile[]

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
					isOwnFile: file.ownerId === userId,
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

	createFile(fileId?: TldrawAppFileId) {
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
		const file = this.get(fileId) as TldrawAppFile
		if (!file) throw Error(`No file with that id`)

		if (!this.isFileOwner(fileId)) throw Error('user cannot edit that file')

		this.store.put([{ ...file, shared: !file.shared }])
	}

	toggleFilePublished(fileId: TldrawAppFileId) {
		const file = this.get(fileId) as TldrawAppFile
		if (!file) throw Error(`No file with that id`)
		if (!this.isFileOwner(fileId)) throw Error('user cannot edit that file')

		this.store.put([{ ...file, published: !file.published }])
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

		const editorStoreSnapshot = getCurrentEditor()?.store.getStoreSnapshot()
		this.store.put([newFile])

		return { newFile, editorStoreSnapshot }
	}

	isFileOwner(fileId: TldrawAppFileId) {
		const file = this.get(fileId) as TldrawAppFile
		if (!file) return false
		return file.ownerId === this.getCurrentUserId()
	}

	async deleteFile(_fileId: TldrawAppFileId) {
		// TODO we still need to remove the file completely - you can still visit this file if you have the link.
		this.store.remove([_fileId])
	}

	async createFilesFromTldrFiles(_snapshots: TLStoreSnapshot[]) {
		// todo: upload the files to the server and create files locally
		console.warn('tldraw file uploads are not implemented yet, but you are in the right place')
		return new Promise((r) => setTimeout(r, 2000))
	}

	async createSnapshotLink(editor: Editor, parentSlug: string, fileSlug: string, token: string) {
		const data = await getSnapshotData(editor)

		if (!data) return Result.err('could not get snapshot data')

		const endpoint = `${PUBLISH_ENDPOINT}/${fileSlug}`

		const res = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				snapshot: data,
				schema: editor.store.schema.serialize(),
				parent_slug: parentSlug,
			} satisfies CreateSnapshotRequestBody),
		})
		const response = (await res.json()) as CreateSnapshotResponseBody

		if (!res.ok || response.error) {
			console.error(await res.text())
			return Result.err('could not create snapshot')
		}
		return Result.ok('success')
	}

	onFileEnter(fileId: TldrawAppFileId) {
		const user = this.getCurrentUser()
		if (!user) throw Error('no user')
		this.store.put([
			TldrawAppFileVisitRecordType.create({
				ownerId: user.id,
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
		const user = this.getCurrentUser()
		if (!user) throw Error('no user')
		this.store.put([{ ...user, ...exportPreferences }])
	}

	onFileEdit(fileId: TldrawAppFileId, sessionStartedAt: number, fileOpenedAt: number) {
		const user = this.getCurrentUser()
		if (!user) throw Error('no user')
		// Find the store's most recent file edit record for this user
		const fileEdit = this.store
			.allRecords()
			.filter((r) => r.typeName === 'file-edit' && r.fileId === fileId && r.ownerId === user.id)
			.sort((a, b) => b.createdAt - a.createdAt)[0] as TldrawAppFileEdit | undefined

		// If the most recent file edit is part of this session or a later session, ignore it
		if (fileEdit && fileEdit.createdAt >= fileOpenedAt) {
			return
		}

		// Create the file edit record
		this.store.put([
			TldrawAppFileEditRecordType.create({
				ownerId: user.id,
				fileId,
				sessionStartedAt,
				fileOpenedAt,
			}),
		])
	}

	onFileExit(fileId: TldrawAppFileId) {
		const user = this.getCurrentUser()
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

	static async create(opts: {
		userId: string
		fullName: string
		email: string
		avatar: string
		store: Store<TldrawAppRecord>
	}) {
		const { store } = opts

		// This is an issue: we may have a user record but not in the store.
		// Could be just old accounts since before the server had a version
		// of the store... but we should probably identify that better.
		const userId = TldrawAppUserRecordType.createId(opts.userId)

		const user = store.get(userId)
		if (!user) {
			const { id: _id, name: _name, color: _color, ...restOfPreferences } = getUserPreferences()
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
					...restOfPreferences,
				}),
			])
		}

		const app = new TldrawApp(store)
		return { app, userId }
	}

	static getFileName(file: TldrawAppFile) {
		return file.name.trim() || new Date(file.createdAt).toLocaleString('en-gb')
	}
}
