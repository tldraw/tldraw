import {
	CreateSnapshotRequestBody,
	CreateSnapshotResponseBody,
	TldrawAppFile,
	TldrawAppFileId,
	TldrawAppFileRecordType,
	TldrawAppFileStateRecordType,
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
	objectMapFromEntries,
	objectMapKeys,
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

	lastRecentFileOrdering = null as null | Array<{ fileId: TldrawAppFileId; date: number }>

	getUserRecentFiles() {
		const userId = this.getCurrentUserId()

		const myFiles = objectMapFromEntries(
			this.getAll('file')
				.filter((f) => f.ownerId === userId)
				.map((f) => [f.id, f])
		)
		const myStates = objectMapFromEntries(
			this.getAll('file-state')
				.filter((f) => f.ownerId === userId)
				.map((f) => [f.fileId, f])
		)

		const myFileIds = new Set<TldrawAppFileId>([
			...objectMapKeys(myFiles),
			...objectMapKeys(myStates),
		])

		const nextRecentFileOrdering = []

		for (const fileId of myFileIds) {
			const existing = this.lastRecentFileOrdering?.find((f) => f.fileId === fileId)
			if (existing) {
				nextRecentFileOrdering.push(existing)
				continue
			}
			const file = myFiles[fileId]
			const state = myStates[fileId]

			nextRecentFileOrdering.push({
				fileId,
				date: state?.lastEditAt ?? state?.firstVisitAt ?? file?.createdAt ?? 0,
			})
		}

		nextRecentFileOrdering.sort((a, b) => b.date - a.date)
		this.lastRecentFileOrdering = nextRecentFileOrdering
		return nextRecentFileOrdering
	}

	getUserSharedFiles() {
		const userId = this.getCurrentUserId()
		return Array.from(
			new Set(
				this.getAll('file-state')
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
		if (!file) return undefined
		return file.name.trim() || new Date(file.createdAt).toLocaleString('en-gb')
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

	setFilePublished(fileId: TldrawAppFileId, value: boolean) {
		const file = this.get(fileId) as TldrawAppFile
		if (!file) throw Error(`No file with that id`)
		if (!this.isFileOwner(fileId)) throw Error('user cannot edit that file')

		if (value === file.published) return

		this.store.put([{ ...file, published: value }])
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

	async deleteOrForgetFile(fileId: TldrawAppFileId) {
		if (this.isFileOwner(fileId)) {
			this.store.remove([
				fileId,
				...this.getAll('file-state')
					.filter((r) => r.fileId === fileId)
					.map((r) => r.id),
			])
		} else {
			const ownerId = this.getCurrentUserId()
			const fileStates = this.getAll('file-state')
				.filter((r) => r.fileId === fileId && r.ownerId === ownerId)
				.map((r) => r.id)
			this.store.remove(fileStates)
		}
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
		const fileState = this.getOrCreateFileState(fileId)
		if (fileState.firstVisitAt) return
		this.store.put([{ ...fileState, firstVisitAt: Date.now() }])
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

	getOrCreateFileState(fileId: TldrawAppFileId) {
		const ownerId = this.getCurrentUserId()
		let fileState = this.getAll('file-state').find(
			(r) => r.ownerId === ownerId && r.fileId === fileId
		)
		if (!fileState) {
			fileState = TldrawAppFileStateRecordType.create({
				fileId,
				ownerId,
			})
			this.store.put([fileState])
		}
		return fileState
	}

	onFileEdit(fileId: TldrawAppFileId) {
		// Find the store's most recent file state record for this user
		const fileState = this.getOrCreateFileState(fileId)

		// Create the file edit record
		this.store.put([{ ...fileState, lastEditAt: Date.now() }])
	}

	onFileExit(fileId: TldrawAppFileId) {
		// noop?
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
}
