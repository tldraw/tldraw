import { IRequest } from 'itty-router'
import { Environment } from '../environment'

type Handler = (request: IRequest, env: Environment, ctx?: ExecutionContext) => Promise<Response>

export function withErrorHandling(handler: Handler): Handler {
	return async (request, env, ctx) => {
		try {
			const result = await handler(request, env, ctx)
			return result
		} catch (error) {
			console.error('withErrorHandling: Error in handler:', error)
			return new Response(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, {
				status: 500,
				headers: {
					'Content-Type': 'application/json',
				},
			})
		}
	}
}
