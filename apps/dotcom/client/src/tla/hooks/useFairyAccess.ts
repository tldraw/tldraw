import { useUser } from '@clerk/clerk-react'
import { hasActiveFairyAccess } from '@tldraw/dotcom-shared'
import { useValue } from 'tldraw'
import { useMaybeApp } from './useAppState'
import { useFeatureFlags } from './useFeatureFlags'

/**
 * Hook that returns whether the current user has active fairy access.
 * Checks both the feature flag and user's fairy access settings.
 */
export function useFairyAccess(): boolean {
	const app = useMaybeApp()
	const { user: clerkUser } = useUser()
	const { flags } = useFeatureFlags()
	return useValue(
		'fairy_access',
		() => {
			if (!flags.fairies_enabled) return false
			if (!app) return false
			const user = app.getUser()
			if (!clerkUser || !user) return false
			return hasActiveFairyAccess(user.fairyAccessExpiresAt, user.fairyLimit)
		},
		[app, clerkUser, flags.fairies_enabled]
	)
}

/**
 * Hook that returns the user's fairy limit.
 * A value of 0 means that they can purchases faries, but don't have access yet.
 * Returns null if the user has no fairy access at all.
 */
export function useFairyLimit(): number | null {
	const app = useMaybeApp()
	return useValue(
		'fairy_limit',
		() => {
			if (!app) return null
			const user = app.getUser()
			return user?.fairyLimit
		},
		[app]
	)
}
