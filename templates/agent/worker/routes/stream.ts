import { IRequest } from 'itty-router'
import { Environment } from '../environment'

export async function stream(request: IRequest, env: Environment) {
	const apiKey = request.headers.get('x-ai-api-key')?.trim()
	if (!apiKey) return new Response('An API key is required.', { status: 401 })
	// eventually... use some kind of per-user id, so that each user has their own worker
	const id = env.AGENT_DURABLE_OBJECT.idFromName('anonymous')
	const DO = env.AGENT_DURABLE_OBJECT.get(id)
	const response = await DO.fetch(request.url, {
		method: 'POST',
		headers: { 'x-ai-api-key': apiKey },
		body: request.body as any,
	})

	return new Response(response.body as BodyInit, {
		status: response.status,
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no',
			'Transfer-Encoding': 'chunked',
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
		},
	})
}
