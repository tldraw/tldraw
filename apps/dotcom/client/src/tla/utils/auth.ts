import type { UserResource } from '@clerk/types'

export function hasNotAcceptedLegal(user: UserResource | null | undefined): boolean {
	return !!(
		user &&
		!user.legalAcceptedAt && // Clerk's canonical metadata key (older accounts)
		!user.unsafeMetadata?.legal_accepted_at // our metadata key (newer accounts)
	)
}
