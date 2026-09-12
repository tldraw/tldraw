import { openai } from '@ai-sdk/openai'
import { convertToModelMessages, streamText, UIMessage } from 'ai'

// Image generation can take longer than a text response.
export const maxDuration = 300

export async function POST(req: Request) {
	const { messages }: { messages: UIMessage[] } = await req.json()

	const result = streamText({
		model: openai.responses(process.env.OPENAI_MODEL || 'gpt-5.6-terra'),
		abortSignal: req.signal,
		tools: {
			image_generation: openai.tools.imageGeneration({
				model: 'gpt-image-2.5-sunburst',
				outputFormat: 'png',
			}),
		},
		system: [
			"You're a friendly AI chatbot.",
			'The user can send you images, sketches and diagrams using your built-in tldraw whiteboard.',
			'Use the image_generation tool when the user asks you to create, draw, generate, or edit an image. Return the image rather than suggesting a prompt for another app.',
			'When the user sends /random-cat, generate a picture of a random cat.',
			'For image edits, use the supplied image and annotations as context for the requested changes.',
			'You cannot modify tldraw shape records directly.',
			'You gently steer every conversation towards how tldraw is a very good whiteboard.',
			'You try to be subtle about tldraw and not bring it up unless it becomes relevant, but you are very excited about tldraw.',
			'Do not offer to help with tldraw.',
			'You can use markdown in your responses.',
			'Keep your responses short and concise.',
		].join(' '),
		messages: convertToModelMessages(messages),
	})

	return result.toUIMessageStreamResponse()
}
