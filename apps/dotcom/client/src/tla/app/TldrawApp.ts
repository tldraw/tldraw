import {
	CreateFilesResponseBody,
	DuplicateRoomResponseBody,
	PublishFileResponseBody,
	TldrawAppFile,
	TldrawAppFileId,
	TldrawAppFileRecordType,
	TldrawAppFileState,
	TldrawAppFileStateRecordType,
	TldrawAppRecord,
	TldrawAppUser,
	TldrawAppUserId,
	TldrawAppUserRecordType,
	UnpublishFileResponseBody,
	UserPreferencesKeys,
} from '@tldraw/dotcom-shared'
import { Result, fetch } from '@tldraw/utils'
import pick from 'lodash.pick'
import {
	Store,
	TLSessionStateSnapshot,
	TLStoreSnapshot,
	TLUserPreferences,
	assertExists,
	computed,
	createTLUser,
	getUserPreferences,
	objectMapFromEntries,
	objectMapKeys,
	transact,
} from 'tldraw'
import { globalEditor } from '../../utils/globalEditor'
import { getLocalSessionStateUnsafe } from '../utils/local-session-state'

export const TLDR_FILE_ENDPOINT = `/api/app/tldr`
export const PUBLISH_ENDPOINT = `/api/app/publish`
export const UNPUBLISH_ENDPOINT = `/api/app/unpublish`
export const DUPLICATE_ENDPOINT = `/api/app/duplicate`
export const FILE_ENDPOINT = `/api/app/file`

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

	toggleFileShared(fileId: TldrawAppFileId) {
		const file = this.get(fileId) as TldrawAppFile
		if (!file) throw Error(`No file with that id`)

		if (!this.isFileOwner(fileId)) throw Error('user cannot edit that file')

		transact(() => {
			this.store.put([{ ...file, shared: !file.shared }])
			// if it was shared, remove all shared links
			if (file.shared) {
				const states = this.getAll('file-state').filter(
					(r) => r.fileId === fileId && r.ownerId !== file.ownerId
				)
				this.store.remove(states.map((r) => r.id))
			}
		})
	}

	/**
	 * Create files from tldr files.
	 *
	 * @param snapshots - The snapshots to create files from.
	 * @param token - The user's token.
	 *
	 * @returns The slugs of the created files.
	 */
	async createFilesFromTldrFiles(snapshots: TLStoreSnapshot[], token: string) {
		const res = await fetch(TLDR_FILE_ENDPOINT, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				// convert to the annoyingly similar format that the server expects
				snapshots: snapshots.map((s) => ({
					snapshot: s.store,
					schema: s.schema,
				})),
			}),
		})

		const response = (await res.json()) as CreateFilesResponseBody

		if (!res.ok || response.error) {
			throw Error('could not create files')
		}

		// Also create a file state record for the new file
		this.store.put(
			response.slugs.map((slug) =>
				TldrawAppFileStateRecordType.create({
					fileId: TldrawAppFileRecordType.createId(slug),
					ownerId: this.getCurrentUserId(),
					firstVisitAt: Date.now(),
					lastVisitAt: Date.now(),
					lastEditAt: Date.now(),
				})
			)
		)

		return { slugs: response.slugs }
	}

	/**
	 * Duplicate a file.
	 *
	 * @param fileSlug - The file slug to duplicate.
	 * @param token - The user's token.
	 *
	 * @returns A result indicating success or failure.
	 */
	async duplicateFile(fileSlug: string, token: string) {
		const endpoint = `${DUPLICATE_ENDPOINT}/${fileSlug}`

		const res = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		})

		const response = (await res.json()) as DuplicateRoomResponseBody

		if (!res.ok || response.error) {
			return Result.err('could not duplicate file')
		}

		// Also create a file state record for the new file

		this.store.put([
			TldrawAppFileStateRecordType.create({
				fileId: TldrawAppFileRecordType.createId(response.slug),
				ownerId: this.getCurrentUserId(),
				firstVisitAt: Date.now(),
				lastVisitAt: Date.now(),
				lastEditAt: Date.now(),
			}),
		])

		return Result.ok({ slug: response.slug })
	}

	/**
	 * Publish a file or re-publish changes.
	 *
	 * @param fileId - The file id to unpublish.
	 * @param token - The user's token.
	 * @returns A result indicating success or failure.
	 */
	async publishFile(fileId: TldrawAppFileId, token: string) {
		const file = this.get(fileId) as TldrawAppFile
		if (!file) throw Error(`No file with that id`)
		if (!this.isFileOwner(fileId)) throw Error('user cannot edit that file')

		// We're going to bake the name of the file, if it's undefined
		const name = this.getFileName(fileId)!

		// Optimistic update
		this.store.put([{ ...file, name, published: true, lastPublished: Date.now() }])

		const fileSlug = fileId.split(':')[1]

		const endpoint = `${PUBLISH_ENDPOINT}/${fileSlug}`

		const res = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		})

		const response = (await res.json()) as PublishFileResponseBody

		if (!res.ok || response.error) {
			// Revert optimistic update
			const latestFile = this.get(fileId) as TldrawAppFile
			const { published, lastPublished } = file
			this.store.put([{ ...latestFile, published, lastPublished }])

			return Result.err('could not create snapshot')
		}

		return Result.ok('success')
	}

	/**
	 * Unpublish a file.
	 *
	 * @param fileId - The file id to unpublish.
	 * @param token - The user's token.
	 * @returns A result indicating success or failure.
	 */
	async unpublishFile(fileId: TldrawAppFileId, token: string) {
		const file = this.get(fileId) as TldrawAppFile
		if (!file) throw Error(`No file with that id`)
		if (!this.isFileOwner(fileId)) throw Error('user cannot edit that file')

		if (!file.published) return Result.ok('success')

		// Optimistic update
		this.store.put([{ ...file, published: false }])

		const fileSlug = fileId.split(':')[1]

		const res = await fetch(`${PUBLISH_ENDPOINT}/${fileSlug}`, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		})

		const response = (await res.json()) as UnpublishFileResponseBody

		if (!res.ok || response.error) {
			// Revert optimistic update
			this.store.put([{ ...file, published: true }])
			return Result.err('could not unpublish')
		}

		return Result.ok('success')
	}

	/**
	 * Remove a user's file states for a file and delete the file if the user is the owner of the file.
	 *
	 * @param fileId - The file id.
	 * @param token - The user's token.
	 */
	async deleteOrForgetFile(fileId: TldrawAppFileId, token: string) {
		// Stash these so that we can restore them later
		let fileStates: TldrawAppFileState[]
		const file = this.get(fileId) as TldrawAppFile

		if (this.isFileOwner(fileId)) {
			// Optimistic update, remove file and file states
			const userId = this.getCurrentUserId()
			fileStates = this.getAll('file-state').filter(
				(r) => r.fileId === fileId && r.ownerId === userId
			)
			this.store.remove([fileId, ...fileStates.map((s) => s.id)])
		} else {
			// If not the owner, just remove the file state
			fileStates = this.getAll('file-state').filter((r) => r.fileId === fileId)
			this.store.remove(fileStates.map((s) => s.id))
		}

		const fileSlug = fileId.split(':')[1]

		const res = await fetch(`${FILE_ENDPOINT}/${fileSlug}`, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		})

		const response = (await res.json()) as UnpublishFileResponseBody

		if (!res.ok || response.error) {
			// Revert optimistic update
			this.store.put([file, ...fileStates])
			return Result.err('could not delete')
		}

		return Result.ok('success')
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

	isFileOwner(fileId: TldrawAppFileId) {
		const file = this.get(fileId) as TldrawAppFile
		if (!file) return false
		return file.ownerId === this.getCurrentUserId()
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
		let fileState = this.getFileState(fileId)
		const ownerId = this.getCurrentUserId()
		if (!fileState) {
			fileState = TldrawAppFileStateRecordType.create({
				fileId,
				ownerId,
			})
			this.store.put([fileState])
		}
		return fileState
	}

	getFileState(fileId: TldrawAppFileId) {
		const ownerId = this.getCurrentUserId()
		return this.getAll('file-state').find((r) => r.ownerId === ownerId && r.fileId === fileId)
	}

	onFileEnter(fileId: TldrawAppFileId) {
		const fileState = this.getOrCreateFileState(fileId)
		if (fileState.firstVisitAt) return
		this.store.put([
			{ ...fileState, firstVisitAt: fileState.firstVisitAt ?? Date.now(), lastVisitAt: Date.now() },
		])
	}

	onFileEdit(fileId: TldrawAppFileId) {
		// Find the store's most recent file state record for this user
		const fileState = this.getFileState(fileId)
		if (!fileState) return // file was deleted

		// Create the file edit record
		this.store.put([{ ...fileState, lastEditAt: Date.now() }])
	}

	onFileSessionStateUpdate(fileId: TldrawAppFileId, sessionState: TLSessionStateSnapshot) {
		const fileState = this.getFileState(fileId)
		if (!fileState) return // file was deleted
		this.store.put([{ ...fileState, lastSessionState: sessionState, lastVisitAt: Date.now() }])
	}

	onFileExit(fileId: TldrawAppFileId) {
		const fileState = this.getFileState(fileId)
		if (!fileState) return // file was deleted
		this.store.put([{ ...fileState, lastVisitAt: Date.now() }])
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
					...restOfPreferences,
				}),
			])
		}

		const app = new TldrawApp(store)
		return { app, userId }
	}
}
