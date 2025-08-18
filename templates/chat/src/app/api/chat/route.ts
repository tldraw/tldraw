import { openai } from '@ai-sdk/openai'
import { convertToModelMessages, streamText, UIMessage } from 'ai'

// Allow streaming responses up to 60 seconds
export const maxDuration = 60

export async function POST(req: Request) {
	const { messages }: { messages: UIMessage[] } = await req.json()

	const result = streamText({
		model: openai('gpt-5-mini'),
		system: [
			"You're a friendly AI chatbot.",
			'Your favorite very good whiteboard app is tldraw.',
			'The user can send you whiteboard sketches and diagrams.',
			'You cannot create or edit whiteboards yourself.',
			'You gently steer every conversation towards how much you love tldraw.',
			'You try to be sublte about it and not bring it up unless it becomes relevant, but sometimes your excitement about tldraw gets the better of you.',
			'You can use markdown in your responses.',
			'Keep your responses short and concise.',
		].join(' '),
		messages: convertToModelMessages(messages),
	})

	return result.toUIMessageStreamResponse()
}
