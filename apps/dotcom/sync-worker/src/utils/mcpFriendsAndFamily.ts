import { FriendsAndFamilyEntry } from '@tldraw/dotcom-shared'
import { Environment } from '../types'

// The friends and family list that the `mcp_friends_and_family` flag gates on: who gets the raised
// /app/mcp rate limits. It lives in the FEATURE_FLAGS KV namespace next to the flag itself, but under
// its own key rather than inside the flag value, because a FeatureFlagValue is a boolean or a
// percentage and the admin UI renders it as such.
//
// Admins enter email addresses, but entries are stored and matched by user id, the way the fairy
// admin routes did it. That keeps the request path cheap: `getAuth` already returns a verified
// userId, whereas an email would cost a Clerk `users.getUser()` round trip on every call. The email
// rides along purely so the admin panel can show something readable.
export const MCP_FRIENDS_AND_FAMILY_KEY = 'mcp_friends_and_family_users'

/**
 * Parses admin input into the emails to resolve: one per line or comma, blanks and duplicates
 * dropped, lowercased so the lookup and the dedupe agree. Anything that isn't an email address is
 * rejected rather than sent to the lookup, so the admin gets "that isn't an email" instead of the
 * blanker "no account for that".
 */
export function parseFriendsAndFamilyEmails(input: unknown): string[] {
	const raw = Array.isArray(input)
		? input.map((entry) => String(entry))
		: String(input ?? '').split(/[\n,]/)

	const emails: string[] = []
	for (const value of raw) {
		const email = value.trim().toLowerCase()
		if (!email) continue
		if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
			throw new Error(`"${value.trim()}" is not an email address`)
		}
		if (!emails.includes(email)) emails.push(email)
	}
	return emails
}

export async function getFriendsAndFamilyList(env: Environment): Promise<FriendsAndFamilyEntry[]> {
	try {
		const stored = await env.FEATURE_FLAGS.get(MCP_FRIENDS_AND_FAMILY_KEY)
		if (!stored) return []
		const parsed = JSON.parse(stored)
		if (!Array.isArray(parsed)) return []
		// Entries without a userId can't match anything, so drop them rather than carrying them into
		// the request path.
		return parsed
			.filter((entry) => entry && typeof entry.userId === 'string' && entry.userId)
			.map((entry) => ({ userId: entry.userId, email: String(entry.email ?? '') }))
	} catch (e) {
		// KV being unreadable must not hand out raised limits, and must not take the endpoint down
		// either: an empty list means nobody, which is the same answer an unconfigured environment
		// gives.
		console.error('Failed to read the MCP friends and family list:', e)
		return []
	}
}

export async function setFriendsAndFamilyList(
	env: Environment,
	entries: FriendsAndFamilyEntry[]
): Promise<void> {
	await env.FEATURE_FLAGS.put(MCP_FRIENDS_AND_FAMILY_KEY, JSON.stringify(entries))
}

/** Whether a signed-in user is on the list. Matches on user id; the stored email is only a label. */
export function isOnFriendsAndFamilyList(
	userId: string | null,
	entries: FriendsAndFamilyEntry[]
): boolean {
	if (!userId) return false
	return entries.some((entry) => entry.userId === userId)
}
