import { IndexKey } from '@tldraw/utils'
import { IRequest } from 'itty-router'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'
import { isRateLimited } from '../../utils/rateLimit'
import { getClerkClient } from '../../utils/tla/getAuth'

// Ensures the user row + home workspace exist before Zero can query. Idempotent: concurrent
// first-sign-ins race safely because all three inserts no-op on conflict, so the loser of the
// race falls through to the same 200 as the winner instead of hitting a unique violation.
export async function initUser(req: IRequest, env: Environment): Promise<Response> {
	const id = req.params.userId
	const db = createPostgresConnectionPool(env, '/app/init')
	try {
		const existing = await db
			.selectFrom('user')
			.where('id', '=', id)
			.select('id')
			.executeTakeFirst()
		if (existing) return new Response('ok', { status: 200 })

		// Only the creation path is rate-limited: existing users hit the cheap SELECT above on
		// every sign-in and shouldn't burn rate-limit budget or risk a 429 boot-hang.
		if (await isRateLimited(env, id)) {
			return new Response('Rate limited', { status: 429 })
		}

		// auth is checked in the main worker, so the clerk user definitely exists
		const clerk = getClerkClient(env)
		const clerkUser = await clerk.users.getUser(id)
		if (!clerkUser) return new Response('Clerk user not found', { status: 404 })

		// A Clerk user can lack an email (e.g. some SSO/social flows); reading [0].emailAddress
		// on such a user throws and permanently 500s user boot. Fail cleanly with a 400 instead.
		const email =
			clerkUser.primaryEmailAddress?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress
		if (!email) return new Response('Clerk user has no email address', { status: 400 })

		await db.transaction().execute(async (tx) => {
			const now = Date.now()
			await tx
				.insertInto('user')
				.values({
					id,
					name: clerkUser.fullName ?? '',
					email,
					avatar: clerkUser.imageUrl,
					color: '___INIT___',
					exportFormat: 'png',
					exportTheme: 'light',
					exportBackground: true,
					exportPadding: true,
					createdAt: now,
					updatedAt: now,
					// No feature flags on new users; the column is retained for future flags.
					flags: '',
				})
				.onConflict((oc) => oc.doNothing())
				.execute()
			await tx
				.insertInto('group')
				.values({
					id,
					// The home/private workspace defaults to "My workspace" and is renameable.
					name: 'My workspace',
					createdAt: now,
					updatedAt: now,
					isDeleted: false,
					inviteSecret: null,
				})
				.onConflict((oc) => oc.doNothing())
				.execute()
			await tx
				.insertInto('group_user')
				.values({
					userId: id,
					groupId: id,
					createdAt: now,
					updatedAt: now,
					role: 'owner',
					index: 'a1' as IndexKey,
					userName: clerkUser.fullName ?? '',
					userColor: '',
				})
				.onConflict((oc) => oc.doNothing())
				.execute()
		})
		return new Response('ok', { status: 200 })
	} finally {
		await db.destroy()
	}
}
