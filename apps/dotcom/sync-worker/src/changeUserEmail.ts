import { isClerkAPIResponseError } from '@clerk/backend/errors'
import { StatusError } from 'itty-router'
import { sql } from 'kysely'
import { createPostgresConnectionPool } from './postgres'
import { Environment } from './types'
import { getClerkClient } from './utils/tla/getAuth'

export interface ChangeUserEmailResult {
	email: string
	/** Addresses removed from the Clerk user. */
	removed: string[]
	/** Addresses kept because a social login (e.g. Google) is linked to them. */
	keptLinked: string[]
	/**
	 * Steps that failed after Clerk took the new primary address. The change has happened, but these
	 * need checking by hand; running the change again retries them.
	 */
	problems: string[]
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Changes the sign-in email of an account. Clerk is the source of truth for sign-in, so the new
 * address becomes the Clerk user's verified primary address and the old ones are removed. The
 * `user.email` column is a copy written at sign-up and nothing else refreshes it, so it is updated
 * here too.
 *
 * Old addresses linked to a social login (e.g. Google) stay on the Clerk user, because the login is
 * tied to that address. The result lists them so the admin can tell the user which login remains.
 *
 * Only a failure before Clerk takes the new primary address throws. After that the change has
 * happened, so later failures are collected in `problems` and every remaining step still runs.
 * Running the change again is safe: it promotes the address the user already has.
 */
export async function changeUserEmail(
	env: Environment,
	userId: string,
	rawEmail: string
): Promise<ChangeUserEmailResult> {
	const email = rawEmail.trim()
	if (!EMAIL_PATTERN.test(email)) {
		throw new StatusError(400, `Not an email address: ${email}`)
	}

	const db = createPostgresConnectionPool(env, '/app/admin/user/change_email')
	try {
		const taken = await db
			.selectFrom('user')
			.select('id')
			.where(sql<string>`lower(email)`, '=', email.toLowerCase())
			.where('id', '!=', userId)
			.executeTakeFirst()
		if (taken) {
			throw new StatusError(409, `${email} already belongs to user ${taken.id}`)
		}

		const clerk = getClerkClient(env)
		const user = await withClerkReason(() => clerk.users.getUser(userId))
		const existing = user.emailAddresses.find(
			(a) => a.emailAddress.toLowerCase() === email.toLowerCase()
		)
		const primary = await withClerkReason(() =>
			existing
				? clerk.emailAddresses.updateEmailAddress(existing.id, { verified: true, primary: true })
				: clerk.emailAddresses.createEmailAddress({
						userId,
						emailAddress: email,
						verified: true,
						primary: true,
					})
		)

		const result: ChangeUserEmailResult = {
			// Clerk's form of the address, so the row matches what the user signs in with.
			email: primary.emailAddress,
			removed: [],
			keptLinked: [],
			problems: [],
		}

		try {
			await db
				.updateTable('user')
				.set({ email: result.email, updatedAt: Date.now() })
				.where('id', '=', userId)
				.execute()
		} catch (e) {
			result.problems.push(`Updating user.email failed: ${describeError(e)}`)
		}

		for (const address of user.emailAddresses) {
			if (address.id === primary.id) continue
			if (address.linkedTo.length > 0) {
				result.keptLinked.push(address.emailAddress)
				continue
			}
			try {
				await clerk.emailAddresses.deleteEmailAddress(address.id)
				result.removed.push(address.emailAddress)
			} catch (e) {
				result.problems.push(
					`Removing ${address.emailAddress} from Clerk failed: ${describeError(e)}`
				)
			}
		}

		return result
	} finally {
		await db.destroy()
	}
}

async function withClerkReason<T>(fn: () => Promise<T>): Promise<T> {
	try {
		return await fn()
	} catch (e) {
		// Clerk refuses an address another Clerk user already has; pass its reason to the admin.
		if (isClerkAPIResponseError(e)) {
			throw new StatusError(e.status === 404 ? 404 : 422, `Clerk: ${describeError(e)}`)
		}
		throw e
	}
}

function describeError(e: unknown) {
	if (isClerkAPIResponseError(e)) {
		return e.errors[0]?.longMessage ?? e.errors[0]?.message ?? e.message
	}
	return e instanceof Error ? e.message : String(e)
}
