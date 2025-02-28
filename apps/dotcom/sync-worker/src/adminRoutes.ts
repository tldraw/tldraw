import { createRouter } from '@tldraw/worker-shared'
import { StatusError, json } from 'itty-router'
import { createPostgresConnectionPool } from './postgres'
import { type Environment } from './types'
import { getUserDurableObject } from './utils/durableObjects'
import { getClerkClient, requireAuth } from './utils/tla/getAuth'

async function requireUser(env: Environment, q: string) {
	const db = createPostgresConnectionPool(env, '/app/admin/user')
	const userRow = await db
		.selectFrom('user')
		.where((eb) => eb.or([eb('email', '=', q), eb('id', '=', q)]))
		.selectAll()
		.executeTakeFirst()

	if (!userRow) {
		throw new StatusError(404, 'User not found ' + q)
	}
	return userRow
}
export const adminRoutes = createRouter<Environment>()
	.all('/app/admin/*', async (req, env) => {
		const auth = await requireAuth(req, env)
		const user = await getClerkClient(env).users.getUser(auth.userId)
		if (
			!user.primaryEmailAddress?.emailAddress.endsWith('@tldraw.com') ||
			user.primaryEmailAddress?.verification?.status !== 'verified'
		) {
			throw new StatusError(403, 'Unauthorized')
		}
	})
	.get('/app/admin/user', async (res, env) => {
		const q = res.query['q']
		if (typeof q !== 'string') {
			return new Response('Missing query param', { status: 400 })
		}
		const userRow = await requireUser(env, q)

		const user = getUserDurableObject(env, userRow.id)
		return json(await user.admin_getData(userRow.id))
	})
	.post('/app/admin/user/reboot', async (res, env) => {
		const q = res.query['q']
		if (typeof q !== 'string') {
			return new Response('Missing query param', { status: 400 })
		}
		const userRow = await requireUser(env, q)
		const user = getUserDurableObject(env, userRow.id)
		await user.admin_forceHardReboot(userRow.id)
		return new Response('Rebooted', { status: 200 })
	})
