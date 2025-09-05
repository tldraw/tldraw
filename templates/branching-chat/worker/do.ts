import { createOpenAI } from '@ai-sdk/openai'
import { ModelMessage, generateText, smoothStream, streamText } from 'ai'
import { DurableObject } from 'cloudflare:workers'
import { AutoRouter, IRequest, error } from 'itty-router'
import { Environment } from './types'

// Durable object (handles the actual request)
export class MyDurableObject extends DurableObject<Environment> {
	private readonly openai = createOpenAI({
		apiKey: this.env.OPENAI_API_KEY,
	})

	private readonly router = AutoRouter({
		catch: (e) => {
			console.error(e)
			return error(e)
		},
	})
		.post('/generate', (request) => this.generate(request))
		.post('/stream', (request) => this.stream(request))

	// entry point for all requests to the Durable Object
	fetch(request: IRequest): Response | Promise<Response> {
		return this.router.fetch(request)
	}

	// Generate a new response from the model
	private async generate(request: IRequest) {
		console.log('generate!')
		try {
			const prompt = (await request.json()) as Array<ModelMessage>
			console.log('generate', prompt)

			const { text } = await generateText({
				model: this.openai('gpt-5-nano'),
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
	private async stream(request: IRequest): Promise<Response> {
		try {
			const prompt = (await request.json()) as Array<ModelMessage>

			const result = streamText({
				model: this.openai('gpt-5-nano'),
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
