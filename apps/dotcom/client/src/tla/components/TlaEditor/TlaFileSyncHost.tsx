import { TLCustomServerEvent } from '@tldraw/dotcom-shared'
import { useSync } from '@tldraw/sync'
import { TLRemoteSyncError, TLSyncErrorCloseEventReason } from '@tldraw/sync-core'
import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
	TLUserStore,
	UserRecordType,
	assertExists,
	commentSchemaRecords,
	computed,
	createUserId,
	getUserPreferences,
	omit,
	useEvent,
	useValue,
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
import { currentApp$, useMaybeApp } from '../../hooks/useAppState'
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
			const prefs = currentApp$.get()?.tlUser.userPreferences.get() ?? getUserPreferences()
			return UserRecordType.create({
				id: createUserId(userId),
				name: prefs.name ?? '',
				color: prefs.color ?? '',
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

	useEffect(() => {
		if (store.status !== 'synced-remote') return
		markFirstLoad('sync-connected')
		// Written only once the room accepted us, so the cache never points at a file this account
		// cannot open.
		if (userId) setLastVisitedFile(userId, fileSlug)
	}, [store.status, userId, fileSlug])

	const navigate = useNavigate()
	const location = useLocation()
	const viaCache = !!location.state?.[VIA_LAST_FILE_CACHE]
	const app = useMaybeApp()
	// A cache hit means a prior visit, so no file_state means the file was forgotten elsewhere.
	// The room would still admit a link-shared file and onFileEnter would re-add it.
	const forgotten = useValue('cached file forgotten', () => !!app && !app.getFileState(fileSlug), [
		app,
		fileSlug,
	])
	const rejected = store.status === 'error' && isCachedFileGone(store.error)
	// A stale cached id falls back to the Zero-derived choice on `/`, without handing the errored
	// store to the editor (it would throw into the route error page).
	const fallBackToRoot = viaCache && (rejected || forgotten)
	useEffect(() => {
		if (!fallBackToRoot) return
		clearLastVisitedFile()
		navigate(routes.tlaRoot(), { replace: true })
	}, [fallBackToRoot, navigate])

	// The flag lives in history state, so left in place a reload after access was revoked would
	// bounce home instead of showing the error page. Keep the search: `?d=` is read at mount.
	const accepted = !fallBackToRoot && store.status === 'synced-remote' && !!app
	useEffect(() => {
		if (!viaCache || !accepted) return
		navigate(
			{ pathname: location.pathname, search: location.search, hash: location.hash },
			{ replace: true, state: omit(location.state, [VIA_LAST_FILE_CACHE]) }
		)
	}, [viaCache, accepted, location, navigate])

	if (fallBackToRoot) return null

	return <FileSyncStoreContext.Provider value={store}>{children}</FileSyncStoreContext.Provider>
}
