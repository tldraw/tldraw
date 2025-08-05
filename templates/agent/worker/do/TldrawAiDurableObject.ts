import { DurableObject } from 'cloudflare:workers'
import { AutoRouter, error } from 'itty-router'
import { Streaming, TLAgentChange } from '../../client/types/TLAgentChange'
import { TLAgentPrompt } from '../../client/useTldrawAgent'
import { TldrawAgentBaseService } from '../TldrawAgentBaseService'
import { Environment } from '../types'
import { VercelAiService } from './vercel/VercelAiService'

export class TldrawAiDurableObject extends DurableObject<Environment> {
	service: TldrawAgentBaseService

	constructor(ctx: DurableObjectState, env: Environment) {
		super(ctx, env)
		this.service = new VercelAiService(this.env) // swap this with your own service
	}

	private readonly router = AutoRouter({
		catch: (e) => {
			console.error(e)
			return error(e)
		},
	})
		// when we get a connection request, we stash the room id if needed and handle the connection
		.post('/generate', (request) => this.generate(request))
		.post('/stream', (request) => this.stream(request))
		.post('/cancel', (request) => this.cancel(request))

	// `fetch` is the entry point for all requests to the Durable Object
	override fetch(request: Request): Response | Promise<Response> {
		return this.router.fetch(request)
	}

	/**
	 * Cancel the current stream.
	 *
	 * @param _request - The request object containing the prompt.
	 * @returns A Promise that resolves to a Response object containing the cancelled response.
	 */
	cancel(_request: Request) {
		return new Response('Not implemented', {
			status: 501,
		})
	}

	/**
	 * Generate a set of changes from the model.
	 *
	 * @param request - The request object containing the prompt.
	 * @returns A Promise that resolves to a Response object containing the generated changes.
	 */
	private async generate(request: Request) {
		try {
			const prompt = (await request.json()) as TLAgentPrompt
			const response = await this.service.generate(prompt)

			return new Response(JSON.stringify(response), {
				headers: { 'Content-Type': 'application/json' },
			})
		} catch (error: any) {
			console.error('AI response error:', error)
			return new Response(JSON.stringify({ error: error.message }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			})
		}
	}

	/**
	 * Stream changes from the model.
	 *
	 * @param request - The request object containing the prompt.
	 * @returns A Promise that resolves to a Response object containing the streamed changes.
	 */
	private async stream(request: Request): Promise<Response> {
		const encoder = new TextEncoder()
		const { readable, writable } = new TransformStream()
		const writer = writable.getWriter()

		const response: { changes: Streaming<TLAgentChange>[] } = { changes: [] }

		;(async () => {
			try {
				const prompt = (await request.json()) as TLAgentPrompt

				for await (const change of this.service.stream(prompt)) {
					response.changes.push(change)
					const data = `data: ${JSON.stringify(change)}\n\n`
					await writer.write(encoder.encode(data))
					await writer.ready
				}
				await writer.close()
			} catch (error: any) {
				console.error('Stream error:', error)

				// Send error through the stream
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
				'Transfer-Encoding': 'chunked',
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'POST, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type',
			},
		})
	}
}
