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

		const result = await updateClerkEmail(env, userId, email)

		await db
			.updateTable('user')
			.set({ email, updatedAt: Date.now() })
			.where('id', '=', userId)
			.execute()

		return result
	} finally {
		await db.destroy()
	}
}

async function updateClerkEmail(
	env: Environment,
	userId: string,
	email: string
): Promise<ChangeUserEmailResult> {
	const clerk = getClerkClient(env)
	try {
		const user = await clerk.users.getUser(userId)
		const existing = user.emailAddresses.find(
			(a) => a.emailAddress.toLowerCase() === email.toLowerCase()
		)
		const primary = existing
			? await clerk.emailAddresses.updateEmailAddress(existing.id, {
					verified: true,
					primary: true,
				})
			: await clerk.emailAddresses.createEmailAddress({
					userId,
					emailAddress: email,
					verified: true,
					primary: true,
				})

		const removed: string[] = []
		const keptLinked: string[] = []
		for (const address of user.emailAddresses) {
			if (address.id === primary.id) continue
			if (address.linkedTo.length > 0) {
				keptLinked.push(address.emailAddress)
				continue
			}
			await clerk.emailAddresses.deleteEmailAddress(address.id)
			removed.push(address.emailAddress)
		}

		return { email: primary.emailAddress, removed, keptLinked }
	} catch (e) {
		// Clerk refuses an address another Clerk user already has; pass its reason to the admin.
		if (isClerkAPIResponseError(e)) {
			const reason = e.errors[0]?.longMessage ?? e.errors[0]?.message ?? e.message
			throw new StatusError(e.status === 404 ? 404 : 422, `Clerk: ${reason}`)
		}
		throw e
	}
}
