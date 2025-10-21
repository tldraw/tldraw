import { DurableObject } from 'cloudflare:workers'
// import { AutoRouter, error } from 'itty-router'

import {
	AgentAction,
	AgentActionUtilConstructor,
	AgentPrompt,
	PromptPartUtilConstructor,
	Streaming,
} from '@tldraw/fairy-shared'
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
		if (url.pathname === '/stream' && request.method === 'POST') {
			return this.stream(request)
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

		const response: { changes: { text: string }[] } = { changes: [] }
		;(async () => {
			try {
				const { prompt, actions, parts } = (await request.json()) as {
					prompt: AgentPrompt
					actions: AgentActionUtilConstructor['type'][]
					parts: PromptPartUtilConstructor['type'][]
				}

				for await (const change of this.service.streamText(prompt, actions, parts)) {
					response.changes.push(change)
					const data = `data: ${JSON.stringify(change)}\n\n`
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
	 * Stream changes from the model.
	 */
	private async stream(request: Request): Promise<Response> {
		const encoder = new TextEncoder()
		const { readable, writable } = new TransformStream()
		const writer = writable.getWriter()

		const response: { changes: Streaming<AgentAction>[] } = { changes: [] }

		;(async () => {
			try {
				const { prompt, actions, parts } = (await request.json()) as {
					prompt: AgentPrompt
					actions: AgentActionUtilConstructor['type'][]
					parts: PromptPartUtilConstructor['type'][]
				}

				for await (const change of this.service.stream(prompt, actions, parts)) {
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
