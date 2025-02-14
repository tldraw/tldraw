import { createRouter, notFound } from '@tldraw/worker-shared'
import { isDebugLogging, type Environment } from './types'
import { getStatsDurableObjct } from './utils/durableObjects'

function isAuthorized(req: Request, env: Environment) {
	const auth = req.headers.get('Authorization')
	const bearer = auth?.split('Bearer ')[1]
	return bearer && bearer === env.HEALTH_CHECK_BEARER_TOKEN
}

export const checkRoutes = createRouter<Environment>()
	.all('/check/*', (req, env) => {
		if (isDebugLogging(env)) return undefined
		if (!isAuthorized(req, env)) {
			return new Response('Unauthorized', { status: 401 })
		}
		return undefined
	})
	.get('/check/replicator', async (_, env) => {
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
	.get('/check/user-durable-objects', async (_, env) => {
		const stats = getStatsDurableObjct(env)
		const abortsOverThreshold = await stats.unusualNumberOfUserDOAborts()
		if (abortsOverThreshold) {
			return new Response('High ammount of user durable object aborts', { status: 500 })
		}
		const areUsersRecevingReplicationEvents = await stats.areUsersRecevingReplicationEvents()
		if (!areUsersRecevingReplicationEvents) {
			return new Response('Users are not receiving replication events', { status: 500 })
		}
		return new Response('ok', { status: 200 })
	})
	.get('/check/clerk', async (_, env) => {
		const stats = getStatsDurableObjct(env)
		if (await stats.isClerkWorking()) {
			return new Response('ok', { status: 200 })
		}
		return new Response('Could not reach clerk', { status: 500 })
	})
	.get('/check/db', async (_, env) => {
		const stats = getStatsDurableObjct(env)
		if (await stats.isDbWorking()) {
			return new Response('ok', { status: 200 })
		}
		return new Response('Could not reach the database', { status: 500 })
	})
	.all('*', notFound)
