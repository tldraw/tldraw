import { QueryResultType, Zero } from '@rocicorp/zero'
import { captureException } from '@sentry/react'
import {
	AcceptInviteResponseBody,
	CreateFilesResponseBody,
	CreateSnapshotRequestBody,
	FILE_PREFIX,
	LOCAL_FILE_PREFIX,
	MAX_NUMBER_OF_FILES,
	ROOM_PREFIX,
	TlaFile,
	WELCOME_CREATE_SOURCE,
	TlaFileState,
	TlaFileStatePartial,
	TlaFlags,
	TlaGroupFile,
	TlaMutators,
	TlaSchema,
	TlaUser,
	UserPreferencesKeys,
	ZErrorCode,
	Z_PROTOCOL_VERSION,
	ZeroContext,
	can,
	createMutators,
	parseFlags,
	queries,
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
	sleep,
	sortByIndex,
	sortByMaybeIndex,
	structuredClone,
	throttle,
	uniqueId,
} from '@tldraw/utils'
import { useNavigate } from 'react-router-dom'
import {
	Atom,
	Signal,
	TLDocument,
	TLSessionStateSnapshot,
	TLUiToastsContextType,
	TLUserPreferences,
	assertExists,
	atom,
	computed,
	createTLCurrentUser,
	createTLSchema,
	dataUrlToFile,
	defaultUserPreferences,
	getUserPreferences,
	objectMapFromEntries,
	objectMapKeys,
	parseTldrawJsonFile,
	react,
	transact,
} from 'tldraw'
import { routes } from '../../routeDefs'
import { trackEvent } from '../../utils/analytics'
import { MULTIPLAYER_SERVER, ZERO_SERVER } from '../../utils/config'
import { multiplayerAssetStore } from '../../utils/multiplayerAssetStore'
import { getScratchPersistenceKey } from '../../utils/scratch-persistence-key'
import { TLAppUiContextType } from '../utils/app-ui-events'
import { getDateFormat } from '../utils/dates'
import { FeatureFlags } from '../utils/FeatureFlagPoller'
import { createIntl, defineMessages, setupCreateIntl } from '../utils/i18n'
import { updateLocalSessionState } from '../utils/local-session-state'
import { Zero as ZeroPolyfill } from './zero-polyfill'

export const TLDR_FILE_ENDPOINT = `/api/app/tldr`
export const PUBLISH_ENDPOINT = `/api/app/publish`

let appId = 0

export function shouldUseProperZero(
	flags: FeatureFlags,
	email?: string | null
): { value: boolean; reason: string } {
	if (flags.zero_kill_switch?.enabled) {
		return { value: false, reason: 'kill switch active' }
	}
	if (typeof navigator !== 'undefined' && navigator.webdriver) {
		return { value: false, reason: 'automated testing' }
	}
	const localOverride = getFromLocalStorage('useProperZero')
	if (localOverride !== null) {
		return { value: localOverride === 'true', reason: 'localStorage override' }
	}
	if (email?.endsWith('@tldraw.com')) {
		return { value: true, reason: '@tldraw.com email' }
	}
	const flagEnabled = flags.zero_enabled?.enabled ?? false
	return { value: flagEnabled, reason: 'server feature flag' }
}

// @ts-expect-error — dev escape hatch, call window.zero() in console to toggle
window.zero = () => {
	const current = getFromLocalStorage('useProperZero') === 'true'
	setInLocalStorage('useProperZero', String(!current))
	location.reload()
}

/**
 * The timestamp used to rank a file by recency. Prefers the user's most recent activity on the
 * file — last visit, then last edit, then first visit — and falls back to when the file was
 * created. This is the single source of truth for "how recent is this file" across recent-file
 * lists and most-recent-file navigation, so the ordering stays consistent everywhere.
 */
export function getFileRecencyDate(
	state: TlaFileState | undefined,
	file: TlaFile | undefined
): number {
	return state?.lastVisitAt ?? state?.lastEditAt ?? state?.firstVisitAt ?? file?.createdAt ?? 0
}

export class TldrawApp {
	config = {
		maxNumberOfFiles: MAX_NUMBER_OF_FILES,
	}

	readonly id = appId++

