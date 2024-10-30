import { useAuth, useUser as useClerkUser } from '@clerk/clerk-react'
import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { assertExists, deleteFromLocalStorage, fetch, getFromLocalStorage } from 'tldraw'
import { TldrawApp } from '../app/TldrawApp'
import { TEMPORARY_FILE_KEY } from '../utils/temporary-files'

const appContext = createContext<TldrawApp | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
	const [app, setApp] = useState(null as TldrawApp | null)
	const auth = useAuth()
	const { user, isLoaded } = useClerkUser()
	const [zeroJwt, setZeroJwt] = useState<string | null>(null)

	useEffect(() => {
		if (!auth.isSignedIn || !user || !isLoaded) {
			return
		}

		auth.getToken().then(async (token) => {
			const res = await fetch(`/api/app/zero-login`, {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})
			if (!res.ok) {
				// todo: handle error
				throw new Error('failed to get zero login token')
			}
			setZeroJwt((await res.json()).jwt)
		})
	})

	if (!auth.isSignedIn || !user || !isLoaded) {
		throw new Error('should have redirected in TlaRootProviders')
	}

	useEffect(() => {
		if (!zeroJwt) {
			return
		}
		let _app: TldrawApp

		// Create the new user
		TldrawApp.create({
			userId: auth.userId,
			fullName: user.fullName || '',
			email: user.emailAddresses[0]?.emailAddress || '',
			avatar: user.imageUrl || '',
			jwt: zeroJwt,
		}).then(({ app }) => {
			const claimTemporaryFileId = getFromLocalStorage(TEMPORARY_FILE_KEY)
			if (claimTemporaryFileId) {
				deleteFromLocalStorage(TEMPORARY_FILE_KEY)
				app.claimTemporaryFile(claimTemporaryFileId)
			}
			_app = app
			setApp(app)
		})

		return () => {
			if (_app) {
				_app.dispose()
			}
		}
	}, [auth.userId, user, zeroJwt])

	if (!app) {
		// We used to show a Loading... here but it was causing too much flickering.
		return null
	}

	return <appContext.Provider value={app}>{children}</appContext.Provider>
}

export function useMaybeApp() {
	return useContext(appContext)
}
export function useApp(): TldrawApp {
	return assertExists(useContext(appContext), 'useApp must be used within AppStateProvider')
}
