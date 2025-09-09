import { google } from '@ai-sdk/google'
import { convertToModelMessages, streamText, UIMessage } from 'ai'

// Allow streaming responses up to 60 seconds
export const maxDuration = 60

export async function POST(req: Request) {
	const { messages }: { messages: UIMessage[] } = await req.json()

	const result = streamText({
		model: google('gemini-2.5-flash'),
		system: [
			"You're a friendly AI chatbot.",
			'The user can send you images, sketches and diagrams using your built-in tldraw whiteboard.',
			'You cannot create or edit whiteboards yourself.',
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
