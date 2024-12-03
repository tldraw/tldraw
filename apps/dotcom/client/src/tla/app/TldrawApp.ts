// import { Query, QueryType, Smash, TableSchema, Zero } from '@rocicorp/zero'
import {
	CreateFilesResponseBody,
	TlaFile,
	TlaFilePartial,
	TlaFileState,
	TlaUser,
	UserPreferencesKeys,
	ZErrorCode,
	Z_PROTOCOL_VERSION,
} from '@tldraw/dotcom-shared'
import { Result, assert, fetch, structuredClone, throttle, uniqueId } from '@tldraw/utils'
import pick from 'lodash.pick'
import {
	Signal,
	TLDocument,
	TLSessionStateSnapshot,
	TLStoreSnapshot,
	TLUiToastsContextType,
	TLUserPreferences,
	assertExists,
	atom,
	computed,
	createTLUser,
	defaultUserPreferences,
	getUserPreferences,
	isDocument,
	objectMapFromEntries,
	objectMapKeys,
	react,
} from 'tldraw'
import { getDateFormat } from '../utils/dates'
import { IntlShape, defineMessages } from '../utils/i18n'
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
		getToken: () => Promise<string | null>,
		onClientTooOld: () => void,
		private intl: IntlShape
	) {
		const sessionId = uniqueId()
		this.z = new Zero({
			// userID: userId,
			// auth: encodedJWT,
			getUri: async () => {
				const params = new URLSearchParams({
					sessionId,
					protocolVersion: String(Z_PROTOCOL_VERSION),
				})
				const token = await getToken()
				params.set('accessToken', token || 'no-token-found')
				return `${process.env.MULTIPLAYER_SERVER}/api/app/${userId}/connect?${params}`
			},
			// schema,
			// This is often easier to develop with if you're frequently changing
			// the schema. Switch to 'idb' for local-persistence.
			onMutationRejected: this.showMutationRejectionToast,
			onClientTooOld: () => onClientTooOld(),
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

	messages = defineMessages({
		publish_failed: { defaultMessage: 'Unable to publish the file.' },
		unpublish_failed: { defaultMessage: 'Unable to unpublish the file.' },
		republish_failed: { defaultMessage: 'Unable to publish the changes.' },
		unknown_error: { defaultMessage: 'An unexpected error occurred.' },
		forbidden: {
			defaultMessage: 'You do not have the necessary permissions to perform this action.',
		},
		bad_request: { defaultMessage: 'Invalid request.' },
		rate_limit_exceeded: { defaultMessage: 'You have exceeded the rate limit.' },
		mutation_error_toast_title: { defaultMessage: 'Error' },
		client_too_old: {
			defaultMessage: 'Please refresh the page to get the latest version of tldraw.',
		},
	})

	showMutationRejectionToast = throttle((errorCode: ZErrorCode) => {
		const descriptor = this.messages[errorCode]
		// Looks like we don't get type safety here
		if (!descriptor) {
			console.error('Could not find a translation for this error code', errorCode)
		}
		this.toasts?.addToast({
			title: this.intl?.formatMessage(this.messages.mutation_error_toast_title),
			description: this.intl?.formatMessage(descriptor ?? this.messages.unknown_error),
		})
	}, 3000)

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

			const nonNull = Object.fromEntries(
				Object.entries(others).filter(([_, value]) => value !== null)
			) as Partial<TLUserPreferences>

			this.z.mutate((tx) => {
				tx.user.update({
					id: user.id,
					...(nonNull as any),
				})
			})
		},
	})

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
			const file = myFiles[fileId]
			const state = myStates[fileId]
			if (!file || !state) continue
			const existing = this.lastRecentFileOrdering?.find((f) => f.fileId === fileId)
			if (existing) {
				nextRecentFileOrdering.push(existing)
				continue
			}

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

	createFile(
		fileOrId?: string | Partial<TlaFile>
	): Result<{ file: TlaFile }, 'max number of files reached'> {
		if (!this.canCreateNewFile()) {
			return Result.err('max number of files reached')
		}

		const file: TlaFile = {
			id: typeof fileOrId === 'string' ? fileOrId : uniqueId(),
			ownerId: this.userId,
			// these two owner properties are overridden by postgres triggers
			ownerAvatar: this.getUser().avatar,
			ownerName: this.getUser().name,
			isEmpty: true,
			createdAt: Date.now(),
			lastPublished: 0,
			name: '',
			published: false,
			publishedSlug: uniqueId(),
			shared: true,
			sharedLinkType: 'edit',
			thumbnail: '',
			updatedAt: Date.now(),
			isDeleted: false,
		}
		if (typeof fileOrId === 'object') {
			Object.assign(file, fileOrId)
		}

		this.z.mutate.file.create(file)

		return Result.ok({ file })
	}

	getFileName(file: TlaFile | string | null, useDateFallback: false): string | undefined
	getFileName(file: TlaFile | string | null, useDateFallback?: true): string
	getFileName(file: TlaFile | string | null, useDateFallback = true) {
		if (typeof file === 'string') {
			file = this.getFile(file)
		}
		if (!file) {
			// possibly a published file
			return ''
		}
		assert(typeof file !== 'string', 'ok')

		const name = file.name.trim()
		if (name) {
			return name
		}

		if (useDateFallback) {
			const createdAt = new Date(file.createdAt)
			const format = getDateFormat(createdAt)
			return this.intl.formatDate(createdAt, format)
		}

		return
	}

	_slurpFileId: string | null = null
	slurpFile() {
		const res = this.createFile()
		if (res.ok) {
			this._slurpFileId = res.value.file.id
		}
		return res
	}

	toggleFileShared(fileId: string) {
		const file = this.getUserOwnFiles().find((f) => f.id === fileId)
		if (!file) throw Error('no file with id ' + fileId)

		if (file.ownerId !== this.userId) throw Error('user cannot edit that file')

		this.z.mutate((tx) => {
			tx.file.update({
				id: fileId,
				shared: !file.shared,
			})
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
			for (let i = 0; i < response.slugs.length; i++) {
				const slug = response.slugs[i]
				const entries = Object.entries(snapshots[i].store)
				const documentEntry = entries.find(([_, value]) => isDocument(value)) as
					| [string, TLDocument]
					| undefined
				const name = documentEntry ? documentEntry[1].name : ''

				const result = this.createFile({ id: slug, name })
				if (!result.ok) {
					console.error('Could not create file', result.error)
					continue
				}
				tx.file_state.create({
					userId: this.userId,
					fileId: slug,
					firstVisitAt: Date.now(),
					lastEditAt: null,
					lastSessionState: null,
					lastVisitAt: null,
					isFileOwner: true,
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
				id: fileId,
				name,
				published: true,
				lastPublished: Date.now(),
			})
		})
	}

	getFile(fileId?: string): TlaFile | null {
		if (!fileId) return null
		return this.getUserOwnFiles().find((f) => f.id === fileId) ?? null
	}

	isFileOwner(fileId: string) {
		const file = this.getFile(fileId)
		return file && file.ownerId === this.userId
	}

	requireFile(fileId: string): TlaFile {
		return assertExists(this.getFile(fileId), 'no file with id ' + fileId)
	}

	updateFile(partial: TlaFilePartial) {
		this.requireFile(partial.id)
		this.z.mutate.file.update(partial)
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
				id: fileId,
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
		const file = this.getFile(fileId)

		// Optimistic update, remove file and file states
		this.z.mutate((tx) => {
			tx.file_state.delete({ fileId, userId: this.userId })
			if (file?.ownerId === this.userId) {
				tx.file.update({ id: fileId, isDeleted: true })
			}
		})
	}

	setFileSharedLinkType(fileId: string, sharedLinkType: TlaFile['sharedLinkType'] | 'no-access') {
		const file = this.requireFile(fileId)

		if (this.userId !== file.ownerId) {
			throw Error('user cannot edit that file')
		}

		if (sharedLinkType === 'no-access') {
			this.z.mutate.file.update({ id: fileId, shared: false })
			return
		}
		this.z.mutate.file.update({ id: fileId, shared: true, sharedLinkType })
	}

	updateUser(partial: Partial<TlaUser>) {
		const user = this.getUser()
		this.z.mutate.user.update({
			id: user.id,
			...partial,
		})
	}

	updateUserExportPreferences(
		exportPreferences: Partial<
			Pick<TlaUser, 'exportFormat' | 'exportPadding' | 'exportBackground' | 'exportTheme'>
		>
	) {
		this.updateUser(exportPreferences)
	}

	async getOrCreateFileState(fileId: string) {
		let fileState = this.getFileState(fileId)
		if (!fileState) {
			this.z.mutate.file_state.create({
				fileId,
				userId: this.userId,
				firstVisitAt: Date.now(),
				lastEditAt: null,
				lastSessionState: null,
				lastVisitAt: null,
				// doesn't really matter what this is because it is
				// overwritten by postgres
				isFileOwner: this.isFileOwner(fileId),
			})
		}
		fileState = this.getFileState(fileId)
		if (!fileState) throw Error('could not create file state')
		return fileState
	}

	getFileState(fileId: string) {
		return this.getUserFileStates().find((f) => f.fileId === fileId)
	}

	updateFileState(fileId: string, partial: Partial<TlaFileState>) {
		const fileState = this.getFileState(fileId)
		if (!fileState) return
		this.z.mutate.file_state.update({ ...partial, fileId, userId: fileState.userId })
	}

	async onFileEnter(fileId: string) {
		await this.getOrCreateFileState(fileId)
		this.updateFileState(fileId, {
			lastVisitAt: Date.now(),
		})
	}

	onFileEdit(fileId: string) {
		this.updateFileState(fileId, { lastEditAt: Date.now() })
	}

	onFileSessionStateUpdate(fileId: string, sessionState: TLSessionStateSnapshot) {
		this.updateFileState(fileId, {
			lastSessionState: JSON.stringify(sessionState),
			lastVisitAt: Date.now(),
		})
	}

	onFileExit(fileId: string) {
		this.updateFileState(fileId, { lastVisitAt: Date.now() })
	}

	static async create(opts: {
		userId: string
		fullName: string
		email: string
		avatar: string
		getToken(): Promise<string | null>
		onClientTooOld(): void
		intl: IntlShape
	}) {
		// This is an issue: we may have a user record but not in the store.
		// Could be just old accounts since before the server had a version
		// of the store... but we should probably identify that better.

		const { id: _id, name: _name, color, ...restOfPreferences } = getUserPreferences()
		const app = new TldrawApp(opts.userId, opts.getToken, opts.onClientTooOld, opts.intl)
		// @ts-expect-error
		window.app = app
		await app.preload({
			id: opts.userId,
			name: opts.fullName,
			email: opts.email,
			color: color ?? defaultUserPreferences.color,
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
