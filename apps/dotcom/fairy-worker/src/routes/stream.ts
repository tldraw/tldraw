import { IRequest } from 'itty-router'
import { Environment } from '../environment'

export async function stream(request: IRequest, env: Environment) {
	// Read the body once and convert to string
	const bodyText = await request.text() // or request.json() then JSON.stringify()

	const id = env.AGENT_DURABLE_OBJECT.idFromName('anonymous')
	const DO = env.AGENT_DURABLE_OBJECT.get(id)

	// Create a NEW request body from the text we read
	const response = await DO.fetch(request.url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: bodyText, // Pass the string, not the consumed stream
	})

	// Return the response directly, don't wrap it again
	return response
}

// Original version
// export async function stream(request: IRequest, env: Environment) {
// 	console.warn('\n\n\nstream.ts\n\n\n')
// 	// eventually... use some kind of per-user id, so that each user has their own worker
// 	const id = env.AGENT_DURABLE_OBJECT.idFromName('anonymous')
// 	const DO = env.AGENT_DURABLE_OBJECT.get(id)
// 	console.warn('\n\n\nrequest.url\n\n\n', request.url)
// 	const response = await DO.fetch(request.url, {
// 		method: 'POST',
// 		body: request.body as any,
// 	})
// 	console.warn('\n\n\nDO fetch response\n\n\n', response)

// 	return new Response(response.body as BodyInit, {
// 		headers: {
// 			'Content-Type': 'text/event-stream',
// 			'Cache-Control': 'no-cache, no-transform',
// 			Connection: 'keep-alive',
// 			'X-Accel-Buffering': 'no',
// 			'Transfer-Encoding': 'chunked',
// 			'Access-Control-Allow-Origin': '*',
// 			'Access-Control-Allow-Methods': 'POST, OPTIONS',
// 			'Access-Control-Allow-Headers': 'Content-Type',
// 		},
// 	})
// }
