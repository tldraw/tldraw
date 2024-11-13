// import { Query, QueryType, Smash, TableSchema, Zero } from '@rocicorp/zero'
import {
	CreateFilesResponseBody,
	TlaFile,
	TlaFileState,
	TlaUser,
	UserPreferencesKeys,
} from '@tldraw/dotcom-shared'
import { Result, assert, fetch, structuredClone, uniqueId } from '@tldraw/utils'
import pick from 'lodash.pick'
import {
	Signal,
	TLSessionStateSnapshot,
	TLStoreSnapshot,
	TLUiToastsContextType,
	TLUserPreferences,
	assertExists,
	atom,
	computed,
	createTLUser,
	getUserPreferences,
	objectMapFromEntries,
	objectMapKeys,
	react,
} from 'tldraw'
import { Zero } from './zero-polyfill'

export const TLDR_FILE_ENDPOINT = `/api/app/tldr`
export const PUBLISH_ENDPOINT = `/api/app/publish`
export const UNPUBLISH_ENDPOINT = `/api/app/unpublish`
export const FILE_ENDPOINT = `/api/app/file`

let appId = 0

export class TldrawApp {
	config = {
		maxNumberOfFiles: 100,
	}

	readonly id = appId++

	readonly z: Zero

	private readonly user$: Signal<TlaUser | undefined>
	private readonly files$: Signal<TlaFile[]>
	private readonly fileStates$: Signal<(TlaFileState & { file: TlaFile })[]>

	readonly disposables: (() => void)[] = []

	private signalizeQuery<TReturn>(name: string, query: any): Signal<TReturn> {
		// fail if closed?
		const view = query.materialize()
		const val$ = atom(name, view.data)
		view.addListener((res: any) => {
			val$.set(structuredClone(res) as any)
		})
		react('blah', () => {
			val$.get()
		})
		this.disposables.push(() => {
			view.destroy()
		})
		return val$
	}

	toasts: TLUiToastsContextType | null = null
	private constructor(
		public readonly userId: string,
		getToken: () => Promise<string | null>
	) {
		const sessionId = uniqueId()
		this.z = new Zero({
			// userID: userId,
			// auth: encodedJWT,
			getUri: async () => {
				const token = await getToken()
				if (!token)
					return `${process.env.MULTIPLAYER_SERVER}/api/app/${userId}/connect?accessToken=no-token-found&sessionId=${sessionId}`
				return `${process.env.MULTIPLAYER_SERVER}/api/app/${userId}/connect?accessToken=${token}&sessionId=${sessionId}`
			},
			// schema,
			// This is often easier to develop with if you're frequently changing
			// the schema. Switch to 'idb' for local-persistence.
			onMutationRejected: (errorCode) => {
				this.toasts?.addToast({
					title: 'That didn’t work',
					description: `Error code: ${errorCode}`,
				})
			},
		})
		this.disposables.push(() => this.z.dispose())

		this.user$ = this.signalizeQuery(
			'user signal',
			this.z.query.user.where('id', this.userId).one()
		)
		this.files$ = this.signalizeQuery(
			'files signal',
			this.z.query.file.where('ownerId', this.userId)
		)
		this.fileStates$ = this.signalizeQuery(
			'file states signal',
			this.z.query.file_state.where('userId', this.userId).related('file', (q: any) => q.one())
		)
	}

	async preload(initialUserData: TlaUser) {
		await this.z.query.user.where('id', this.userId).preload().complete
		if (!this.user$.get()) {
			await this.z.mutate.user.create(initialUserData)
		}
		await new Promise((resolve) => {
			let unsub = () => {}
			unsub = react('wait for user', () => this.user$.get() && resolve(unsub()))
		})
		if (!this.user$.get()) {
			throw Error('could not create user')
		}
		await this.z.query.file_state.where('userId', this.userId).preload().complete
		await this.z.query.file.where('ownerId', this.userId).preload().complete
	}

	dispose() {
		this.disposables.forEach((d) => d())
		// this.store.dispose()
	}

	getUser() {
		return assertExists(this.user$.get(), 'no user')
	}

	tlUser = createTLUser({
		userPreferences: computed('user prefs', () => {
			const user = this.getUser()
			return {
				...(pick(user, UserPreferencesKeys) as TLUserPreferences),
				id: this.userId,
			}
		}),
		setUserPreferences: ({ id: _, ...others }: Partial<TLUserPreferences>) => {
			const user = this.getUser()

			this.z.mutate((tx) => {
				tx.user.update({
					...user,
					// TODO: remove nulls
					...(others as TlaUser),
				})
			})
		},
	})

	getIsOffline() {
		return this.z.getIsOffline()
	}

	// getAll<T extends keyof Schema['tables']>(
	// 	typeName: T
	// ): SchemaToRow<Schema['tables'][T]>[] {
	// 	return this.z.query[typeName].run()
	// }

	getUserOwnFiles() {
		return this.files$.get()
	}

	getUserFileStates() {
		return this.fileStates$.get()
	}

	lastRecentFileOrdering = null as null | Array<{ fileId: string; date: number }>

