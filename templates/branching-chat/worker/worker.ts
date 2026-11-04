import { ExecutionContext } from '@cloudflare/workers-types'
import type { Api, Message, Model } from '@earendil-works/pi-ai'
import { createModels } from '@earendil-works/pi-ai/models'
import { googleProvider } from '@earendil-works/pi-ai/providers/google'
import { openrouterProvider } from '@earendil-works/pi-ai/providers/openrouter'
import { WorkerEntrypoint } from 'cloudflare:workers'
import { AutoRouter, error, IRequest } from 'itty-router'
import { ChatMessage, Environment } from './types'

const MODEL_ID = 'gemini-3.8-flash'

// pi-ai reads each provider's key from its usual env var, such as `GEMINI_API_KEY`.
function createWorkerModels(env: Environment) {
	const models = createModels({
		authContext: {
			env: async (name) => {
				const value = (env as unknown as Record<string, unknown>)[name]
				return typeof value === 'string' && value ? value : undefined
			},
			fileExists: async () => false,
		},
	})
	models.setProvider(googleProvider())
	models.setProvider(openrouterProvider())
	return models
}

// Worker (handles AI requests directly)
export default class extends WorkerEntrypoint<Environment> {
	private readonly router = AutoRouter<IRequest, [env: Environment, ctx: ExecutionContext]>({
		catch: (e) => {
			console.error(e)
			return error(e)
		},
	}).post('/stream', (request) => this.stream(request))

	private readonly models = createWorkerModels(this.env)

	override fetch(request: IRequest): Promise<Response> {
		return this.router.fetch(request, this.env, this.ctx)
	}

	// Gemini goes to Google when GEMINI_API_KEY is set, and through OpenRouter when it is not.
	private async getModel(): Promise<Model<Api>> {
		const model = (await this.models.getAuth('google'))
			? this.models.getModel('google', MODEL_ID)
			: this.models.getModel('openrouter', `google/${MODEL_ID}`)
		if (!model) throw new Error(`Model ${MODEL_ID} not found`)
		return model
	}

	// Stream a new response from the model as plain text
	private async stream(request: IRequest): Promise<Response> {
		const chat = (await request.json()) as ChatMessage[]
		const model = await this.getModel()
		const messages = chat.map((message): Message => {
			const timestamp = Date.now()
			if (message.role === 'user') return { role: 'user', content: message.content, timestamp }
			return {
				role: 'assistant',
				content: [{ type: 'text', text: message.content }],
				api: model.api,
				provider: model.provider,
				model: model.id,
				usage: {
					input: 0,
					output: 0,
					cacheRead: 0,
					cacheWrite: 0,
					totalTokens: 0,
					cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
				},
				stopReason: 'stop',
				timestamp,
			}
		})

		const events = this.models.streamSimple(model, { messages })
		const encoder = new TextEncoder()
		const body = new ReadableStream<Uint8Array>({
			async start(controller) {
				for await (const event of events) {
					if (event.type === 'text_delta') controller.enqueue(encoder.encode(event.delta))
					if (event.type === 'error') {
						const message = event.error.errorMessage ?? 'The model failed.'
						console.error('Stream error:', message)
						controller.error(new Error(message))
						return
					}
				}
				controller.close()
			},
		})
		return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
	}
}
