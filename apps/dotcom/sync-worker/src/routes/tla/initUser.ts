import { IndexKey } from '@tldraw/utils'
import { IRequest } from 'itty-router'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'
import { isRateLimited } from '../../utils/rateLimit'
import { getClerkClient } from '../../utils/tla/getAuth'

// Ensures the user row + home workspace exist before Zero can query. Idempotent:
// concurrent calls race safely via the in-transaction re-check.
export async function initUser(req: IRequest, env: Environment): Promise<Response> {
	const id = req.params.userId
	if (await isRateLimited(env, id)) {
		return new Response('Rate limited', { status: 429 })
	}
	const db = createPostgresConnectionPool(env, '/app/init')
	try {
		const existing = await db
			.selectFrom('user')
			.where('id', '=', id)
			.select('id')
			.executeTakeFirst()
		if (existing) return new Response('ok', { status: 200 })

		// auth is checked in the main worker, so the clerk user definitely exists
		const clerk = getClerkClient(env)
		const clerkUser = await clerk.users.getUser(id)
		if (!clerkUser) return new Response('Clerk user not found', { status: 404 })

		await db.transaction().execute(async (tx) => {
			// check that user wasn't added by another request in between the auth check and here
			if (await tx.selectFrom('user').where('id', '=', id).select('id').executeTakeFirst()) {
				return
			}
			const now = Date.now()
			await tx
				.insertInto('user')
				.values({
					id,
					name: clerkUser.fullName ?? '',
					email: clerkUser.emailAddresses[0].emailAddress,
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
				.execute()
		})
		return new Response('ok', { status: 200 })
	} finally {
		await db.destroy()
	}
}
