import { useAuth, useUser as useClerkUser } from '@clerk/clerk-react'
import {
	createContext,
	ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react'
import { assertExists, atom, TldrawUiDialogsProvider } from 'tldraw'
import { TldrawApp } from '../app/TldrawApp'
import { TlaPickUsernameDialog } from '../components/dialogs/TlaPickUsernameDialog'
import { useTldrawAppUiEvents } from '../utils/app-ui-events'
import {
	extractUsernameFromEmail,
	needsUsernamePicker,
	UserForUsernamePicker,
} from '../utils/email-utils'

const appContext = createContext<TldrawApp | null>(null)

export const isClientTooOld$ = atom('isClientTooOld', false)

interface UsernamePickerState {
	isVisible: boolean
	suggestedUsername: string
	hasBeenShown: boolean
}

export function AppStateProvider({ children }: { children: ReactNode }) {
	const [app, setApp] = useState<TldrawApp | null>(null)
	const [usernamePickerState, setUsernamePickerState] = useState<UsernamePickerState>({
		isVisible: false,
		suggestedUsername: '',
		hasBeenShown: false,
	})
	const auth = useAuth()
	const { user, isLoaded } = useClerkUser()
	const trackEvent = useTldrawAppUiEvents()

	// Memoize user typing to prevent unnecessary re-evaluations
	const typedUser = useMemo((): UserForUsernamePicker | null => {
		if (!user) return null
		return {
			fullName: user.fullName,
			emailAddresses: user.emailAddresses,
		}
	}, [user?.fullName, user?.emailAddresses])

	const handleUsernameSelected = useCallback(
		async (username: string) => {
			if (!app) return

			try {
				await app.updateUser({ name: username })
				setUsernamePickerState((prev) => ({ ...prev, isVisible: false }))
			} catch (error) {
				console.error('Failed to update username:', error)
				setUsernamePickerState((prev) => ({ ...prev, isVisible: false }))

				app.toasts?.addToast({
					severity: 'error',
					title: 'Failed to save username',
					description: 'Your username could not be saved. Please try again in settings.',
					keepOpen: true,
				})
			}
		},
		[app]
	)

	const handleUsernamePickerCancel = useCallback(() => {
		setUsernamePickerState((prev) => ({ ...prev, isVisible: false }))
	}, [])

	useEffect(() => {
		if (!auth.isSignedIn || !typedUser || !isLoaded) return

		let didCancel = false
		let _app: TldrawApp

		const initializeApp = async () => {
			try {
				const token = await auth.getToken()
				if (!token) throw new Error('No authentication token available')
				if (didCancel) return

				const needsUsername = needsUsernamePicker(typedUser)
				let fullName = typedUser.fullName || ''
				let suggestedUsername = ''

				// Prepare username suggestion if needed
				if (needsUsername && typedUser.emailAddresses[0]?.emailAddress) {
					suggestedUsername = extractUsernameFromEmail(typedUser.emailAddresses[0].emailAddress)
					fullName = suggestedUsername
				}

				const { app } = await TldrawApp.create({
					userId: auth.userId,
					fullName,
					email: typedUser.emailAddresses[0]?.emailAddress || '',
					avatar: user?.imageUrl || '',
					getToken: async () => {
						const token = await auth.getToken()
						return token || undefined
					},
					onClientTooOld: () => isClientTooOld$.set(true),
					trackEvent,
				})

				if (didCancel) {
					app.dispose()
					return
				}

				_app = app
				setApp(app)

				// Show username picker if needed and not already shown
				if (needsUsername && !usernamePickerState.hasBeenShown) {
					setUsernamePickerState({
						isVisible: true,
						suggestedUsername,
						hasBeenShown: true,
					})
				}
			} catch (error) {
				if (!didCancel) {
					console.error('Failed to initialize app:', error)
				}
			}
		}

		initializeApp()

		return () => {
			didCancel = true
			_app?.dispose()
		}
	}, [
		auth.userId,
		auth.isSignedIn,
		typedUser,
		isLoaded,
		user?.imageUrl,
		trackEvent,
		usernamePickerState.hasBeenShown,
	])

	// Early return for loading state
	if (!auth.isSignedIn || !user || !isLoaded) {
		throw new Error('should have redirected in TlaRootProviders')
	}

	if (!app) {
		return null
	}

	return (
		<appContext.Provider value={app}>
			{usernamePickerState.isVisible && (
				<TldrawUiDialogsProvider>
					<TlaPickUsernameDialog
						suggestedUsername={usernamePickerState.suggestedUsername}
						onUsernameSelected={handleUsernameSelected}
						onCancel={handleUsernamePickerCancel}
					/>
				</TldrawUiDialogsProvider>
			)}
			{children}
		</appContext.Provider>
	)
}

export function useMaybeApp() {
	return useContext(appContext)
}

export function useApp(): TldrawApp {
	return assertExists(useContext(appContext), 'useApp must be used within AppStateProvider')
}
