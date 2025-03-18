import { createRouter, notFound } from '@tldraw/worker-shared'
import { createPostgresConnectionPool } from './postgres'
import { isDebugLogging, type Environment } from './types'
import { getStatsDurableObjct } from './utils/durableObjects'
import { getClerkClient } from './utils/tla/getAuth'

function isAuthorized(req: Request, env: Environment) {
	const auth = req.headers.get('Authorization')
	const bearer = auth?.split('Bearer ')[1]
	return bearer && bearer === env.HEALTH_CHECK_BEARER_TOKEN
}

export const healthCheckRoutes = createRouter<Environment>()
	.all('/health-check/*', (req, env) => {
		if (isDebugLogging(env) || isAuthorized(req, env)) return undefined
		return new Response('Unauthorized', { status: 401 })
	})
	.get('/health-check/replicator', async (_, env) => {
		const stats = getStatsDurableObjct(env)
		const unusualRetries = await stats.unusualNumberOfReplicatorBootRetries()
		if (unusualRetries) {
			return new Response('High ammount of replicator boot retries', { status: 500 })
		}
		const isGettingUpdates = await stats.isReplicatorGettingUpdates()
		if (!isGettingUpdates) {
			return new Response('Replicator is not getting postgres updates', { status: 500 })
		}
		return new Response('ok', { status: 200 })
	})
	.get('/health-check/user-durable-objects', async (_, env) => {
		const stats = getStatsDurableObjct(env)
		const abortsOverThreshold = await stats.unusualNumberOfUserDOAborts()
		if (abortsOverThreshold) {
			return new Response('High ammount of user durable object aborts', { status: 500 })
		}
		return new Response('ok', { status: 200 })
	})
	.get('/health-check/clerk', async (_, env) => {
		const clerk = getClerkClient(env)
		try {
			const result = await clerk.users.getCount()
			if (!result || typeof result !== 'number') {
				return new Response('Could not reach clerk', { status: 500 })
			}
			return new Response('ok', { status: 200 })
		} catch (_e) {
			return new Response('Could not reach clerk', { status: 500 })
		}
	})
	.get('/health-check/db', async (_, env) => {
		try {
			await createPostgresConnectionPool(env, '/health-check/db')
				.selectFrom('user')
				.select('name')
				.where('email', '=', 'mitja@tldraw.com')
				.executeTakeFirstOrThrow()

			return new Response('ok', { status: 200 })
		} catch (_e) {
			return new Response('Could not reach the database', { status: 500 })
		}
	})
	.all('*', notFound)
