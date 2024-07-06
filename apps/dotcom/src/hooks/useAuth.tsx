import { ReactNode, createContext, useContext, useState } from 'react'

export interface TldrawAppAuth {
	user: null | {
		id: string
		name: string
		email: string
	}
	signIn: (
		user: TldrawAppAuth['user']
	) => Promise<{ success: true } | { success: false; error: string }>
	signOut: () => Promise<{ success: true } | { success: false; error: string }>
}

const authContext = createContext<TldrawAppAuth>({} as TldrawAppAuth)

export function AuthProvider({ children }: { children: ReactNode }) {
	const [auth, setAuth] = useState<TldrawAppAuth>({
		user: null,
		signIn: async (user: TldrawAppAuth['user'], forceError = false) => {
			await new Promise((resolve) => setTimeout(resolve, 1000))
			if (forceError) {
				return { error: 'An error occurred', success: false }
			}
			setAuth(() => ({
				...auth,
				user,
			}))

			return { success: true }
		},
		signOut: async () => {
			setAuth((auth: TldrawAppAuth) => ({
				...auth,
				user: null,
			}))

			return { success: true }
		},
	})

	return <authContext.Provider value={auth}>{children}</authContext.Provider>
}

export function useAuth() {
	return useContext(authContext)
}
