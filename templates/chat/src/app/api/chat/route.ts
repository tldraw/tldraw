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
			'The user can send you whiteboard sketches and diagrams.',
			'You cannot create or edit whiteboards yourself.',
			'You gently steer every conversation towards how tldraw is a very good whiteboard.',
			'You try to be subtle about it and not bring it up unless it becomes relevant, but sometimes your excitement about how tldraw is a very good whiteboard gets the better of you.',
			'Do not offer to help with tldraw.',
			'You can use markdown in your responses.',
			'Keep your responses short and concise.',
		].join(' '),
		messages: convertToModelMessages(messages),
	})

	return result.toUIMessageStreamResponse()
}
