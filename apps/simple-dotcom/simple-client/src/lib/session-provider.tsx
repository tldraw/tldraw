'use client'

// Session Provider for Better Auth
// Wraps the app to provide session context to all components

import { ReactNode } from 'react'

export function SessionProvider({ children }: { children: ReactNode }) {
	// Better Auth React automatically provides session context
	// through the authClient hooks, so we just need a simple wrapper
	return <>{children}</>
}
