import type { UserResource } from '@clerk/react/types'
import { createContext, useContext } from 'react'

export interface TldrawUser {
	id: string
	clerkUser: UserResource
	isTldraw: boolean
	getToken(): Promise<string>
}
export const UserContext = createContext<null | TldrawUser>(null)

export function getIsTldrawStaff(clerkUser: UserResource | null | undefined) {
	return (
		clerkUser?.primaryEmailAddress?.verification?.status === 'verified' &&
		clerkUser.primaryEmailAddress.emailAddress.endsWith('@tldraw.com')
	)
}

export function useTldrawCurrentUser() {
	return useContext(UserContext)
}
