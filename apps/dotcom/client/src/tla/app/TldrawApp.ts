// import { Query, QueryType, Smash, TableSchema, Zero } from '@rocicorp/zero'
import { Zero } from '@rocicorp/zero'
import { captureException } from '@sentry/react'
import {
	CreateFilesResponseBody,
	createMutators,
	CreateSnapshotRequestBody,
	LOCAL_FILE_PREFIX,
	MAX_NUMBER_OF_FILES,
	TlaFile,
	TlaFileState,
	TlaMutators,
	TlaSchema,
	TlaUser,
	UserPreferencesKeys,
	Z_PROTOCOL_VERSION,
	schema as zeroSchema,
	ZErrorCode,
} from '@tldraw/dotcom-shared'
import {
	assert,
	fetch,
	getFromLocalStorage,
	promiseWithResolve,
	Result,
	setInLocalStorage,
	structuredClone,
	throttle,
	uniqueId,
} from '@tldraw/utils'
import pick from 'lodash.pick'
import {
	assertExists,
	Atom,
	atom,
	computed,
	createTLSchema,
	createTLUser,
	dataUrlToFile,
	defaultUserPreferences,
	getUserPreferences,
	objectMapFromEntries,
	objectMapKeys,
	parseTldrawJsonFile,
	react,
	Signal,
	TLDocument,
	TLSessionStateSnapshot,
	TLUiToastsContextType,
	TLUserPreferences,
	transact,
} from 'tldraw'
import { MULTIPLAYER_SERVER, ZERO_SERVER } from '../../utils/config'
import { multiplayerAssetStore } from '../../utils/multiplayerAssetStore'
import { getScratchPersistenceKey } from '../../utils/scratch-persistence-key'
import { TLAppUiContextType } from '../utils/app-ui-events'
import { getDateFormat } from '../utils/dates'
import { createIntl, defineMessages, setupCreateIntl } from '../utils/i18n'
import { updateLocalSessionState } from '../utils/local-session-state'
import { Zero as ZeroPolyfill } from './zero-polyfill'

export const TLDR_FILE_ENDPOINT = `/api/app/tldr`
export const PUBLISH_ENDPOINT = `/api/app/publish`

let appId = 0
const useProperZero = getFromLocalStorage('useProperZero') === 'true'
// eslint-disable-next-line no-console
console.log('useProperZero', useProperZero)
// @ts-expect-error
window.zero = () => {
	setInLocalStorage('useProperZero', String(!useProperZero))
	location.reload()
}

export class TldrawApp {
	config = {
		maxNumberOfFiles: MAX_NUMBER_OF_FILES,
	}

	readonly id = appId++

	readonly z: ZeroPolyfill | Zero<TlaSchema, TlaMutators>

	private readonly user$: Signal<TlaUser | undefined>
	private readonly fileStates$: Signal<(TlaFileState & { file: TlaFile })[]>

	private readonly abortController = new AbortController()
	readonly disposables: (() => void)[] = [() => this.abortController.abort(), () => this.z.close()]

	changes: Map<Atom<any, unknown>, any> = new Map()
	changesFlushed = null as null | ReturnType<typeof promiseWithResolve>

	private signalizeQuery<TReturn>(name: string, query: any): Signal<TReturn> {
		// fail if closed?
		const view = query.materialize()
		const val$ = atom(name, view.data)
		view.addListener((res: any) => {
			this.changes.set(val$, structuredClone(res))
			if (!this.changesFlushed) {
				this.changesFlushed = promiseWithResolve()
			}
			queueMicrotask(() => {
				transact(() => {
					this.changes.forEach((value, key) => {
						key.set(value)
					})
					this.changes.clear()
				})
				this.changesFlushed?.resolve(undefined)
				this.changesFlushed = null
			})
		})
		this.disposables.push(() => {
			view.destroy()
		})
		return val$
	}

	toasts: TLUiToastsContextType | null = null

