import { IRequest } from 'itty-router'
import { Environment } from '../types'

export async function generate(request: IRequest, env: Environment) {
	// eventually... use some kind of per-user id, so that each user has their own worker
	const id = env.MY_DURABLE_OBJECT.idFromName('anonymous')
	const DO = env.MY_DURABLE_OBJECT.get(id)
	const response = await DO.fetch(request.url, {
		method: 'POST',
		body: request.body as any,
	})

	return new Response(response.body as BodyInit, {
		headers: { 'Content-Type': 'application/json' },
	})
}
