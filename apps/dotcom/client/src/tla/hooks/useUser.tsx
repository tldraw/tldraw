import { useAuth, useUser as useClerkUser } from '@clerk/clerk-react'
import type { UserResource } from '@clerk/types'
import assert from 'assert'
import { ReactNode, createContext, useContext, useMemo } from 'react'
import { DefaultSpinner, LoadingScreen } from 'tldraw'
import 'tldraw/tldraw.css'

export interface TldrawUser {
	id: string
	clerkUser: UserResource
	isTldraw: boolean
	getToken(): Promise<string>
}
const UserContext = createContext<null | TldrawUser>(null)

export function UserProvider({ children }: { children: ReactNode }) {
	const { user, isLoaded } = useClerkUser()
	const auth = useAuth()

	const value = useMemo(() => {
		if (!user || !auth.isSignedIn) return null

		return {
			id: user.id,
			clerkUser: user,
			isTldraw:
				user?.primaryEmailAddress?.verification.status === 'verified' &&
				user.primaryEmailAddress.emailAddress.endsWith('@tldraw.com'),
			getToken: async () => {
				const token = await auth.getToken()
				assert(token)
				return token
			},
		}
	}, [auth, user])

	if (!isLoaded || !auth.isLoaded) {
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
	if (!user) throw new Error('User not logged in')
	return user
}
