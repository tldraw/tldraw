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

		// Create an AbortController to propagate cancellation to the AI SDK
		const abortController = new AbortController()
		const signal = abortController.signal

		// Monitor the readable stream - when client cancels, this will be cancelled
		// Wrap readable to detect cancellation
		const wrappedReadable = new ReadableStream({
			start(controller) {
				const reader = readable.getReader()
				async function pump() {
					try {
						while (true) {
							const { done, value } = await reader.read()
							if (done) {
								controller.close()
								break
							}
							controller.enqueue(value)
						}
					} catch (error) {
						controller.error(error)
					} finally {
						reader.releaseLock()
					}
				}
				pump()
			},
			cancel() {
				// Client cancelled the stream - abort the AI SDK stream and writer
				abortController.abort()
				writer.abort().catch(() => {
					// Writer already closed/aborted, ignore
				})
				readable.cancel()
			},
		})

		const response: string[] = []
		;(async () => {
			try {
				const prompt = (await request.json()) as AgentPrompt

				for await (const text of this.service.streamText(prompt, signal)) {
					if (signal.aborted) break
					response.push(text)
					const data = `data: ${text}\n\n`
					try {
						await writer.write(encoder.encode(data))
						await writer.ready
					} catch (writeError) {
						// Writer was aborted or closed, break out of loop
						if (signal.aborted) break
						throw writeError
					}
				}
				if (!signal.aborted) {
					await writer.close()
				}
			} catch (error: any) {
				// Check if it was aborted - if so, close gracefully
				if (signal.aborted || error?.name === 'AbortError') {
					try {
						await writer.close()
					} catch {
						// Writer already closed/aborted, ignore
					}
					return
				}
				console.error('Stream text error:', error)
				const errorMessage = error?.message || error?.toString() || 'Unknown error'
				const errorData = `data: ${JSON.stringify({ error: errorMessage })}\n\n`
				try {
					await writer.write(encoder.encode(errorData))
					await writer.close()
				} catch (writeError) {
					await writer.abort(writeError)
				}
			}
		})()

		return new Response(wrappedReadable, {
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

		// Create an AbortController to propagate cancellation to the AI SDK
		const abortController = new AbortController()
		const signal = abortController.signal

		// Monitor the readable stream - when client cancels, this will be cancelled
		// Wrap readable to detect cancellation
		const wrappedReadable = new ReadableStream({
			start(controller) {
				const reader = readable.getReader()
				async function pump() {
					try {
						while (true) {
							const { done, value } = await reader.read()
							if (done) {
								controller.close()
								break
							}
							controller.enqueue(value)
						}
					} catch (error) {
						controller.error(error)
					} finally {
						reader.releaseLock()
					}
				}
				pump()
			},
			cancel() {
				// Client cancelled the stream - abort the AI SDK stream and writer
				abortController.abort()
				writer.abort().catch(() => {
					// Writer already closed/aborted, ignore
				})
				readable.cancel()
			},
		})

		const response: { actions: Streaming<AgentAction>[] } = { actions: [] }

		;(async () => {
			try {
				const prompt = (await request.json()) as AgentPrompt

				const isAdmin = request.headers.get('X-Is-Admin') === 'true'
				for await (const action of this.service.streamActions(prompt, isAdmin, signal)) {
					if (signal.aborted) break
					response.actions.push(action)
					const data = `data: ${JSON.stringify(action)}\n\n`
					try {
						await writer.write(encoder.encode(data))
						await writer.ready
					} catch (writeError) {
						// Writer was aborted or closed, break out of loop
						if (signal.aborted) break
						throw writeError
					}
				}
				if (!signal.aborted) {
					await writer.close()
				}
			} catch (error: any) {
				// Check if it was aborted - if so, close gracefully
				if (signal.aborted || error?.name === 'AbortError') {
					try {
						await writer.close()
					} catch {
						// Writer already closed/aborted, ignore
					}
					return
				}

				console.error('Stream error:', error)
				const errorMessage = error?.message || error?.toString() || 'Unknown error'
				const errorData = `data: ${JSON.stringify({ error: errorMessage })}\n\n`
				try {
					await writer.write(encoder.encode(errorData))
					await writer.close()
				} catch (writeError) {
					await writer.abort(writeError)
				}
			}
		})()

		return new Response(wrappedReadable, {
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
