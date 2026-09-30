import { TLCustomServerEvent } from '@tldraw/dotcom-shared'
import { useSync } from '@tldraw/sync'
import {
	ReactNode,
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
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
	omit,
	useEvent,
	useValue,
} from 'tldraw'
import { routes } from '../../../routeDefs'
import { trackEvent } from '../../../utils/analytics'
import { CLIENT_BUILD_TIMESTAMP, MULTIPLAYER_SERVER } from '../../../utils/config'
import { FileLoad, fileLoads } from '../../../utils/fileLoad'
import { markFirstLoad } from '../../../utils/firstLoad'
import { multiplayerAssetStore } from '../../../utils/multiplayerAssetStore'
import { currentApp$, useMaybeApp } from '../../hooks/useAppState'
import { useTldrawCurrentUser } from '../../hooks/useUser'
import {
	endCachedFileVisit,
	isCachedFileVisitLive,
	resolveCachedFileVisit,
} from '../../utils/cachedFileVisit'
import { clearLastVisitedFile, setLastVisitedFile } from '../../utils/local-session-state'

type FileSyncStore = ReturnType<typeof useSync>

const FileSyncStoreContext = createContext<FileSyncStore | null>(null)

export function useFileSyncStore(): FileSyncStore {
	return assertExists(useContext(FileSyncStoreContext), 'TlaFileSyncHost is missing above')
}

const FileLoadContext = createContext<FileLoad | null>(null)

/** This file open's file_load tracker, begun where the open begins: the sync host. */
export function useFileLoad(): FileLoad {
	return assertExists(useContext(FileLoadContext), 'TlaFileSyncHost is missing above')
}

/** Location state key for the `/` redirect from the local cache; holds a `startCachedFileVisit` token. */
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

/**
 * Owns the file room's sync store so it can connect while the signed-in app is still preloading
 * from Zero: the uri only needs the slug, the build timestamp and a Clerk token. Everything that
 * needs the app (the editor, session restore, slurping) mounts below, once it exists.
 */
export function TlaFileSyncHost({ fileSlug, children }: { fileSlug: string; children: ReactNode }) {
	// Once per mount; begin() maps a same-file remount of an unfinished open back to its load.
	const [fileLoad] = useState(() => fileLoads.begin(fileSlug))
	fileLoad.mark('file-started')
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
			// Only connects before sync-connected belong to the load; a later reconnect carrying an id
			// would make the server park and send an echo nobody reads.
			const connectId = fileLoad.nextConnectId()
			if (connectId) url.searchParams.set('loadId', connectId)
			if (userId) {
				url.searchParams.set('accessToken', await getUserToken())
				markFirstLoad('sync-token-fetched')
				fileLoad.mark('sync-token-fetched')
			}
			return url.toString()
		}, [fileSlug, userId, getUserToken, fileLoad]),
		assets,
		users,
		// Register the opt-in `comment` record type so comment records sync through the file room.
		// Must match the server schema (see fileSyncSchema in TLFileDurableObject).
		records: commentSchemaRecords,
		onCustomMessageReceived: useCallback(
			(message: TLCustomServerEvent) => {
				if (message.type === 'first_load_server') {
					fileLoad.setServerTimings(message)
					return
				}
				trackEvent(message.type)
			},
			[fileLoad]
		),
	})

	const navigate = useNavigate()
	const location = useLocation()
	const viaCache = isCachedFileVisitLive(location.state?.[VIA_LAST_FILE_CACHE])
	useEffect(() => {
		if (!viaCache) endCachedFileVisit()
	}, [viaCache])
	const app = useMaybeApp()
	// Only while the flag is set: getMostRecentFileId reads every file_state, so an ungated read
	// would re-render the host on each throttled lastVisitAt write for the whole session.
	const zero = useValue(
		'zero facts for the cached visit',
		() =>
			viaCache && app
				? {
						hasFileState: app.isFileVisitable(fileSlug),
						mostRecentFileId: app.getMostRecentFileId(),
					}
				: null,
		[viaCache, app, fileSlug]
	)
	const visit = viaCache
		? resolveCachedFileVisit({
				status: store.status,
				error: store.status === 'error' ? store.error : undefined,
				appLoaded: !!zero,
				hasFileState: zero?.hasFileState ?? false,
				mostRecentFileId: zero?.mostRecentFileId ?? null,
				fileId: fileSlug,
			})
		: null
	// Primitives, so the effects below do not re-run on every render until the navigation commits.
	const visitKind = visit?.kind ?? null
	const redirectFileId = visit?.kind === 'redirect' ? visit.fileId : null
	// Leaving must not hand the store to the editor (an errored one would throw into the route
	// error page), nor let a late sync write this file into the cache.
	const leaving = visitKind === 'fallback' || visitKind === 'redirect'

	useEffect(() => {
		if (store.status !== 'synced-remote') return
		markFirstLoad('sync-connected')
		fileLoad.mark('sync-connected')
		// Written only once the room accepted us, so the cache never points at a file this account
		// cannot open.
		if (userId && !leaving) setLastVisitedFile(userId, fileSlug)
	}, [store.status, userId, fileSlug, leaving, fileLoad])

	useEffect(() => {
		// The hit rate of the cached redirect: a miss costs a wasted room boot on top of main's path.
		if (visitKind && visitKind !== 'pending') {
			trackEvent('cached-file-visit', { outcome: visitKind })
			fileLoads.noteCachedVisit(visitKind)
		}
		switch (visitKind) {
			case 'fallback':
				clearLastVisitedFile()
				navigate(routes.tlaRoot(), { replace: true })
				return
			case 'redirect':
				navigate(routes.tlaFile(redirectFileId!), {
					replace: true,
					state: omit(location.state, [VIA_LAST_FILE_CACHE]),
				})
				return
			case 'accepted':
				// Drop the flag from history state so a later reload is an ordinary visit. Keep the
				// search: `?d=` is read at mount.
				navigate(
					{ pathname: location.pathname, search: location.search, hash: location.hash },
					{ replace: true, state: omit(location.state, [VIA_LAST_FILE_CACHE]) }
				)
				return
		}
	}, [visitKind, redirectFileId, location, navigate])

	if (leaving) return null

	return (
		<FileLoadContext.Provider value={fileLoad}>
			<FileSyncStoreContext.Provider value={store}>{children}</FileSyncStoreContext.Provider>
		</FileLoadContext.Provider>
	)
}
