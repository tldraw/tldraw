import { useAuth, useUser as useClerkUser } from '@clerk/clerk-react'
import { TldrawAppFileRecordType, TldrawAppUser, tldrawAppSchema } from '@tldraw/dotcom-shared'
import { useSync } from '@tldraw/sync'
import { ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react'
import {
	RecordId,
	assertExists,
	deleteFromLocalStorage,
	getFromLocalStorage,
	inlineBase64AssetStore,
} from 'tldraw'
import { MULTIPLAYER_SERVER } from '../../utils/config'
import { TldrawApp } from '../app/TldrawApp'
import { TlaErrorContent } from '../components/TlaErrorContent/TlaErrorContent'
import { TlaCenteredLayout } from '../layouts/TlaCenteredLayout/TlaCenteredLayout'
import { TlaErrorLayout } from '../layouts/TlaErrorLayout/TlaErrorLayout'
import { TEMPORARY_FILE_KEY } from '../utils/temporary-files'
import { useRaw } from './useRaw'

const appContext = createContext<TldrawApp | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
	const [ready, setReady] = useState(false)
	const [app, setApp] = useState({} as TldrawApp)
	const auth = useAuth()
	const { user, isLoaded } = useClerkUser()
	const raw = useRaw()

	if (!auth.isSignedIn || !user || !isLoaded) {
		throw new Error('should have redirected in TlaRootProviders')
	}

	const store = useSync({
		schema: tldrawAppSchema as any,
		uri: useCallback(async () => {
			const url = new URL(`${MULTIPLAYER_SERVER}/app`)
			const token = await auth.getToken()
			if (!token) {
				throw new Error('no token')
			}
			url.searchParams.set('accessToken', token)
			return url.toString()
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [auth.userId]),
		assets: inlineBase64AssetStore,
	})

	useEffect(() => {
		if (store.status !== 'synced-remote') {
			return
		}
		let _app: TldrawApp
		let _userId: RecordId<TldrawAppUser>

		TldrawApp.create({
			userId: auth.userId,
			fullName: user.fullName || '',
			email: user.emailAddresses[0]?.emailAddress || '',
			avatar: user.imageUrl || '',
			store: store.store as any,
		}).then(({ app, userId }) => {
			const claimTemporaryFileId = getFromLocalStorage(TEMPORARY_FILE_KEY)
			if (claimTemporaryFileId) {
				deleteFromLocalStorage(TEMPORARY_FILE_KEY)
				app.claimTemporaryFile(TldrawAppFileRecordType.createId(claimTemporaryFileId), userId)
			}
			_app = app
			_userId = userId
			setApp(app)
			setReady(true)
		})

		return () => {
			if (_app) {
				_app.dispose()
			}
		}
	}, [store.status, store.store, auth.userId, user])

	if (store.status === 'error') {
		return (
			<TlaErrorLayout>
				<TlaErrorContent error={'no-user-access'} />
			</TlaErrorLayout>
		)
	}

	if (store.status === 'loading' || !ready || !app) {
		return <TlaCenteredLayout>{raw('Loading...')}</TlaCenteredLayout>
	}

	return <appContext.Provider value={app}>{children}</appContext.Provider>
}

export function useMaybeApp() {
	return useContext(appContext)
}
export function useApp(): TldrawApp {
	return assertExists(useContext(appContext), 'useApp must be used within AppStateProvider')
}
