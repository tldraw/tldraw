import { AgentAction, AgentPrompt, Streaming } from '@tldraw/fairy-shared'
import { DurableObject } from 'cloudflare:workers'
import { Environment } from '../environment'
import { AgentService } from './AgentService'

export class AgentDurableObject extends DurableObject<Environment> {
	service: AgentService
	// Cumulative token usage tracking per agent ID
	private cumulativeUsageByAgentId = new Map<
		string,
		{
			promptTokens: number
			completionTokens: number
			totalTokens: number
			cachedInputTokens: number
		}
	>()

	constructor(ctx: DurableObjectState, env: Environment) {
		super(ctx, env)
		this.service = new AgentService(this.env, (usage, agentId) => this.trackUsage(usage, agentId))
	}

	private trackUsage(
		usage: {
			inputTokens?: number
			outputTokens?: number
			totalTokens?: number
			cachedInputTokens?: number
		},
		agentId?: string
	) {
		const promptTokens = usage.inputTokens || 0
		const completionTokens = usage.outputTokens || 0
		const totalTokens = usage.totalTokens || 0
		const cachedInputTokens = usage.cachedInputTokens || 0

		// Use a fallback key if agentId is not provided
		const key = agentId || '<unknown>'

		// Get or initialize cumulative usage for this agent
		let agentUsage = this.cumulativeUsageByAgentId.get(key)
		if (!agentUsage) {
			agentUsage = {
				promptTokens: 0,
				completionTokens: 0,
				totalTokens: 0,
				cachedInputTokens: 0,
			}
			this.cumulativeUsageByAgentId.set(key, agentUsage)
		}

		// Update cumulative usage for this agent
		agentUsage.promptTokens += promptTokens
		agentUsage.completionTokens += completionTokens
		agentUsage.totalTokens += totalTokens
		agentUsage.cachedInputTokens += cachedInputTokens

		// console.warn('[Token Usage]', {
		// 	agentId,
		// 	request: {
		// 		promptTokens,
		// 		completionTokens,
		// 		totalTokens,
		// 		cachedInputTokens,
		// 	},
		// 	cumulative: { ...agentUsage },
		// })
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

				const isAdmin = request.headers.get('X-Is-Admin') === 'true'
				for await (const action of this.service.streamActions(prompt, isAdmin)) {
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