	@computed
	getUserRecentFiles() {
		const myFiles = objectMapFromEntries(this.getUserOwnFiles().map((f) => [f.id, f]))
		const myStates = objectMapFromEntries(this.getUserFileStates().map((f) => [f.fileId, f]))

		const myFileIds = new Set<string>([...objectMapKeys(myFiles), ...objectMapKeys(myStates)])

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
		return Array.from(
			new Set(
				this.getUserFileStates()
					.map((s) => {
						// skip files where the owner is the current user
						if (s.file!.ownerId === this.userId) return
						return s.file
					})
					.filter(Boolean) as TlaFile[]
			)
		)
	}

	private canCreateNewFile() {
		const numberOfFiles = this.getUserOwnFiles().length
		return numberOfFiles < this.config.maxNumberOfFiles
	}

	async createFile(
		fileOrId?: string | Partial<TlaFile>
	): Promise<Result<{ file: TlaFile }, 'max number of files reached'>> {
		if (!this.canCreateNewFile()) {
			return Result.err('max number of files reached')
		}

		const file: TlaFile = {
			id: typeof fileOrId === 'string' ? fileOrId : uniqueId(),
			ownerId: this.userId,
			isEmpty: true,
			createdAt: Date.now(),
			lastPublished: 0,
			name: '',
			published: false,
			publishedSlug: uniqueId(),
			shared: false,
			sharedLinkType: 'view',
			thumbnail: '',
			updatedAt: Date.now(),
		}
		if (typeof fileOrId === 'object') {
			Object.assign(file, fileOrId)
		}

		this.z.mutate.file.create(file)

		return Result.ok({ file })
	}

	getFileName(file: TlaFile | string | null) {
		if (typeof file === 'string') {
			file = this.getFile(file)
		}
		if (!file) return ''
		assert(typeof file !== 'string', 'ok')
		return file.name.trim() || new Date(file.createdAt).toLocaleString('en-gb')
	}

	claimTemporaryFile(fileId: string) {
		// TODO(david): check that you can't claim someone else's file (the db insert should fail)
		// TODO(zero stuff): add table constraint
		this.createFile(fileId)
	}

