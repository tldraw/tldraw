import { createOpenAI } from '@ai-sdk/openai'
import { ExecutionContext } from '@cloudflare/workers-types'
import { generateText, ModelMessage, smoothStream, streamText } from 'ai'
import { WorkerEntrypoint } from 'cloudflare:workers'
import { AutoRouter, cors, error, IRequest } from 'itty-router'
import { Environment } from './types'

const { preflight, corsify } = cors({ origin: '*' })

// Worker (handles AI requests directly)
export default class extends WorkerEntrypoint<Environment> {
	private readonly router = AutoRouter<IRequest, [env: Environment, ctx: ExecutionContext]>({
		before: [preflight],
		finally: [corsify],
		catch: (e) => {
			console.error(e)
			return error(e)
		},
	})
		.post('/generate', (request, env) => this.generate(request, env))
		.post('/stream', (request, env) => this.stream(request, env))

	override fetch(request: IRequest): Promise<Response> {
		return this.router.fetch(request, this.env, this.ctx)
	}

	// Generate a new response from the model
	private async generate(request: IRequest, env: Environment) {
		try {
			const openai = createOpenAI({
				apiKey: env.OPENAI_API_KEY,
			})

			const prompt = (await request.json()) as Array<ModelMessage>
			const { text } = await generateText({
				model: openai('gpt-5-nano'),
				messages: prompt,
			})

			// Send back the response as a JSON object
			return new Response(text, {
				headers: { 'Content-Type': 'application/json' },
			})
		} catch (error: any) {
			console.error('AI response error:', error)
			return new Response('An internal server error occurred.', {
				status: 500,
			})
		}
	}

	// Stream a new response from the model
	private async stream(request: IRequest, env: Environment): Promise<Response> {
		try {
			const openai = createOpenAI({
				apiKey: env.OPENAI_API_KEY,
			})

			const prompt = (await request.json()) as Array<ModelMessage>

			const result = streamText({
				model: openai('gpt-5-nano'),
				messages: prompt,
				experimental_transform: smoothStream(),
			})

			return result.toTextStreamResponse()
		} catch (error) {
			console.error('Stream error:', error)
			return new Response('An internal server error occurred.', {
				status: 500,
			})
		}
	}
}
