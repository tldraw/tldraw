import { useAuth, useUser as useClerkUser } from '@clerk/clerk-react'
import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { assertExists, deleteFromLocalStorage, getFromLocalStorage } from 'tldraw'
import { TldrawApp } from '../app/TldrawApp'
import { useIntl } from '../utils/i18n'
import { TEMPORARY_FILE_KEY } from '../utils/temporary-files'

const appContext = createContext<TldrawApp | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
	const [app, setApp] = useState(null as TldrawApp | null)
	const intl = useIntl()
	const auth = useAuth()
	const { user, isLoaded } = useClerkUser()

	useEffect(() => {
		if (!auth.isSignedIn || !user || !isLoaded) {
			return
		}
	})

	if (!auth.isSignedIn || !user || !isLoaded) {
		throw new Error('should have redirected in TlaRootProviders')
	}

	useEffect(() => {
		let _app: TldrawApp

		// Create the new user
		let didCancel = false
		auth.getToken().then((token) => {
			if (!token) throw new Error('no token')
			TldrawApp.create({
				userId: auth.userId,
				fullName: user.fullName || '',
				email: user.emailAddresses[0]?.emailAddress || '',
				avatar: user.imageUrl || '',
				getToken: async () => await auth.getToken(),
				intl,
			}).then(({ app }) => {
				if (didCancel) {
					app.dispose()
					return
				}
				const claimTemporaryFileId = getFromLocalStorage(TEMPORARY_FILE_KEY)
				if (claimTemporaryFileId) {
					deleteFromLocalStorage(TEMPORARY_FILE_KEY)
					app.claimTemporaryFile(claimTemporaryFileId)
				}
				_app = app
				setApp(app)
			})
		})

		return () => {
			didCancel = true
			if (_app) {
				_app.dispose()
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [auth.userId, user])

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
