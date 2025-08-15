/// <reference types="@cloudflare/workers-types" />
import { Router } from 'itty-router'
import { Environment } from './environment'
import { getRoomHistory } from './routes/roomHistory'
import { getRoom } from './routes/rooms'
import { withErrorHandling } from './utils/withErrorHandling'

const router = Router()
	.get(
		'/r/:roomId',
		withErrorHandling(async (request, env: Environment) => {
			return await getRoom(request, env, false)
		})
	)
	.get(
		'/f/:roomId',
		withErrorHandling(async (request, env: Environment) => {
			return await getRoom(request, env, true)
		})
	)
	.get(
		'/r/:roomId/history',
		withErrorHandling(async (request, env: Environment) => {
			return await getRoomHistory(request, env, false)
		})
	)
	.get(
		'/f/:roomId/history',
		withErrorHandling(async (request, env: Environment) => {
			return await getRoomHistory(request, env, true)
		})
	)
	.all('*', () => {
		return new Response('Not Found', { status: 404 })
	})

export default {
	async fetch(request: Request, env: Environment, ctx: ExecutionContext): Promise<Response> {
		const response = await router.handle(request, env, ctx)

		if (response) {
			return response
		}

		return new Response('Not Found', { status: 404 })
	},
}