	private constructor(
		public readonly userId: string,
		getToken: () => Promise<string | undefined>,
		onClientTooOld: () => void,
		trackEvent: TLAppUiContextType
	) {
		const sessionId = uniqueId()
		this.z = useProperZero
			? new Zero<TlaSchema, TlaMutators>({
					auth: getToken,
					userID: userId,
					schema: zeroSchema,
					server: ZERO_SERVER,
					mutators: createMutators(userId),
					onUpdateNeeded(reason) {
						console.error('update needed', reason)
						onClientTooOld()
					},
					kvStore: window.navigator.webdriver ? 'mem' : 'idb',
				})
			: new ZeroPolyfill({
					userId,
					// auth: encodedJWT,
					getUri: async () => {
						const params = new URLSearchParams({
							sessionId,
							protocolVersion: String(Z_PROTOCOL_VERSION),
						})
						const token = await getToken()
						params.set('accessToken', token || 'no-token-found')
						return `${MULTIPLAYER_SERVER}/app/${userId}/connect?${params}`
					},
					// schema,
					// This is often easier to develop with if you're frequently changing
					// the schema. Switch to 'idb' for local-persistence.
					onMutationRejected: this.showMutationRejectionToast,
					onClientTooOld: () => onClientTooOld(),
					trackEvent,
				})

		this.user$ = this.signalizeQuery('user signal', this.userQuery())
		this.fileStates$ = this.signalizeQuery('file states signal', this.fileStateQuery())
	}

	private userQuery() {
		return this.z.query.user.where('id', '=', this.userId).one()
	}

	private fileStateQuery() {
		return this.z.query.file_state
			.where('userId', '=', this.userId)
			.related('file', (q: any) => q.one())
	}

	async preload(initialUserData: TlaUser) {
		let didCreate = false
		await this.userQuery().preload().complete
		await this.changesFlushed
		if (!this.user$.get()) {
			didCreate = true
			this.z.mutate.user.insert(initialUserData)
			updateLocalSessionState((state) => ({ ...state, shouldShowWelcomeDialog: true }))
		}
		await new Promise((resolve) => {
			let unsub = () => {}
			unsub = react('wait for user', () => this.user$.get() && resolve(unsub()))
		})
		if (!this.user$.get()) {
			throw Error('could not create user')
		}
		await this.fileStateQuery().preload().complete
		return didCreate
	}

	messages = defineMessages({
		// toast title
		mutation_error_toast_title: { defaultMessage: 'Error' },
		// toast descriptions
		publish_failed: {
			defaultMessage: 'Unable to publish the file.',
		},
		unpublish_failed: {
			defaultMessage: 'Unable to unpublish the file.',
		},
		republish_failed: {
			defaultMessage: 'Unable to publish the changes.',
		},
		unknown_error: {
			defaultMessage: 'An unexpected error occurred.',
		},
		forbidden: {
			defaultMessage: 'You do not have the necessary permissions to perform this action.',
		},
		bad_request: {
			defaultMessage: 'Invalid request.',
		},
		rate_limit_exceeded: {
			defaultMessage: 'Rate limit exceeded, try again later.',
		},
		client_too_old: {
			defaultMessage: 'Please refresh the page to get the latest version of tldraw.',
		},
		max_files_title: {
			defaultMessage: 'File limit reached',
		},
		max_files_reached: {
			defaultMessage:
				'You have reached the maximum number of files. You need to delete old files before creating new ones.',
		},
		uploadingTldrFiles: {
			defaultMessage:
				'{total, plural, one {Uploading .tldr file…} other {Uploading {uploaded} of {total} .tldr files…}}',
		},
		addingTldrFiles: {
			// no need for pluralization, if there was only one file we navigated to it
			// so there's no need to show a toast.
			defaultMessage: 'Added {total} .tldr files.',
		},
	})

	getMessage(id: keyof typeof this.messages) {
		let msg = this.messages[id]
		if (!msg) {
			console.error('Could not find a translation for this error code', id)
			msg = this.messages.unknown_error
		}
		return msg
	}

