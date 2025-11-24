import { useUser } from '@clerk/clerk-react'
import { hasActiveFairyAccess } from '@tldraw/dotcom-shared'
import { useValue } from 'tldraw'
import { useApp } from './useAppState'

/**
 * Hook that returns whether the current user has active fairy access.
 * Checks if the user's fairy access has not expired and if @tldraw.com email is verified.
 */
export function useFairyAccess(): boolean {
	const app = useApp()
	const { user: clerkUser } = useUser()
	return useValue(
		'fairy_access',
		() => {
			const user = app.getUser()
			if (!clerkUser || !user) return false
			return hasActiveFairyAccess(user.fairyAccessExpiresAt, user.fairyLimit)
		},
		[app, clerkUser]
	)
}

/**
 * Hook that returns the user's fairy limit.
 * Returns null if the user has no fairy access.
 */
export function useFairyLimit(): number | null {
	const app = useApp()
	return useValue(
		'fairy_limit',
		() => {
			const user = app.getUser()
			return user?.fairyLimit
		},
		[app]
	)
}
