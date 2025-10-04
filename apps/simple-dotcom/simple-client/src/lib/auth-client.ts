// Better Auth Client
// Client-side auth methods for use in components

import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
	baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
})

// Export commonly used hooks and methods
export const { useSession, signIn, signUp, signOut, forgetPassword, resetPassword } = authClient
