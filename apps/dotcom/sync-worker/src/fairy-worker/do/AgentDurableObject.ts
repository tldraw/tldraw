import { DurableObject } from 'cloudflare:workers'
// import { AutoRouter, error } from 'itty-router'

import { Environment } from '../environment'
import { AgentService } from './AgentService'
import { AgentAction, AgentPrompt, Streaming } from '@tldraw/dotcom-shared'

export class AgentDurableObject extends DurableObject<Environment> {
	service: AgentService

	constructor(ctx: DurableObjectState, env: Environment) {
		super(ctx, env)
		this.service = new AgentService(this.env)
	}

	// `fetch` is the entry point for all requests to the Durable Object
	override async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url)
		
		// Handle the stream endpoint directly without router
		if (url.pathname === '/app/fairy/stream' && request.method === 'POST') {
			return this.stream(request)
		}
		
		// For other routes, you can still use the router or return 404
		return new Response('Not Found', { status: 404 })
	}

	/**
	 * Stream changes from the model.
	 */
	private async stream(request: Request): Promise<Response> {
		const encoder = new TextEncoder()
		const { readable, writable } = new TransformStream()
		const writer = writable.getWriter()

		const response: { changes: Streaming<AgentAction>[] } = { changes: [] }

		;(async () => {
			try {
				const prompt = (await request.json()) as AgentPrompt

				for await (const change of this.service.stream(prompt)) {
					response.changes.push(change)
					const data = `data: ${JSON.stringify(change)}\n\n`
					await writer.write(encoder.encode(data))
					await writer.ready
				}
				await writer.close()
			} catch (error: any) {
				console.error('Stream error:', error)
				const errorData = `data: ${JSON.stringify({ error: error.message })}\n\n`
				try {
					await writer.write(encoder.encode(errorData))
					await writer.close()
				} catch (writeError) {
					await writer.abort(writeError)
				}
			}
		})()

		return new Response(readable, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache, no-transform',
				Connection: 'keep-alive',
				'X-Accel-Buffering': 'no',
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'POST, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type',
			},
		})
	}
}

// Original version
// export class AgentDurableObject extends DurableObject<Environment> {
// 	service: AgentService

// 	constructor(ctx: DurableObjectState, env: Environment) {
// 		super(ctx, env)
// 		this.service = new AgentService(this.env) // swap this with your own service
// 	}

// 	private readonly router = AutoRouter({
// 		catch: (e) => {
// 			console.error(e)
// 			return error(e)
// 		},
// 	}).post('/app/fairy/stream', (request) => { 
// 		console.warn('\n\n\nAgentDurableObject stream\n\n\n', request); 
// 		return this.stream(request)
// 	})

// 	// `fetch` is the entry point for all requests to the Durable Object
// 	override fetch(request: Request): Response | Promise<Response> {
// 		console.warn('\n\n\nAgentDurableObject fetch\n\n\n')
// 		return this.router.fetch(request)
// 	}

// 	/**
// 	 * Stream changes from the model.
// 	 *
// 	 * @param request - The request object containing the prompt.
// 	 * @returns A Promise that resolves to a Response object containing the streamed changes.
// 	 */
// 	private async stream(request: Request): Promise<Response> {
// 		console.warn('\n\nhello you have successfully reached AgentDurableObject\'s stream function\n\n')
// 		const encoder = new TextEncoder()
// 		const { readable, writable } = new TransformStream()
// 		const writer = writable.getWriter()

// 		const response: { changes: Streaming<AgentAction>[] } = { changes: [] }

// 		;(async () => {
// 			try {
// 				const prompt = (await request.json()) as AgentPrompt

// 				for await (const change of this.service.stream(prompt)) {
// 					response.changes.push(change)
// 					const data = `data: ${JSON.stringify(change)}\n\n`
// 					await writer.write(encoder.encode(data))
// 					await writer.ready
// 				}
// 				await writer.close()
// 			} catch (error: any) {
// 				console.error('Stream error:', error)

// 				// Send error through the stream
// 				const errorData = `data: ${JSON.stringify({ error: error.message })}\n\n`
// 				try {
// 					await writer.write(encoder.encode(errorData))
// 					await writer.close()
// 				} catch (writeError) {
// 					await writer.abort(writeError)
// 				}
// 			}
// 		})()

// 		return new Response(readable, {
// 			headers: {
// 				'Content-Type': 'text/event-stream',
// 				'Cache-Control': 'no-cache, no-transform',
// 				Connection: 'keep-alive',
// 				'X-Accel-Buffering': 'no',
// 				'Transfer-Encoding': 'chunked',
// 				'Access-Control-Allow-Origin': '*',
// 				'Access-Control-Allow-Methods': 'POST, OPTIONS',
// 				'Access-Control-Allow-Headers': 'Content-Type',
// 			},
// 		})
// 	}
// }