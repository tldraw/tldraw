'use client'

// Session Provider for Supabase Auth
// Wraps the app to provide session context to all components

import { ReactNode } from 'react'

export function SessionProvider({ children }: { children: ReactNode }) {
	// Supabase Auth automatically handles session management
	// through cookies, so we just need a simple wrapper
	// The browser client handles session refresh automatically
	return <>{children}</>
}
