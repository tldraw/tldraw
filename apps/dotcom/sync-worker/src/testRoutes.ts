import { createRouter, notFound } from '@tldraw/worker-shared'
import { isDebugLogging, type Environment } from './types'
import { getReplicator, getUserDurableObject } from './utils/durableObjects'

export const testRoutes = createRouter<Environment>()
	.all('/app/__test__/*', (_, env) => {
		if (!isDebugLogging(env)) return notFound()
		return undefined
	})
	.get('/app/__test__/replicator/reboot', async (_, env) => {
		await getReplicator(env).__test__forceReboot()
		return new Response('ok')
	})
	.get('/app/__test__/replicator/panic', async (_, env) => {
		await getReplicator(env)
			.__test__panic()
			.catch(() => null)
		return new Response('ok')
	})
	.get('/app/__test__/user/:userId/reboot', (req, env) => {
		getUserDurableObject(env, req.params.userId).handleReplicationEvent({
			type: 'maybe_force_reboot',
			sequenceId: 'test',
			sequenceNumber: 0,
		})
		return new Response('ok')
	})
	.get('/app/__test__/user/:userId/downgrade-client', (req, env) => {
		getUserDurableObject(env, req.params.userId).__test__downgradeClient(true)
		return new Response('ok')
	})
	.get('/app/__test__/user/:userId/upgrade-client', (req, env) => {
		getUserDurableObject(env, req.params.userId).__test__downgradeClient(false)
		return new Response('ok')
	})
	.post('/app/__test__/user/:userId/prepare-for-test', async (req, env) => {
		const legacy = req.headers.get('x-legacy') === 'true'
		await getUserDurableObject(env, req.params.userId).__test__prepareForTest(
			req.params.userId,
			legacy
		)
		return new Response('ok')
	})
	.all('*', notFound)