	readonly z: Zero<TlaSchema, TlaMutators, ZeroContext>

	private readonly user$: Signal<TlaUser | undefined>
	// These signal types are derived from the query definitions in dotcom-shared rather than
	// hand-written, so the shape (and the nullability of `.one()` joins like `file`) stays in
	// sync with the queries automatically. A previous hand-written annotation claimed `file` was
	// always present, which hid a production crash when a `.one()` join resolved to undefined.
	private readonly fileStates$: Signal<QueryResultType<typeof queries.fileStates>>
	private readonly workspaceMemberships$: Signal<
		QueryResultType<typeof queries.workspaceMemberships>
	>

	private readonly useProperZero: boolean
	private readonly abortController = new AbortController()
	readonly disposables: (() => void)[] = [() => this.abortController.abort(), () => this.z.close()]
	private getToken: () => Promise<string | undefined>

	changes: Map<Atom<any, unknown>, any> = new Map()
	changesFlushed = null as null | ReturnType<typeof promiseWithResolve>

	// Track new room creation timestamps and sources
	private newRoomCreationStartTimes: Map<string, { startTime: number; source: string }> = new Map()

	private signalizeQuery<TReturn>(name: string, query: any): Signal<TReturn> {
		// fail if closed?
		const view = this.z.materialize(query) as unknown as {
			data: TReturn
			addListener(cb: (data: TReturn) => void): () => void
			destroy(): void
		}
		const val$ = atom(name, view.data, { isEqual })
		view.addListener((res) => {
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
	navigate: ReturnType<typeof useNavigate>

	private constructor(
		public readonly userId: string,
		initialToken: string | undefined,
		getToken: () => Promise<string | undefined>,
		onClientTooOld: () => void,
		trackEvent: TLAppUiContextType,
		navigate: ReturnType<typeof useNavigate>,
		flags: FeatureFlags,
		email?: string | null
	) {
		this.navigate = navigate
		this.trackEvent = trackEvent
		this.getToken = getToken
		const sessionId = uniqueId()
		const { value: properZero, reason } = shouldUseProperZero(flags, email)
		this.useProperZero = properZero
		// eslint-disable-next-line no-console
		console.log(`[Zero] Using ${properZero ? 'proper Zero' : 'ZeroPolyfill'} (${reason})`)
		if (properZero) {
			const z = new Zero<TlaSchema, TlaMutators, ZeroContext>({
				auth: initialToken,
				userID: userId,
				schema: zeroSchema,
				cacheURL: ZERO_SERVER,
				mutators: createMutators(userId),
				context: { userId } satisfies ZeroContext,
				onUpdateNeeded(reason) {
					console.error('update needed', reason)
					onClientTooOld()
				},
				kvStore: window.navigator.webdriver ? 'mem' : 'idb',
			})
			this.z = z
			const refreshToken = () =>
				getToken().then((token) => {
					if (token) {
						z.connection.connect({ auth: token })
						return true
					}
					return false
				})
			// Proactively refresh auth token before Clerk's 60s expiry.
			// In Zero 0.26+, this sends an updateAuth message without reconnecting.
			const TOKEN_REFRESH_INTERVAL = 50_000
			const refreshInterval = setInterval(() => {
				refreshToken().catch((err) => {
					console.error('Failed to proactively refresh auth token:', err)
				})
			}, TOKEN_REFRESH_INTERVAL)
			this.disposables.push(() => clearInterval(refreshInterval))
			// Set up token refresh on auth errors with backoff
			let authRetryCount = 0
			const MAX_AUTH_RETRIES = 5
			const unsubscribe = z.connection.state.subscribe((state) => {
				if (state.name === 'needs-auth') {
					if (authRetryCount >= MAX_AUTH_RETRIES) {
						console.error(`Auth retry limit reached (${MAX_AUTH_RETRIES}), giving up`)
						captureException(new Error('Auth retry limit reached'))
						return
					}
					const delay = Math.min(1000 * Math.pow(2, authRetryCount), 30_000)
					authRetryCount++
					setTimeout(() => {
						refreshToken()
							.then((didRefresh) => {
								if (didRefresh) authRetryCount = 0
							})
							.catch((err) => {
								console.error('Failed to refresh auth token:', err)
								captureException(err)
							})
					}, delay)
				}
			})
			this.disposables.push(unsubscribe)
		} else {
			this.z = new ZeroPolyfill({
				userId,
				getUri: async () => {
					const params = new URLSearchParams({
						sessionId,
						protocolVersion: String(Z_PROTOCOL_VERSION),
					})
					const token = await getToken()
					params.set('accessToken', token || 'no-token-found')
					return `${MULTIPLAYER_SERVER}/app/${userId}/connect?${params}`
				},
				onMutationRejected: this.showMutationRejectionToast,
				onClientTooOld: () => onClientTooOld(),
				trackEvent,
			}) as unknown as Zero<TlaSchema, TlaMutators, ZeroContext>
		}

		this.user$ = this.signalizeQuery('user signal', this.userQuery())
		this.fileStates$ = this.signalizeQuery('file states signal', this.fileStateQuery())
		this.workspaceMemberships$ = this.signalizeQuery(
			'workspace memberships signal',
			this.workspaceMembershipsQuery()
		)
	}

	private userQuery() {
		return queries.user()
	}

	private fileStateQuery() {
		return queries.fileStates()
	}

	private workspaceMembershipsQuery() {
		return queries.workspaceMemberships()
	}

	async preload() {
		if (this.useProperZero) {
			// Ensure user exists in DB before Zero can query
			const token = await this.getToken()
			if (!token) {
				throw new Error('No auth token available for init')
			} else {
				const res = await fetch(`/api/app/${this.userId}/init`, {
					method: 'POST',
					headers: { Authorization: `Bearer ${token}` },
				})
				if (!res.ok) console.error(`Init failed: ${res.status}`)
			}
		}
		await this.z.preload(this.userQuery()).complete
		await this.changesFlushed
		await new Promise((resolve) => {
			let unlisten = () => {}
			unlisten = react('wait for user', () => this.user$.get() && resolve(unlisten()))
		})
		await Promise.all([
			this.z.preload(this.fileStateQuery()).complete,
			this.z.preload(this.workspaceMembershipsQuery()).complete,
		])
	}

	messages = defineMessages({
		max_workspaces_reached: {
			defaultMessage:
				'You have reached the maximum number of workspaces. You need to delete old workspaces before creating new ones.',
		},
		// the name of a workspace's seeded first (welcome) file
		new_workspace_file_name: { defaultMessage: 'Welcome to your workspace' },
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
		return new Set(parseFlags(user.flags)) as Set<TlaFlags>
	}

	hasFlag(flag: TlaFlags) {
		return this.getUserFlags().has(flag)
	}

	/**
	 * Check if the user has been migrated to the new workspaces-based data model.
	 * Users with the 'groups_backend' flag use group_file for access control and pinning.
	 * Users without the flag use the legacy file_state-based approach.
	 */
	isWorkspacesMigrated() {
		return this.hasFlag('groups_backend')
	}

	/**
	 * Get the user's home workspace ID.
	 * For migrated users, this is used to store shared files and pinned files.
	 * The home workspace ID is the same as the user ID.
	 */
	getHomeWorkspaceId() {
		return this.userId
	}

	@computed({ isEqual })
	getWorkspaceMemberships() {
		return this.workspaceMemberships$.get().slice(0).sort(sortByIndex)
	}

	getWorkspaceMembership(workspaceId: string) {
		return this.workspaceMemberships$.get().find((g) => g.groupId === workspaceId)
	}

	getWorkspaceFilesSorted(workspaceId: string) {
		const membership = this.getWorkspaceMembership(workspaceId)
		if (!membership) return []

		// Decide which of the membership's group_file rows actually belong in this list.
		// A file owned by this workspace always belongs. A non-home workspace lists only the
		// files it owns. The home workspace additionally lists legacy files (no owning group)
		// and "guest files" — shared files the user opened that are owned by a workspace they
		// are NOT a member of. It must NOT list a file owned by a workspace the user IS a
		// member of: that's a mislinked row (a guest file whose workspace was later joined, or
		// a workspace's welcome file mirrored during the create-workspace race), and opening it
		// from home would bounce the user into that workspace. Guarding here keeps such rows out
		// of the list even before they're cleaned up.
		const homeWorkspaceId = this.getHomeWorkspaceId()
		const groupFiles = membership.groupFiles.filter((f): f is TlaGroupFile & { file: TlaFile } => {
			// A group_file row can outlive (or arrive before) its file: the file may be deleted,
			// not yet synced, or filtered out server-side because the user can no longer read it.
			// The `file` relationship is a nullable Zero `.one()`, so guard before dereferencing.
			// The type predicate narrows `file` to non-undefined for the rest of the function.
			if (!f.file) return false
			const owningGroupId = f.file.owningGroupId
			if (owningGroupId === workspaceId) return true
			if (workspaceId !== homeWorkspaceId) return false
			return owningGroupId == null || !this.getWorkspaceMembership(owningGroupId)
		})

		const pinned = groupFiles.filter((f) => f.index !== null)
		const unpinned = groupFiles.filter((f) => f.index === null)

		const lastOrdering = this.lastWorkspaceFileOrderings.get(workspaceId)
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
				date: getFileRecencyDate(state, file.file),
			})
		}

		// Sort by date (most recent first) but only for new ordering
		newOrdering.sort((a, b) => b.date - a.date)

		const nextOrdering = [...newOrdering, ...retainedOrdering]
		// Store the ordering for next time
		this.lastWorkspaceFileOrderings.set(workspaceId, nextOrdering)

		// Return the actual file objects in the stable order
		return pinned
			.map((f) => ({ fileId: f.fileId, isPinned: f.index !== null, date: f.file.updatedAt }))
			.concat(nextOrdering.map((f) => ({ fileId: f.fileId, isPinned: false, date: f.date })))
	}

	// Clear workspace file ordering to refresh on expand (like recent files on page reload)
	clearWorkspaceFileOrdering(workspaceId: string) {
		this.lastWorkspaceFileOrderings.delete(workspaceId)
	}

	tlUser = createTLCurrentUser({
		userPreferences: computed('user prefs', () => {
			const user = this.getUser()
			return {
				...(Object.fromEntries(
					UserPreferencesKeys.map((key) => [key, user[key]])
				) as unknown as TLUserPreferences),
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

	// Store stable workspace file ordering for each workspace to prevent jumping when files are edited
	lastWorkspaceFileOrderings = new Map<
		string,
		Array<{
			fileId: TlaFile['id']
			date: number
		}>
	>()

	@computed({ isEqual })
	getMyFiles() {
		if (this.isWorkspacesMigrated()) {
			return this.getWorkspaceFilesSorted(this.getHomeWorkspaceId())
		}
		const myFiles = objectMapFromEntries(this.getUserOwnFiles().map((f) => [f.id, f]))
		const myStates = objectMapFromEntries(this.getUserFileStates().map((f) => [f.fileId, f]))

		const myFileIds = new Set<string>([...objectMapKeys(myFiles), ...objectMapKeys(myStates)])
		const myWorkspaceMemberships = this.getWorkspaceMemberships()

		const nextRecentFileOrdering: {
			fileId: TlaFile['id']
			isPinned: boolean
			date: number
		}[] = []

		for (const fileId of myFileIds) {
			const file = myFiles[fileId]
			let state: (typeof myStates)[string] | undefined = myStates[fileId]
			if (!file) continue
			if (file.isDeleted) continue

			if (!state && !file.isDeleted && file.ownerId === this.userId) {
				state = this.fileStates$.get().find((fs) => fs.fileId === fileId)
			}
			if (!state) {
				// if the file is deleted, we don't want to show it in the recent files
				continue
			}

			// if the file is in a workspace we have access to, we don't want to show it in my workspace
			if (myWorkspaceMemberships.some((g) => g.groupFiles.some((gf) => gf.fileId === fileId))) {
				continue
			}

			const existing = this.lastRecentFileOrdering?.find((f) => f.fileId === fileId)
			const isPinned = state.isPinned ?? false

			if (existing && existing.isPinned === isPinned) {
				// Preserve existing entry to maintain ordering
				nextRecentFileOrdering.push(existing)
				continue
			}

			// For new entries or pinned status changes
			const newEntry = {
				fileId,
				isPinned,
				date: getFileRecencyDate(state, file),
			}

			// If this was previously unpinned and we have existing ordering,
			// preserve its position in the unpinned section to avoid real-time reordering
			if (!isPinned && existing && !existing.isPinned) {
				// Keep the old date to preserve ordering in "My workspace"
				newEntry.date = existing.date
			}

			nextRecentFileOrdering.push(newEntry)
		}

		// separate pinned and unpinned files
		const pinnedFiles = nextRecentFileOrdering.filter((f) => f.isPinned)
		const unpinnedFiles = nextRecentFileOrdering.filter((f) => !f.isPinned)

		// sort pinned files by their pinnedIndex
		pinnedFiles.sort((a, b) => {
			// If neither has an index, sort by date (fallback)
			return b.date - a.date
		})

		// sort unpinned files by date with most recent first
		unpinnedFiles.sort((a, b) => b.date - a.date)

		// combine: pinned files first, then unpinned
		const sortedFiles = [...pinnedFiles, ...unpinnedFiles]

		// stash the ordering for next time
		this.lastRecentFileOrdering = sortedFiles

		return sortedFiles
	}

	/**
	 * The id of the user's most recently visited file, or null if they have none.
	 *
	 * Used to land the user on the file they last had open: across all workspaces when returning to
	 * the root URL, or within a single workspace when switching to it. Recency comes from
	 * `file_state`, which is synced per user, so the result follows the user across devices and
	 * sessions. Files the user can no longer access (deleted, moved away, or revoked) drop out of
	 * `file_state` sync or come back without a `file` relation, so they're skipped and the next most
	 * recent available file wins.
	 *
	 * When the user has no visited files in scope, fall back to the most recent file in their home
	 * workspace (root URL) or the top of the workspace's file list (workspace scope) — this covers
	 * files the user has but has never opened on this account.
	 *
	 * @param workspaceId - When provided, only files visible in that workspace are considered.
	 */
	getMostRecentFileId(workspaceId?: string): string | null {
		// Files in scope, ordered pinned-first then by recency. Used both to scope the recency
		// search and as the fallback when the user has visited none of these files.
		const scopedFiles = workspaceId ? this.getWorkspaceFilesSorted(workspaceId) : this.getMyFiles()
		const fileIdsInScope = workspaceId ? new Set(scopedFiles.map((f) => f.fileId)) : null

		let mostRecent: { fileId: string; date: number } | null = null
		for (const state of this.getUserFileStates()) {
			if (fileIdsInScope && !fileIdsInScope.has(state.fileId)) continue
			if (!state.file || state.file.isDeleted) continue
			const date = getFileRecencyDate(state, state.file)
			if (!mostRecent || date > mostRecent.date) mostRecent = { fileId: state.fileId, date }
		}

		return mostRecent?.fileId ?? scopedFiles[0]?.fileId ?? null
	}

	private canCreateNewFile(workspaceId: string) {
		if (this.isWorkspacesMigrated()) {
			// Count only files the workspace actually owns — not guest files (shared files the
			// user opened) or mislinked rows that getWorkspaceFilesSorted hides. Counting those
			// would let the limit fire on files the user can neither see nor remove. For migrated
			// users createFile runs no server-side file-limit check, so this is the only gate;
			// scoping it to owned files keeps it to what the user can actually manage.
			const membership = this.getWorkspaceMembership(workspaceId)
			if (!membership) return true
			const nonDeletedCount = membership.groupFiles.filter(
				(gf) => gf.file && !gf.file.isDeleted && gf.file.owningGroupId === workspaceId
			).length
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

	isPinned(fileId: string, workspaceId: string) {
		if (this.isWorkspacesMigrated()) {
			return this.getWorkspaceFilesSorted(workspaceId).some(
				(f) => f.fileId === fileId && f.isPinned
			)
		}
		return this.getFileState(fileId)?.isPinned ?? false
	}

	// A workspace's welcome file is seeded once, when the workspace is created. Its
	// `createWorkspace` mutation lands before the file does, so the workspace briefly appears
	// empty; this single-flights the seed per workspace so a double-submit (or any concurrent
	// caller) shares one creation and all receive its result, rather than creating duplicates.
	// Cleared once settled.
	private readonly workspaceWelcomeFileSeeds = new Map<
		string,
		Promise<Result<{ fileId: string }, 'max number of files reached' | 'mutation rejected'>>
	>()

	/**
	 * Seed a newly-created workspace's welcome file: a named file whose content the sync worker
	 * resolves from the welcome template (or a committed default). Called once at workspace
	 * creation — not on later empty opens, which get a blank file (see useSwitchToWorkspace) —
	 * and single-flighted so a double-submit shares the same creation.
	 */
	createWorkspaceWelcomeFile(
		workspaceId: string
	): Promise<Result<{ fileId: string }, 'max number of files reached' | 'mutation rejected'>> {
		const inFlight = this.workspaceWelcomeFileSeeds.get(workspaceId)
		if (inFlight) return inFlight

		const seed = this.createFile({
			workspaceId,
			name: this.getIntl().formatMessage(this.messages.new_workspace_file_name),
			createSource: WELCOME_CREATE_SOURCE,
		})
		this.workspaceWelcomeFileSeeds.set(workspaceId, seed)
		seed.finally(() => {
			if (this.workspaceWelcomeFileSeeds.get(workspaceId) === seed) {
				this.workspaceWelcomeFileSeeds.delete(workspaceId)
			}
		})
		return seed
	}

	/**
	 * The in-flight welcome-file seed for a workspace, if one is still creating. The empty-workspace
	 * open path uses this to await a just-created workspace's welcome file rather than racing it with
	 * a duplicate blank file. Returns undefined once the seed settles (or if none was started).
	 */
	getPendingWorkspaceWelcomeFile(workspaceId: string) {
		return this.workspaceWelcomeFileSeeds.get(workspaceId)
	}

	async createFile({
		fileId = uniqueId(),
		workspaceId = this.getHomeWorkspaceId(),
		name = this.getFallbackFileName(Date.now()),
		createSource = null,
	}: {
		fileId?: string
		workspaceId?: string
		name?: string
		createSource?: string | null
	} = {}): Promise<
		Result<{ fileId: string }, 'max number of files reached' | 'mutation rejected'>
	> {
		if (!this.canCreateNewFile(workspaceId)) {
			this.showMaxFilesToast()
			return Result.err('max number of files reached')
		}

		this.storeNewRoomCreationTracking(fileId, createSource, Date.now())
		try {
			await this.z.mutate.createFile({ fileId, workspaceId, name, createSource, time: Date.now() })
				.client
		} catch (e) {
			this.showMutationRejectionToast((e as Error).message as ZErrorCode)
			return Result.err('mutation rejected')
		}

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
		} else if (createSource === WELCOME_CREATE_SOURCE) {
			analyticsSource = 'welcome'
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
		if (this.isWorkspacesMigrated()) {
			return (
				this.getWorkspaceMemberships()
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
		if (file.owningGroupId) {
			const role = this.getWorkspaceMembership(file.owningGroupId)?.role
			return can(role, 'accessFiles')
		}
		return false
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
	 */
	async deleteOrForgetFile(fileId: string, workspaceId: string = this.getHomeWorkspaceId()) {
		// Optimistic update, remove file and file states
		await this.z.mutate.removeFileFromWorkspace({ fileId, workspaceId }).client
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
		const file = this.getFile(fileId)
		if (!file || file.isDeleted) return
		this.z.mutate.file_state.update({ ...partial, fileId, userId: this.userId })
	}

	updateFile(fileId: string, partial: Partial<TlaFile>) {
		this.z.mutate.file.update({ id: fileId, ...partial })
	}

	async onFileEnter(fileId: string) {
		this.z.mutate.onEnterFile({ fileId, time: Date.now() })
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
		email?: string | null
		flags: FeatureFlags
		getToken(): Promise<string | undefined>
		onClientTooOld(): void
		trackEvent: TLAppUiContextType
		navigate: ReturnType<typeof useNavigate>
	}) {
		// This is an issue: we may have a user record but not in the store.
		// Could be just old accounts since before the server had a version
		// of the store... but we should probably identify that better.

		const { id: _id, name: _name, color, ...restOfPreferences } = getUserPreferences()
		// Get initial token before creating Zero instance
		const initialToken = await opts.getToken()
		const app = new TldrawApp(
			opts.userId,
			initialToken,
			opts.getToken,
			opts.onClientTooOld,
			opts.trackEvent,
			opts.navigate,
			opts.flags,
			opts.email
		)
		// @ts-expect-error
		window.app = app
		await app.preload()
		const user = app.getUser()
		if (user.color === '___INIT___') {
			app.updateUser({
				color: color ?? defaultUserPreferences.color,
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
				isZoomDirectionInverted: restOfPreferences.isZoomDirectionInverted ?? null,
			})

			opts.trackEvent('create-user', { source: 'app' })
			updateLocalSessionState((state) => ({ ...state, shouldShowWelcomeDialog: true }))
		}
		return { app, userId: user.id }
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

	async uploadTldrFiles(
		files: File[],
		onFirstFileUploaded?: (fileId: string) => void,
		workspaceId?: string,
		onUploadError?: () => void
	) {
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
			const res = await this.uploadTldrFile(
				f,
				(bytes) => {
					bytesUploaded += bytes
					updateProgress()
				},
				workspaceId
			).catch((e) => Result.err(e))
			if (!res.ok) {
				clearTimeout(uploadingToastTimeout)
				if (uploadingToastId) this.toasts?.removeToast(uploadingToastId)
				this.toasts?.addToast({
					severity: 'error',
					title: this.getIntl().formatMessage(this.messages.unknown_error),
					keepOpen: true,
				})
				console.error(res.error)
				onUploadError?.()
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
		onProgress?: (bytesUploadedSinceLastProgressUpdate: number) => void,
		workspaceId?: string
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

		return this.createFile({ fileId, name, workspaceId })
	}

	sidebarState = atom('sidebar state', {
		renameState: null as null | {
			fileId: string
			workspaceId: string
		},
		// The current sidebar file-search query. Empty string means no filter.
		searchQuery: '',
	})

	/** Returns false when there is no invite link to copy yet (e.g. right after creation). */
	copyWorkspaceInvite(workspaceId: string, showToast = true): boolean {
		// The home workspace can't be invited to.
		if (workspaceId === this.getHomeWorkspaceId()) return false
		const group = this.getWorkspaceMembership(workspaceId)?.group
		if (!group?.inviteSecret) return false

		const inviteText = `${location.origin}/invite/${group.inviteSecret}`
		navigator.clipboard.writeText(inviteText)

		if (showToast) {
			this.toasts?.addToast({
				id: 'copied-invite-link',
				title: 'Copied invite link',
			})
		}

		this.trackEvent('copy-share-link', { source: 'sidebar' })
		return true
	}

	async acceptWorkspaceInvite(inviteSecret: string) {
		const response = await fetch(`/api/app/invite/${inviteSecret}/accept`, {
			method: 'POST',
		})

		const payload = (await response.json()) as AcceptInviteResponseBody

		if (payload.error || !response.ok) {
			this.toasts?.addToast({
				severity: 'error',
				title: 'Error accepting invite',
				description: payload.message,
			})
			this.navigate(routes.tlaRoot())
			return
		}

		this.trackEvent('accept-workspace-invite', { source: 'sidebar' })

		// wait for the workspace to appear in the store, but not forever
		let attempts = 0
		while (!this.getWorkspaceMembership(payload.workspaceId)) {
			if (attempts++ > 100) {
				this.toasts?.addToast({
					severity: 'error',
					title: 'Error accepting invite',
					description: 'Please try again.',
				})
				this.navigate(routes.tlaRoot())
				return
			}
			await sleep(100)
		}

		// Clear any existing ordering for this new workspace to get fresh ordering
		this.lastWorkspaceFileOrderings.delete(payload.workspaceId)

		if (!this.navigateToWorkspaceFiles(payload.workspaceId)) {
			this.navigate(routes.tlaRoot())
		}
	}

	navigateToWorkspaceFiles(workspaceId: string, opts: { replace?: boolean } = {}) {
		const files = this.getWorkspaceFilesSorted(workspaceId)

		if (!files.length) {
			return false
		}

		this.navigate(routes.tlaFile(files[0]!.fileId), opts)
		return true
	}
}
