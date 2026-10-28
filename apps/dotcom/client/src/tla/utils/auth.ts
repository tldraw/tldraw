import { ClerkOfflineError } from '@clerk/react/errors'
import type { UserResource } from '@clerk/react/types'

export function hasNotAcceptedLegal(user: UserResource | null | undefined): boolean {
	return !!(
		(
			user &&
			!user.legalAcceptedAt && // Clerk's canonical metadata key (older accounts)
			!user.unsafeMetadata?.legal_accepted_at
		) // our metadata key (newer accounts)
	)
}

// Clerk Core 3's getToken throws offline where Core 2 returned null; this restores the null path.
export async function tokenOrUndefinedWhenOffline(get: () => Promise<string | null>) {
	try {
		return (await get()) || undefined
	} catch (e) {
		if (ClerkOfflineError.is(e)) return undefined
		throw e
	}
}
