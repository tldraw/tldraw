// import { Query, QueryType, Smash, TableSchema, Zero } from '@rocicorp/zero'
import { Zero } from '@rocicorp/zero'
import { captureException } from '@sentry/react'
import {
	CreateFilesResponseBody,
	CreateSnapshotRequestBody,
	FILE_PREFIX,
	LOCAL_FILE_PREFIX,
	MAX_NUMBER_OF_FILES,
	ROOM_PREFIX,
	TlaFile,
	TlaFileState,
	TlaFileStatePartial,
	TlaFlags,
	TlaGroup,
	TlaGroupFile,
	TlaGroupUser,
	TlaMutators,
	TlaSchema,
	TlaUser,
	UserPreferencesKeys,
	ZErrorCode,
	Z_PROTOCOL_VERSION,
	createMutators,
	schema as zeroSchema,
} from '@tldraw/dotcom-shared'
import {
	Result,
	assert,
	fetch,
	getFromLocalStorage,
	isEqual,
	promiseWithResolve,
	setInLocalStorage,
	sortByIndex,
	sortByMaybeIndex,
	structuredClone,
	throttle,
	uniqueId,
} from '@tldraw/utils'
import pick from 'lodash.pick'
import {
	Atom,
	Signal,
	TLDocument,
	TLUiToastsContextType,
	TLUserPreferences,
	assertExists,
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
	transact,
} from 'tldraw'
import { trackEvent } from '../../utils/analytics'
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
	private readonly groupMemberships$: Signal<
		(TlaGroupUser & {
			group: TlaGroup
			groupFiles: Array<TlaGroupFile & { file: TlaFile }>
			groupMembers: Array<TlaGroupUser>
		})[]
	>

	private readonly abortController = new AbortController()
	readonly disposables: (() => void)[] = [() => this.abortController.abort(), () => this.z.close()]

	changes: Map<Atom<any, unknown>, any> = new Map()
	changesFlushed = null as null | ReturnType<typeof promiseWithResolve>

	// Track new room creation timestamps and sources
	private newRoomCreationStartTimes: Map<string, { startTime: number; source: string }> = new Map()

	private signalizeQuery<TReturn>(name: string, query: any): Signal<TReturn> {
		// fail if closed?
		const view = query.materialize()
		const val$ = atom(name, view.data, { isEqual })
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
	trackEvent: TLAppUiContextType

	private constructor(
		public readonly userId: string,
		getToken: () => Promise<string | undefined>,
		onClientTooOld: () => void,
		trackEvent: TLAppUiContextType
	) {
		this.trackEvent = trackEvent
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
		this.groupMemberships$ = this.signalizeQuery(
			'group memberships signal',
			this.groupMembershipsQuery()
		)
	}

	private userQuery() {
		return this.z.query.user.where('id', '=', this.userId).one()
	}

	private fileStateQuery() {
		return this.z.query.file_state.where('userId', '=', this.userId).related('file', (q) => q.one())
	}

	private groupMembershipsQuery() {
		return this.z.query.group_user
			.where('userId', '=', this.userId)
			.related('group', (q) => q.one())
			.related('groupFiles', (q) => q.related('file', (q) => q.one()))
			.related('groupMembers')
	}

	async preload(initialUserData: TlaUser) {
		let didCreate = false
		await this.userQuery().preload().complete
		await this.changesFlushed
		if (!this.user$.get()) {
			didCreate = true

			// Check localStorage feature flag for new groups initialization
			const useNewGroupsInit = getFromLocalStorage('tldraw_groups_init') === 'true'

			if (useNewGroupsInit) {
				// New groups initialization
				await this.z.mutate.init({ user: initialUserData, time: Date.now() })
			} else {
				// Legacy initialization (no groups) - just insert user like before
				// eslint-disable-next-line @typescript-eslint/no-deprecated
				await this.z.mutate.user.insert({ ...initialUserData, flags: '' })
			}

			updateLocalSessionState((state) => ({ ...state, shouldShowWelcomeDialog: true }))
		}
		await new Promise((resolve) => {
			let unlisten = () => {}
			unlisten = react('wait for user', () => this.user$.get() && resolve(unlisten()))
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

	@computed({ isEqual })
	getUserFlags(): Set<TlaFlags> {
		const user = this.getUser()
		return new Set(user.flags?.split(',') ?? []) as Set<TlaFlags>
	}

	hasFlag(flag: TlaFlags) {
		return this.getUserFlags().has(flag)
	}

	/**
	 * Check if the user has been migrated to the new groups-based data model.
	 * Users with the 'groups_backend' flag use group_file for access control and pinning.
	 * Users without the flag use the legacy file_state-based approach.
	 */
	isGroupsMigrated() {
		return this.hasFlag('groups_backend')
	}

	/**
	 * Get the user's home group ID.
	 * For migrated users, this is used to store shared files and pinned files.
	 * The home group ID is the same as the user ID.
	 */
	getHomeGroupId() {
		return this.userId
	}

	@computed({ isEqual })
	getGroupMemberships() {
		return this.groupMemberships$.get().slice(0).sort(sortByIndex)
	}

	getGroupMembership(groupId: string) {
		return this.groupMemberships$.get().find((g) => g.groupId === groupId)
	}

	getGroupFilesSorted(groupId: string) {
		const group = this.getGroupMembership(groupId)
		if (!group) return []

		const pinned = group.groupFiles.filter((f) => f.index !== null)
		const unpinned = group.groupFiles.filter((f) => f.index === null)

		const lastOrdering = this.lastGroupFileOrderings.get(groupId)
		const retainedOrdering =
			lastOrdering?.filter((f) => unpinned.some((p) => p.fileId === f.fileId)) ?? []
		const newOrdering: typeof retainedOrdering = []

		pinned.sort(sortByMaybeIndex)

		for (const file of unpinned) {
			const existing = retainedOrdering?.find((f) => f.fileId === file.fileId)
			if (existing) continue

			// For new files, use current updatedAt
			const state = this.getFileState(file.fileId)
			newOrdering.push({
				fileId: file.fileId,
				date: Math.max(state?.lastEditAt ?? state?.firstVisitAt ?? file.file.createdAt),
			})
		}

		// Sort by date (most recent first) but only for new ordering
		newOrdering.sort((a, b) => b.date - a.date)

		const nextOrdering = [...newOrdering, ...retainedOrdering]
		// Store the ordering for next time
		this.lastGroupFileOrderings.set(groupId, nextOrdering)

		// Return the actual file objects in the stable order
		return pinned
			.map((f) => ({ fileId: f.fileId, isPinned: f.index !== null, date: f.file.updatedAt }))
			.concat(nextOrdering.map((f) => ({ fileId: f.fileId, isPinned: false, date: f.date })))
	}

	// Clear group file ordering to refresh on expand (like recent files on page reload)
	clearGroupFileOrdering(groupId: string) {
		this.lastGroupFileOrderings.delete(groupId)
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
				Object.entries(others).filter(([key, value]) => value !== null || key === 'inputMode')
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

	// Store stable group file ordering for each group to prevent jumping when files are edited
	lastGroupFileOrderings = new Map<
		string,
		Array<{
			fileId: TlaFile['id']
			date: number
		}>
	>()

	@computed({ isEqual })
	getUserRecentFiles() {
		if (this.isGroupsMigrated()) {
			return this.getGroupFilesSorted(this.getHomeGroupId())
		}
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

	private canCreateNewFile(groupId: string) {
		if (this.isGroupsMigrated()) {
			// For migrated users, count non-deleted files in the home group
			const group = this.getGroupMembership(groupId)
			if (!group) return true
			const nonDeletedCount = group.groupFiles.filter((gf) => !gf.file.isDeleted).length
			return nonDeletedCount < this.config.maxNumberOfFiles
		} else {
			// For unmigrated users, count non-deleted files owned by the user
			const nonDeletedCount = this.getUserOwnFiles().filter((f) => !f.isDeleted).length
			return nonDeletedCount < this.config.maxNumberOfFiles
		}
	}

	private showMaxFilesToast() {
		trackEvent('max-files-reached')
		this.toasts?.addToast({
			title: this.getIntl().formatMessage(this.messages.max_files_title),
			description: this.getIntl().formatMessage(this.messages.max_files_reached),
			keepOpen: true,
		})
	}

	isPinned(fileId: string, groupId: string) {
		if (this.isGroupsMigrated()) {
			return this.getGroupFilesSorted(groupId).some((f) => f.fileId === fileId && f.isPinned)
		}
		return this.getFileState(fileId)?.isPinned ?? false
	}

	async createFile({
		fileId = uniqueId(),
		groupId = this.getHomeGroupId(),
		name = this.getFallbackFileName(Date.now()),
		createSource = null,
	}: {
		fileId?: string
		groupId?: string
		name?: string
		createSource?: string | null
	} = {}): Promise<Result<{ fileId: string }, 'max number of files reached'>> {
		if (!this.canCreateNewFile(this.getHomeGroupId())) {
			this.showMaxFilesToast()
			return Result.err('max number of files reached')
		}

		this.storeNewRoomCreationTracking(fileId, createSource, Date.now())
		this.z.mutate.createFile({ fileId, groupId, name, createSource, time: Date.now() })
		// todo: add server error handling for real Zero
		// .server.catch((res: { error: string; details: string }) => {
		// 	if (res.details === ZErrorCode.max_files_reached) {
		// 		this.showMaxFilesToast()
		// 	}
		// })

		return Result.ok({ fileId })
	}

	/**
	 * Get and remove the creation start time and source for a file (used for tracking new room creation duration)
	 */
	getAndClearNewRoomCreationStartTime(
		fileId: string
	): { startTime: number; source: string } | null {
		const creationData = this.newRoomCreationStartTimes.get(fileId) ?? null
		if (creationData !== null) {
			this.newRoomCreationStartTimes.delete(fileId)
		}
		return creationData
	}

	/**
	 * Store new room creation timing data with analytics-friendly source mapping
	 */
	private storeNewRoomCreationTracking(
		fileId: string,
		createSource: string | null,
		startTime: number
	): void {
		let analyticsSource: string

		if (!createSource) {
			analyticsSource = 'create-blank-file' // Default for button clicks
		} else if (createSource.startsWith(`${LOCAL_FILE_PREFIX}/`)) {
			analyticsSource = 'slurp'
		} else if (createSource.startsWith(`${FILE_PREFIX}/`)) {
			analyticsSource = 'duplicate'
		} else if (createSource.startsWith(`${ROOM_PREFIX}/`)) {
			analyticsSource = 'legacy-import'
		} else {
			analyticsSource = 'other'
		}

		// Store the creation start time and source for tracking
		this.newRoomCreationStartTimes.set(fileId, {
			startTime,
			source: analyticsSource,
		})
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

	toggleFileShared(fileId: string) {
		const file = this.getFile(fileId)
		if (!file) throw Error('no file with id ' + fileId)

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
		const file = this.getFile(fileId)
		if (!file) throw Error(`No file with that id`)

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
		if (this.isGroupsMigrated()) {
			return (
				this.getGroupMemberships()
					.find((g) => g.groupFiles.some((gf) => gf.fileId === fileId))
					?.groupFiles.find((gf) => gf.fileId === fileId)?.file ?? null
			)
		}
		return this.getUserOwnFiles().find((f) => f.id === fileId) ?? null
	}

	canUpdateFile(fileId: string): boolean {
		const file = this.getFile(fileId)
		if (!file) return false
		if (file.ownerId) return file.ownerId === this.userId
		return this.getGroupMemberships().some((g) => g.groupId === file.owningGroupId)
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
		if (!this.canUpdateFile(fileId)) throw Error('user cannot edit that file')

		if (!file.published) return

		// Optimistic update
		this.z.mutate.file.update({
			id: fileId,
			published: false,
		})
	}

	/**
	 * Remove a user's file states for a file and delete the file if the user is the owner of the file.
	 *
	 * @param fileId - The file id.
	 */
	async deleteOrForgetFile(fileId: string) {
		// Optimistic update, remove file and file states
		await this.z.mutate.removeFileFromGroup({ fileId, groupId: this.getHomeGroupId() })
	}

	setFileSharedLinkType(fileId: string, sharedLinkType: TlaFile['sharedLinkType'] | 'no-access') {
		if (!this.canUpdateFile(fileId)) throw Error('user cannot edit that file')

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

	getFileState(fileId: string) {
		return this.getUserFileStates().find((f) => f.fileId === fileId)
	}

	updateFileState(fileId: string, partial: Omit<TlaFileStatePartial, 'fileId' | 'userId'>) {
		this.z.mutate.file_state.update({ ...partial, fileId, userId: this.userId })
	}

	updateFile(fileId: string, partial: Partial<TlaFile>) {
		this.z.mutate.file.update({ id: fileId, ...partial })
	}

	async onFileEnter(fileId: string) {
		this.z.mutate.onEnterFile({ fileId, time: Date.now() })
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
			inputMode: restOfPreferences.inputMode ?? null,
			locale: restOfPreferences.locale ?? null,
			animationSpeed: restOfPreferences.animationSpeed ?? null,
			areKeyboardShortcutsEnabled: restOfPreferences.areKeyboardShortcutsEnabled ?? null,
			edgeScrollSpeed: restOfPreferences.edgeScrollSpeed ?? null,
			colorScheme: restOfPreferences.colorScheme ?? null,
			isSnapMode: restOfPreferences.isSnapMode ?? null,
			isWrapMode: restOfPreferences.isWrapMode ?? null,
			isDynamicSizeMode: restOfPreferences.isDynamicSizeMode ?? null,
			isPasteAtCursorMode: restOfPreferences.isPasteAtCursorMode ?? null,
			enhancedA11yMode: restOfPreferences.enhancedA11yMode ?? null,
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

	async uploadTldrFiles(files: File[], onFirstFileUploaded?: (fileId: string) => void) {
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
		const uploadingToastTimeout = setTimeout(() => {
			if (didFinishUploading || this.abortController.signal.aborted) return
			// if it's close to the end, don't show the progress toast
			if (getApproxPercentage() > 50) return
			uploadingToastId = this.toasts?.addToast({
				severity: 'info',
				title: this.getIntl().formatMessage(this.messages.uploadingTldrFiles, {
					total: totalFiles,
					uploaded: uploadedFiles + 1,
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
				clearTimeout(uploadingToastTimeout)
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
				onFirstFileUploaded(res.value.fileId)
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
		const fileId = response.slugs[0]
		const name =
			file.name?.replace(/\.tldr$/, '') ??
			Object.values(snapshot.store).find((d): d is TLDocument => d.typeName === 'document')?.name ??
			''

		return this.createFile({ fileId, name })
	}
}