	toggleFileShared(fileId: string) {
		const file = this.getUserOwnFiles().find((f) => f.id === fileId)
		if (!file) throw Error('no file with id ' + fileId)

		if (file.ownerId !== this.userId) throw Error('user cannot edit that file')

		this.z.mutate((tx) => {
			tx.file.update({
				...file,
				shared: !file.shared,
			})

			// if it was shared, remove all shared links
			// TODO: move this to the backend after read permissions are implemented
			for (const fileState of this.getUserFileStates().filter((f) => f.fileId === fileId)) {
				tx.file_state.delete(fileState)
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
		this.z.mutate((tx) => {
			for (const slug of response.slugs) {
				tx.file_state.create({
					userId: this.userId,
					fileId: slug,
					firstVisitAt: Date.now(),
					lastEditAt: null,
					lastSessionState: null,
					lastVisitAt: null,
				})
			}
		})

		return { slugs: response.slugs }
	}

	/**
	 * Publish a file or re-publish changes.
	 *
	 * @param fileId - The file id to unpublish.
	 * @returns A result indicating success or failure.
	 */
	publishFile(fileId: string) {
		const file = this.getUserOwnFiles().find((f) => f.id === fileId)
		if (!file) throw Error(`No file with that id`)
		if (file.ownerId !== this.userId) throw Error('user cannot publish that file')

		// We're going to bake the name of the file, if it's undefined
		const name = this.getFileName(file)

		// Optimistic update
		this.z.mutate((tx) => {
			tx.file.update({
				...file,
				name,
				published: true,
				lastPublished: Date.now(),
			})
		})
	}

	getFile(fileId: string): TlaFile | null {
		return this.getUserOwnFiles().find((f) => f.id === fileId) ?? null
	}

	isFileOwner(fileId: string) {
		const file = this.getFile(fileId)
		return file && file.ownerId === this.userId
	}

	requireFile(fileId: string): TlaFile {
		return assertExists(this.getFile(fileId), 'no file with id ' + fileId)
	}

	updateFile(fileId: string, cb: (file: TlaFile) => TlaFile) {
		const file = this.requireFile(fileId)
		this.z.mutate.file.update(cb(file))
	}

	/**
	 * Unpublish a file.
	 *
	 * @param fileId - The file id to unpublish.
	 * @returns A result indicating success or failure.
	 */
	unpublishFile(fileId: string) {
		const file = this.requireFile(fileId)
		if (file.ownerId !== this.userId) throw Error('user cannot edit that file')

		if (!file.published) return Result.ok('success')

		// Optimistic update
		this.z.mutate((tx) => {
			tx.file.update({
				...file,
				published: false,
			})
		})

		return Result.ok('success')
	}

	/**
	 * Remove a user's file states for a file and delete the file if the user is the owner of the file.
	 *
	 * @param fileId - The file id.
	 */
	async deleteOrForgetFile(fileId: string) {
		// Stash these so that we can restore them later
		let fileStates: TlaFileState[]
		const file = this.getFile(fileId)
		if (!file) return Result.err('no file with id ' + fileId)

		if (file.ownerId === this.userId) {
			// Optimistic update, remove file and file states
			this.z.mutate((tx) => {
				tx.file.delete(file)
				// TODO(blah): other file states should be deleted by backend
				fileStates = this.getUserFileStates().filter((r) => r.fileId === fileId)
				for (const state of fileStates) {
					if (state.fileId === fileId) {
						tx.file_state.delete(state)
					}
				}
			})
		} else {
			// If not the owner, just remove the file state
			this.z.mutate((tx) => {
				fileStates = this.getUserFileStates().filter((r) => r.fileId === fileId)
				for (const state of fileStates) {
					if (state.fileId === fileId) {
						tx.file_state.delete(state)
					}
				}
			})
		}
	}

	setFileSharedLinkType(fileId: string, sharedLinkType: TlaFile['sharedLinkType'] | 'no-access') {
		const file = this.requireFile(fileId)

		if (this.userId !== file.ownerId) {
			throw Error('user cannot edit that file')
		}

		if (sharedLinkType === 'no-access') {
			this.z.mutate.file.update({ ...file, shared: false })
			return
		}
		this.z.mutate.file.update({ ...file, shared: true, sharedLinkType })
	}

	updateUser(cb: (user: TlaUser) => TlaUser) {
		const user = this.getUser()
		this.z.mutate.user.update(cb(user))
	}

	updateUserExportPreferences(
		exportPreferences: Partial<
			Pick<TlaUser, 'exportFormat' | 'exportPadding' | 'exportBackground' | 'exportTheme'>
		>
	) {
		this.updateUser((user) => ({
			...user,
			...exportPreferences,
		}))
	}

	async getOrCreateFileState(fileId: string) {
		let fileState = this.getFileState(fileId)
		if (!fileState) {
			await this.z.mutate.file_state.create({
				fileId,
				userId: this.userId,
				firstVisitAt: Date.now(),
				lastEditAt: null,
				lastSessionState: null,
				lastVisitAt: null,
			})
		}
		fileState = this.getFileState(fileId)
		if (!fileState) throw Error('could not create file state')
		return fileState
	}

	getFileState(fileId: string) {
		return this.getUserFileStates().find((f) => f.fileId === fileId)
	}

	updateFileState(fileId: string, cb: (fileState: TlaFileState) => TlaFileState) {
		const fileState = this.getFileState(fileId)
		if (!fileState) return
		// remove relationship because zero complains
		const { file: _, ...rest } = fileState
		this.z.mutate.file_state.update(cb(rest))
	}

	async onFileEnter(fileId: string) {
		await this.getOrCreateFileState(fileId)
		this.updateFileState(fileId, (fileState) => ({
			...fileState,
			firstVisitAt: fileState.firstVisitAt ?? Date.now(),
			lastVisitAt: Date.now(),
		}))
	}

	onFileEdit(fileId: string) {
		this.updateFileState(fileId, (fileState) => ({
			...fileState,
			lastEditAt: Date.now(),
		}))
	}

	onFileSessionStateUpdate(fileId: string, sessionState: TLSessionStateSnapshot) {
		this.updateFileState(fileId, (fileState) => ({
			...fileState,
			lastSessionState: JSON.stringify(sessionState),
			lastVisitAt: Date.now(),
		}))
	}

	onFileExit(fileId: string) {
		this.updateFileState(fileId, (fileState) => ({
			...fileState,
			lastVisitAt: Date.now(),
		}))
	}

	static async create(opts: {
		userId: string
		fullName: string
		email: string
		avatar: string
		getToken(): Promise<string | null>
	}) {
		// This is an issue: we may have a user record but not in the store.
		// Could be just old accounts since before the server had a version
		// of the store... but we should probably identify that better.

		const { id: _id, name: _name, color: _color, ...restOfPreferences } = getUserPreferences()
		const app = new TldrawApp(opts.userId, opts.getToken)
		await app.preload({
			id: opts.userId,
			name: opts.fullName,
			email: opts.email,
			color: 'salmon',
			avatar: opts.avatar,
			exportFormat: 'png',
			exportTheme: 'light',
			exportBackground: false,
			exportPadding: false,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			flags: '',
			...restOfPreferences,
			locale: restOfPreferences.locale ?? null,
			animationSpeed: restOfPreferences.animationSpeed ?? null,
			edgeScrollSpeed: restOfPreferences.edgeScrollSpeed ?? null,
			colorScheme: restOfPreferences.colorScheme ?? null,
			isSnapMode: restOfPreferences.isSnapMode ?? null,
			isWrapMode: restOfPreferences.isWrapMode ?? null,
			isDynamicSizeMode: restOfPreferences.isDynamicSizeMode ?? null,
			isPasteAtCursorMode: restOfPreferences.isPasteAtCursorMode ?? null,
		})
		return { app, userId: opts.userId }
	}
}
