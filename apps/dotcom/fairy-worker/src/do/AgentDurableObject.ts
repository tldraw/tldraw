import { AgentAction, AgentPrompt, Streaming } from '@tldraw/fairy-shared'
import { DurableObject } from 'cloudflare:workers'
import { Environment } from '../environment'
import { AgentService } from './AgentService'

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
		if (url.pathname === '/stream-actions' && request.method === 'POST') {
			return this.streamActions(request)
		}

		if (url.pathname === '/stream-text' && request.method === 'POST') {
			return this.streamText(request)
		}

		// For other routes, you can still use the router or return 404
		return new Response('Not Found', { status: 404 })
	}

	/**
	 * Stream text from the model
	 */
	private async streamText(request: Request): Promise<Response> {
		const encoder = new TextEncoder()
		const { readable, writable } = new TransformStream()
		const writer = writable.getWriter()

		const response: string[] = []
		;(async () => {
			try {
				const prompt = (await request.json()) as AgentPrompt

				for await (const text of this.service.streamText(prompt)) {
					response.push(text)
					const data = `data: ${text}\n\n`
					await writer.write(encoder.encode(data))
					await writer.ready
				}
				await writer.close()
			} catch (error: any) {
				console.error('Stream text error:', error)
				throw error
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

	/**
	 * Stream actions from the model.
	 */
	private async streamActions(request: Request): Promise<Response> {
		const encoder = new TextEncoder()
		const { readable, writable } = new TransformStream()
		const writer = writable.getWriter()

		const response: { actions: Streaming<AgentAction>[] } = { actions: [] }

		;(async () => {
			try {
				const prompt = (await request.json()) as AgentPrompt

				for await (const action of this.service.streamActions(prompt)) {
					response.actions.push(action)
					const data = `data: ${JSON.stringify(action)}\n\n`
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