	showMutationRejectionToast = throttle((errorCode: ZErrorCode) => {
		const descriptor = this.getMessage(errorCode)
		this.toasts?.addToast({
			title: this.getIntl().formatMessage(this.messages.mutation_error_toast_title),
			description: this.getIntl().formatMessage(descriptor),
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

			this.z.mutate.user.update({
				id: user.id,
				...(nonNull as any),
			})
		},
	})

	getUserOwnFiles() {
		const fileStates = this.getUserFileStates()
		const files: TlaFile[] = []
		fileStates.forEach((f) => {
			if (f.file) files.push(f.file)
		})
		return files
	}

	getUserFileStates() {
		return this.fileStates$.get()
	}

	lastRecentFileOrdering = null as null | Array<{
		fileId: TlaFile['id']
		isPinned: boolean
		date: number
	}>

	@computed
	getUserRecentFiles() {
		const myFiles = objectMapFromEntries(this.getUserOwnFiles().map((f) => [f.id, f]))
		const myStates = objectMapFromEntries(this.getUserFileStates().map((f) => [f.fileId, f]))

		const myFileIds = new Set<string>([...objectMapKeys(myFiles), ...objectMapKeys(myStates)])

		const nextRecentFileOrdering: {
			fileId: TlaFile['id']
			isPinned: boolean
			date: number
		}[] = []

		for (const fileId of myFileIds) {
			const file = myFiles[fileId]
			let state: (typeof myStates)[string] | undefined = myStates[fileId]
			if (!file) continue
			if (!state && !file.isDeleted && file.ownerId === this.userId) {
				// create a file state for this file
				// this allows us to 'undelete' soft-deleted files by manually toggling 'isDeleted' in the backend
				state = this.fileStates$.get().find((fs) => fs.fileId === fileId)
			}
			if (!state) {
				// if the file is deleted, we don't want to show it in the recent files
				continue
			}
			const existing = this.lastRecentFileOrdering?.find((f) => f.fileId === fileId)
			if (existing && existing.isPinned === state.isPinned) {
				nextRecentFileOrdering.push(existing)
				continue
			}

			nextRecentFileOrdering.push({
				fileId,
				isPinned: state.isPinned ?? false,
				date: state.lastEditAt ?? state.firstVisitAt ?? file.createdAt ?? 0,
			})
		}

		// sort by date with most recent first
		nextRecentFileOrdering.sort((a, b) => b.date - a.date)

		// stash the ordering for next time
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

	private showMaxFilesToast() {
		this.toasts?.addToast({
			title: this.getIntl().formatMessage(this.messages.max_files_title),
			description: this.getIntl().formatMessage(this.messages.max_files_reached),
			keepOpen: true,
		})
	}

	async createFile(
		fileOrId?: string | Partial<TlaFile>
	): Promise<Result<{ file: TlaFile }, 'max number of files reached'>> {
		if (!this.canCreateNewFile()) {
			this.showMaxFilesToast()
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
			name: this.getFallbackFileName(Date.now()),
			published: false,
			publishedSlug: uniqueId(),
			shared: true,
			sharedLinkType: 'edit',
			thumbnail: '',
			updatedAt: Date.now(),
			isDeleted: false,
			createSource: null,
		}
		if (typeof fileOrId === 'object') {
			Object.assign(file, fileOrId)
			if (!file.name) {
				Object.assign(file, { name: this.getFallbackFileName(file.createdAt) })
			}
		}
		const fileState = {
			isFileOwner: true,
			fileId: file.id,
			userId: this.userId,
			firstVisitAt: null,
			isPinned: false,
			lastEditAt: null,
			lastSessionState: null,
			lastVisitAt: null,
		}
		await this.z.mutate.file.insertWithFileState({ file, fileState })
		// todo: add server error handling for real Zero
		// .server.catch((res: { error: string; details: string }) => {
		// 	if (res.details === ZErrorCode.max_files_reached) {
		// 		this.showMaxFilesToast()
		// 	}
		// })

		return Result.ok({ file })
	}

	getFallbackFileName(time: number) {
		const createdAt = new Date(time)
		const format = getDateFormat(createdAt)
		return this.getIntl().formatDate(createdAt, format)
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

		if (typeof file.name === 'undefined') {
			captureException(new Error('file name is undefined somehow: ' + JSON.stringify(file)))
		}
		// need a ? here because we were seeing issues on sentry where file.name was undefined
		const name = file.name?.trim()
		if (name) {
			return name
		}

		if (useDateFallback) {
			return this.getFallbackFileName(file.createdAt)
		}

		return
	}

	async slurpFile() {
		return await this.createFile({
			createSource: `${LOCAL_FILE_PREFIX}/${getScratchPersistenceKey()}`,
		})
	}

	getFilePk(fileId: string) {
		const file = this.getFile(fileId)
		return { id: fileId, ownerId: file!.ownerId, publishedSlug: file!.publishedSlug }
	}

	toggleFileShared(fileId: string) {
		const file = this.getUserOwnFiles().find((f) => f.id === fileId)
		if (!file) throw Error('no file with id ' + fileId)

		if (file.ownerId !== this.userId) throw Error('user cannot edit that file')

		this.z.mutate.file.update({
			id: fileId,
			shared: !file.shared,
		})
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
		this.z.mutate.file.update({
			id: fileId,
			name,
			published: true,
			lastPublished: Date.now(),
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
		this.z.mutate.file.update({
			id: fileId,
			published: false,
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
		if (!file) return

		// Optimistic update, remove file and file states
		await this.z.mutate.file.deleteOrForget(file)
	}

	/**
	 * Pin a file (or unpin it if it's already pinned).
	 *
	 * @param fileId - The file id.
	 */
	async pinOrUnpinFile(fileId: string) {
		const fileState = this.getFileState(fileId)

		if (!fileState) return

		return this.z.mutate.file_state.update({
			fileId,
			userId: this.userId,
			isPinned: !fileState.isPinned,
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
		return this.z.mutate.user.update({
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

	async createFileStateIfNotExists(fileId: string) {
		await this.changesFlushed
		const fileState = this.getFileState(fileId)
		if (!fileState) {
			const fs: TlaFileState = {
				fileId,
				userId: this.userId,
				firstVisitAt: Date.now(),
				lastEditAt: null,
				lastSessionState: null,
				lastVisitAt: null,
				isPinned: false,
				// doesn't really matter what this is because it is
				// overwritten by postgres
				isFileOwner: this.isFileOwner(fileId),
			}
			this.z.mutate.file_state.insert(fs)
		}
	}

	getFileState(fileId: string) {
		return this.getUserFileStates().find((f) => f.fileId === fileId)
	}

	updateFileState(fileId: string, partial: Partial<TlaFileState>) {
		const fileState = this.getFileState(fileId)
		if (!fileState) return
		this.z.mutate.file_state.update({ ...partial, fileId, userId: fileState.userId })
	}

	updateFile(fileId: string, partial: Partial<TlaFile>) {
		this.z.mutate.file.update({ id: fileId, ...partial })
	}

	async onFileEnter(fileId: string) {
		await this.createFileStateIfNotExists(fileId)
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
		getToken(): Promise<string | undefined>
		onClientTooOld(): void
		trackEvent: TLAppUiContextType
	}) {
		// This is an issue: we may have a user record but not in the store.
		// Could be just old accounts since before the server had a version
		// of the store... but we should probably identify that better.

		const { id: _id, name: _name, color, ...restOfPreferences } = getUserPreferences()
		const app = new TldrawApp(opts.userId, opts.getToken, opts.onClientTooOld, opts.trackEvent)
		// @ts-expect-error
		window.app = app
		const didCreate = await app.preload({
			id: opts.userId,
			name: opts.fullName,
			email: opts.email,
			color: color ?? defaultUserPreferences.color,
			avatar: opts.avatar,
			exportFormat: 'png',
			exportTheme: 'light',
			exportBackground: false,
			exportPadding: true,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			flags: '',
			allowAnalyticsCookie: null,
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
		if (didCreate) {
			opts.trackEvent('create-user', { source: 'app' })
		}
		return { app, userId: opts.userId }
	}

	getIntl() {
		const intl = createIntl()
		if (intl) return intl
		// intl should exists since IntlWrapper should create it before we get here, but let's use this just in case
		setupCreateIntl({
			defaultLocale: 'en',
			locale: this.user$.get()?.locale ?? 'en',
			messages: {},
		})
		return createIntl()!
	}

	async uploadTldrFiles(files: File[], onFirstFileUploaded?: (file: TlaFile) => void) {
		const totalFiles = files.length
		let uploadedFiles = 0
		if (totalFiles === 0) return

		// this is only approx since we upload the files in pieces and they are base64 encoded
		// in the json blob, so this will usually be a big overestimate. But that's fine because
		// if the upload finishes before the number hits 100% people are pleasantly surprised.
		const approxTotalBytes = files.reduce((acc, f) => acc + f.size, 0)
		let bytesUploaded = 0
		const getApproxPercentage = () =>
			Math.min(Math.round((bytesUploaded / approxTotalBytes) * 100), 100)
		const updateProgress = () => updateToast({ description: `${getApproxPercentage()}%` })

		// only bother showing the percentage if it's going to take a while

		let uploadingToastId = undefined as undefined | string
		let didFinishUploading = false

		// give it a second before we show the toast, in case the upload is fast
		setTimeout(() => {
			if (didFinishUploading || this.abortController.signal.aborted) return
			// if it's close to the end, don't show the progress toast
			if (getApproxPercentage() > 50) return
			uploadingToastId = this.toasts?.addToast({
				severity: 'info',
				title: this.getIntl().formatMessage(this.messages.uploadingTldrFiles, {
					total: totalFiles,
					uploaded: uploadedFiles,
				}),

				description: `${getApproxPercentage()}%`,
				keepOpen: true,
			})
		}, 800)

		const updateToast = (args: { title?: string; description?: string }) => {
			if (!uploadingToastId) return
			this.toasts?.toasts.update((toasts) =>
				toasts.map((t) =>
					t.id === uploadingToastId
						? {
								...t,
								...args,
							}
						: t
				)
			)
		}

		for (const f of files) {
			const res = await this.uploadTldrFile(f, (bytes) => {
				bytesUploaded += bytes
				updateProgress()
			}).catch((e) => Result.err(e))
			if (!res.ok) {
				if (uploadingToastId) this.toasts?.removeToast(uploadingToastId)
				this.toasts?.addToast({
					severity: 'error',
					title: this.getIntl().formatMessage(this.messages.unknown_error),
					keepOpen: true,
				})
				console.error(res.error)
				return
			}

			updateToast({
				title: this.getIntl().formatMessage(this.messages.uploadingTldrFiles, {
					total: totalFiles,
					uploaded: ++uploadedFiles + 1,
				}),
			})

			if (onFirstFileUploaded) {
				onFirstFileUploaded(res.value.file)
				onFirstFileUploaded = undefined
			}
		}
		didFinishUploading = true

		if (uploadingToastId) this.toasts?.removeToast(uploadingToastId)

		if (totalFiles > 1) {
			this.toasts?.addToast({
				severity: 'success',
				title: this.getIntl().formatMessage(this.messages.addingTldrFiles, {
					total: files.length,
				}),
				keepOpen: true,
			})
		}
	}

	private async uploadTldrFile(
		file: File,
		onProgress?: (bytesUploadedSinceLastProgressUpdate: number) => void
	) {
		const json = await file.text()
		const parseFileResult = parseTldrawJsonFile({
			schema: createTLSchema(),
			json,
		})

		if (!parseFileResult.ok) {
			return Result.err('could not parse file')
		}

		const snapshot = parseFileResult.value.getStoreSnapshot()

		for (const record of Object.values(snapshot.store)) {
			if (
				record.typeName !== 'asset' ||
				record.type === 'bookmark' ||
				!record.props.src?.startsWith('data:')
			) {
				snapshot.store[record.id] = record
				continue
			}
			const src = record.props.src
			const file = await dataUrlToFile(
				src,
				record.props.name,
				record.props.mimeType ?? 'application/octet-stream'
			)
			// TODO: this creates duplicate versions of the assets because we'll re-upload them when the user opens
			// the file to associate them with the file id. To avoid this we'd need a way to create the file row
			// in postgres so we can do the association while uploading the first time. Or just tolerate foreign key
			// constraints being violated for a moment.
			const assetsStore = multiplayerAssetStore()
			const { src: newSrc } = await assetsStore.upload(record, file, this.abortController.signal)
			onProgress?.(file.size)
			snapshot.store[record.id] = {
				...record,
				props: {
					...record.props,
					src: newSrc,
				},
			}
		}
		const body = JSON.stringify({
			snapshots: [
				{
					schema: snapshot.schema,
					snapshot: snapshot.store,
				} satisfies CreateSnapshotRequestBody,
			],
		})

		const res = await fetch(TLDR_FILE_ENDPOINT, { method: 'POST', body })
		onProgress?.(body.length)
		if (!res.ok) {
			throw Error('could not upload file ' + (await res.text()))
		}
		const response = (await res.json()) as CreateFilesResponseBody
		if (response.error) {
			throw Error(response.message)
		}
		const id = response.slugs[0]
		const name =
			file.name?.replace(/\.tldr$/, '') ??
			Object.values(snapshot.store).find((d): d is TLDocument => d.typeName === 'document')?.name ??
			''

		return this.createFile({ id, name })
	}
}
