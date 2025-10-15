import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { ExecutionContext } from '@cloudflare/workers-types'
import { generateText, ModelMessage, smoothStream, streamText } from 'ai'
import { WorkerEntrypoint } from 'cloudflare:workers'
import { AutoRouter, error, IRequest } from 'itty-router'
import { Environment } from './types'

// Worker (handles AI requests directly)
export default class extends WorkerEntrypoint<Environment> {
	private readonly router = AutoRouter<IRequest, [env: Environment, ctx: ExecutionContext]>({
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

	private getModel(env: Environment) {
		return createGoogleGenerativeAI({
			apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
		})
	}

	// Generate a new response from the model
	private async generate(request: IRequest, env: Environment) {
		try {
			const prompt = (await request.json()) as Array<ModelMessage>
			const { text } = await generateText({
				model: this.getModel(env)('gemini-2.5-flash'),
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
			const prompt = (await request.json()) as Array<ModelMessage>

			const result = streamText({
				model: this.getModel(env)('gemini-2.5-flash'),
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
