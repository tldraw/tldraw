import { useAuth, useUser as useClerkUser } from '@clerk/clerk-react'
import type { UserResource } from '@clerk/types'
import { ReactNode, createContext, useContext, useMemo } from 'react'
import { DefaultSpinner, LoadingScreen, assert, useShallowObjectIdentity } from 'tldraw'
import { useMaybeApp } from './useAppState'

export interface TldrawUser {
	id: string
	clerkUser: UserResource
	isTldraw: boolean
	getToken(): Promise<string>
}
const UserContext = createContext<null | TldrawUser>(null)

export function UserProvider({ children }: { children: ReactNode }) {
	const { isLoaded, ...others } = useClerkUser()
	const user = useShallowObjectIdentity(others.user)
	// At time of writing, the return value of `useAuth` was not stable during a user session,
	// and was causing downstream react components to remount unnecessarily and lose state.
	// I tracked it down to being useAuth().has which was being updated randomly for some reason.
	// Destructuring the bits we need here fixes the issue as they seem to be stable.
	const { getToken, isSignedIn, isLoaded: isAuthLoaded } = useAuth()

	// app can be null during hot reloading sometimes?
	const app = useMaybeApp()

	const value = useMemo(() => {
		if (!user || !isSignedIn || !app) return null

		const storeUser = app.getUser()
		if (!storeUser) throw new Error('User not found in app store')

		return {
			id: storeUser.id,
			clerkUser: user,
			isTldraw:
				user?.primaryEmailAddress?.verification.status === 'verified' &&
				user.primaryEmailAddress.emailAddress.endsWith('@tldraw.com'),
			getToken: async () => {
				const token = await getToken()
				assert(token)
				return token
			},
		}
	}, [getToken, isSignedIn, user, app])

	if (!isLoaded || !isAuthLoaded || !app) {
		return (
			<div className="tldraw__editor">
				<LoadingScreen>
					<DefaultSpinner />
				</LoadingScreen>
			</div>
		)
	}

	return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useTldrawUser() {
	return useContext(UserContext)
}

export function useLoggedInUser() {
	const user = useTldrawUser()
	if (!user) throw new Error('User not signed in')
	return user
}
