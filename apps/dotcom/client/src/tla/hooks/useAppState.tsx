import { useAuth, useUser as useClerkUser } from '@clerk/clerk-react'
import { captureException } from '@sentry/react'
import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { assertExists, atom } from 'tldraw'
import { ErrorPage } from '../../components/ErrorPage/ErrorPage'
import { TldrawApp } from '../app/TldrawApp'
import { useTldrawAppUiEvents } from '../utils/app-ui-events'
import {
	DEFAULT_FLAGS,
	FeatureFlags,
	fetchFeatureFlags,
	wasAuthenticated,
} from '../utils/FeatureFlagPoller'

const appContext = createContext<TldrawApp | null>(null)

export const isClientTooOld$ = atom('isClientTooOld', false)

const APP_LOAD_ERROR_MESSAGES = {
	header: 'Something went wrong',
	para1: 'Please try refreshing the page. Still having trouble? Let us know at hello@tldraw.com.',
	cta: 'Refresh',
}

export function AppStateProvider({ children }: { children: ReactNode }) {
	const [app, setApp] = useState(null as TldrawApp | null)
	const [error, setError] = useState<unknown>(null)
	const auth = useAuth()
	const { user, isLoaded } = useClerkUser()

	useEffect(() => {
		if (!auth.isSignedIn || !user || !isLoaded) {
			return
		}
	})
	const trackEvent = useTldrawAppUiEvents()

	if (!auth.isSignedIn || !user || !isLoaded) {
		throw new Error('should have redirected in TlaRootProviders')
	}
	const navigate = useNavigate()

	useEffect(() => {
		let _app: TldrawApp
		let didCancel = false
		setError(null)

		const FETCH_TIMEOUT = 5000
		function fetchFlagsWithTimeout(): Promise<FeatureFlags> {
			return Promise.race([
				fetchFeatureFlags(),
				new Promise<FeatureFlags>((resolve) =>
					setTimeout(() => resolve({ ...DEFAULT_FLAGS }), FETCH_TIMEOUT)
				),
			])
		}

		;(async () => {
			let flags = await fetchFlagsWithTimeout()
			if (!wasAuthenticated()) {
				flags = await fetchFlagsWithTimeout()
			}
			if (didCancel) return
			const token = await auth.getToken()
			if (!token) throw new Error('no token')
			const { app } = await TldrawApp.create({
				userId: auth.userId,
				email: user.primaryEmailAddress?.emailAddress,
				flags,
				getToken: async () => {
					const token = await auth.getToken()
					return token || undefined
				},
				// `skipCache` is load-bearing, not belt and braces: Clerk hands back a cached token
				// until it is nearly expired, and the refresh schedules itself from the *remaining*
				// life of whatever it is given. Cached tokens would shorten that interval on every
				// pass — 90s, then 45s, then 22s — until it bottomed out against its floor.
				getZeroToken: async () => {
					const token = await auth.getToken({ template: 'zero', skipCache: true })
					return token || undefined
				},
				onClientTooOld: () => {
					isClientTooOld$.set(true)
				},
				trackEvent,
				navigate,
			})
			if (didCancel) {
				app.dispose()
				return
			}
			_app = app
			setApp(app)
		})().catch((err) => {
			if (didCancel) return
			console.error('[AppState] Failed to initialize:', err)
			captureException(err)
			setError(err)
		})

		return () => {
			didCancel = true
			if (_app) {
				_app.dispose()
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [auth.userId, user])

	if (error) {
		// A swallowed bootstrap failure would leave the blank loading state below up for the
		// whole session.
		return (
			<ErrorPage
				messages={APP_LOAD_ERROR_MESSAGES}
				cta={
					<button type="button" onClick={() => window.location.reload()}>
						{APP_LOAD_ERROR_MESSAGES.cta}
					</button>
				}
			/>
		)
	}

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
