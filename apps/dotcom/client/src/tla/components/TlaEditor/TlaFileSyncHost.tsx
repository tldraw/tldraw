import { TLCustomServerEvent } from '@tldraw/dotcom-shared'
import { useSync } from '@tldraw/sync'
import { TLRemoteSyncError, TLSyncErrorCloseEventReason } from '@tldraw/sync-core'
import {
	ReactNode,
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
	TLUserStore,
	UserRecordType,
	assertExists,
	commentSchemaRecords,
	computed,
	createUserId,
	getUserPreferences,
	useEvent,
} from 'tldraw'
import { routes } from '../../../routeDefs'
import { trackEvent } from '../../../utils/analytics'
import { CLIENT_BUILD_TIMESTAMP, MULTIPLAYER_SERVER } from '../../../utils/config'
import {
	getFirstLoadId,
	hasFirstLoadStep,
	markFirstLoad,
	setFirstLoadServerTimings,
} from '../../../utils/firstLoad'
import { multiplayerAssetStore } from '../../../utils/multiplayerAssetStore'
import { currentApp$ } from '../../hooks/useAppState'
import { useTldrawCurrentUser } from '../../hooks/useUser'
import { clearLastVisitedFile, setLastVisitedFile } from '../../utils/local-session-state'

type FileSyncStore = ReturnType<typeof useSync>

const FileSyncStoreContext = createContext<FileSyncStore | null>(null)

export function useFileSyncStore(): FileSyncStore {
	return assertExists(useContext(FileSyncStoreContext), 'TlaFileSyncHost is missing above')
}

/** Set on the `/f/:slug` location state by the `/` redirect that came from the local cache. */
export const VIA_LAST_FILE_CACHE = 'viaLastFileCache'

function createPresenceUserStore(userId: string | undefined): TLUserStore {
	// Signed out, attribute nothing: useSync's default store would stamp the local preferences id,
	// which authorizeFileRecord rejects for a guest session, rolling back note edits and duplicates.
	if (!userId) return { currentUser: computed('currentUser', () => null) }
	return {
		currentUser: computed('currentUser', () => {
			// The socket opens before Zero has the user row. The id must be right from the first
			// frame (the server authorizes records against it); name and color may catch up later.
			const prefs = currentApp$.get()?.tlUser.userPreferences.get()
			const local = getUserPreferences()
			return UserRecordType.create({
				id: createUserId(userId),
				name: prefs?.name ?? local.name ?? '',
				color: prefs?.color ?? local.color ?? '',
			})
		}),
	}
}

function isCachedFileGone(error: unknown) {
	return (
		error instanceof TLRemoteSyncError &&
		(error.reason === TLSyncErrorCloseEventReason.NOT_FOUND ||
			error.reason === TLSyncErrorCloseEventReason.FORBIDDEN)
	)
}

/**
 * Owns the file room's sync store so it can connect while the signed-in app is still preloading
 * from Zero: the uri only needs the slug, the build timestamp and a Clerk token. Everything that
 * needs the app (the editor, session restore, slurping) mounts below, once it exists.
 */
export function TlaFileSyncHost({ fileSlug, children }: { fileSlug: string; children: ReactNode }) {
	const user = useTldrawCurrentUser()
	const userId = user?.id
	const getUserToken = useEvent(async () => {
		return (await user?.getToken()) ?? 'not-logged-in'
	})
	const assets = useMemo(() => {
		return multiplayerAssetStore({ getFileId: () => fileSlug, getToken: getUserToken })
	}, [fileSlug, getUserToken])
	const users = useMemo(() => createPresenceUserStore(userId), [userId])

	const store = useSync({
		uri: useCallback(async () => {
			const url = new URL(`${MULTIPLAYER_SERVER}/app/file/${fileSlug}`)
			url.searchParams.set('v', CLIENT_BUILD_TIMESTAMP)
			// Only the first connect belongs to the load; a reconnect carrying the id would make the
			// server park and send an echo the client already has, and tag its timers as first-load.
			if (!hasFirstLoadStep('sync-connected')) url.searchParams.set('loadId', getFirstLoadId())
			if (userId) {
				url.searchParams.set('accessToken', await getUserToken())
				markFirstLoad('sync-token-fetched')
			}
			return url.toString()
		}, [fileSlug, userId, getUserToken]),
		assets,
		users,
		// Register the opt-in `comment` record type so comment records sync through the file room.
		// Must match the server schema (see fileSyncSchema in TLFileDurableObject).
		records: commentSchemaRecords,
		onCustomMessageReceived: useCallback((message: TLCustomServerEvent) => {
			if (message.type === 'first_load_server') {
				setFirstLoadServerTimings(message)
				return
			}
			trackEvent(message.type)
		}, []),
	})

	const hasSynced = useRef(false)
	useEffect(() => {
		if (store.status !== 'synced-remote') return
		hasSynced.current = true
		markFirstLoad('sync-connected')
		// Written only once the room accepted us, so the cache never points at a file this account
		// cannot open.
		if (userId) setLastVisitedFile(userId, fileSlug)
	}, [store.status, userId, fileSlug])

	const navigate = useNavigate()
	const location = useLocation()
	// A cached id can be stale (file deleted, sharing revoked). Fall back to the Zero-derived
	// choice on `/` without ever handing the errored store to the editor, which would throw it into
	// the route error page. Only for a room that never accepted us: the flag lives in history
	// state for as long as the user stays on this file, and losing access mid-session must show
	// the error page like any other visit would. A reload after the file is gone falls back too.
	const fallBackToRoot =
		!!location.state?.[VIA_LAST_FILE_CACHE] &&
		!hasSynced.current &&
		store.status === 'error' &&
		isCachedFileGone(store.error)
	useEffect(() => {
		if (!fallBackToRoot) return
		clearLastVisitedFile()
		navigate(routes.tlaRoot(), { replace: true })
	}, [fallBackToRoot, navigate])

	if (fallBackToRoot) return null

	return <FileSyncStoreContext.Provider value={store}>{children}</FileSyncStoreContext.Provider>
}
