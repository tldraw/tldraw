import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { ExecutionContext } from '@cloudflare/workers-types'
import { generateText, ModelMessage, smoothStream, streamText } from 'ai'
import { WorkerEntrypoint } from 'cloudflare:workers'
import { AutoRouter, error, IRequest } from 'itty-router'
import { Environment } from './types'

const MODEL_ID = 'gemini-3.8-flash'

// Worker (handles AI requests directly)
export default class extends WorkerEntrypoint<Environment> {
	private readonly router = AutoRouter<IRequest, [env: Environment, ctx: ExecutionContext]>({
		catch: (e) => {
			console.error(e)
			return error(e)
		},
	})
		.post('/generate', (request) => this.generate(request))
		.post('/stream', (request) => this.stream(request))

	override fetch(request: IRequest): Promise<Response> {
		return this.router.fetch(request, this.env, this.ctx)
	}

	private getModel(apiKey: string) {
		return createGoogleGenerativeAI({ apiKey })(MODEL_ID)
	}

	// Generate a new response from the model
	private async generate(request: IRequest) {
		const apiKey = request.headers.get('x-ai-api-key')?.trim()
		if (!apiKey) return new Response('A Google API key is required.', { status: 401 })
		try {
			const prompt = (await request.json()) as Array<ModelMessage>
			const { text } = await generateText({
				model: this.getModel(apiKey),
				messages: prompt,
			})

			// Send back the response as a JSON object
			return new Response(text, {
				headers: { 'Content-Type': 'application/json' },
			})
		} catch (error) {
			console.error('AI response error:', error)
			return new Response('An internal server error occurred.', {
				status: 500,
			})
		}
	}

	// Stream a new response from the model
	private async stream(request: IRequest): Promise<Response> {
		const apiKey = request.headers.get('x-ai-api-key')?.trim()
		if (!apiKey) return new Response('A Google API key is required.', { status: 401 })
		try {
			const prompt = (await request.json()) as Array<ModelMessage>

			const result = streamText({
				model: this.getModel(apiKey),
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
