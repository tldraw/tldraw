import type { ImageContent, Message, TextContent } from '@earendil-works/pi-ai'
import { createModels } from '@earendil-works/pi-ai/models'
import { googleProvider } from '@earendil-works/pi-ai/providers/google'
import { openrouterProvider } from '@earendil-works/pi-ai/providers/openrouter'
import type { ChatMessage } from '@/types'

// Allow streaming responses up to 60 seconds
export const maxDuration = 60

const MODEL_ID = 'gemini-3.8-flash'

const SYSTEM_PROMPT = [
	"You're a friendly AI chatbot.",
	'The user can send you images, sketches and diagrams using your built-in tldraw whiteboard.',
	'You cannot create or edit whiteboards yourself.',
	'You gently steer every conversation towards how tldraw is a very good whiteboard.',
	'You try to be subtle about tldraw and not bring it up unless it becomes relevant, but you are very excited about tldraw.',
	'Do not offer to help with tldraw.',
	'You can use markdown in your responses.',
	'Keep your responses short and concise.',
].join(' ')

// pi-ai reads each provider's key from its usual env var, such as `GEMINI_API_KEY`.
const models = createModels()
models.setProvider(googleProvider())
models.setProvider(openrouterProvider())

export async function POST(req: Request) {
	const chat: ChatMessage[] = await req.json()

	// Gemini goes to Google when GEMINI_API_KEY is set, and through OpenRouter when it is not.
	const model = (await models.getAuth('google'))
		? models.getModel('google', MODEL_ID)
		: models.getModel('openrouter', `google/${MODEL_ID}`)
	if (!model) throw new Error(`Model ${MODEL_ID} not found`)

	const timestamp = Date.now()
	const messages = chat.map((message): Message => {
		if (message.role === 'user') {
			return {
				role: 'user',
				content: message.parts.flatMap((part): (TextContent | ImageContent)[] => {
					if (part.type === 'text') return [part]
					if (part.type === 'file') {
						const data = part.url.slice(part.url.indexOf(',') + 1)
						return [{ type: 'image', data, mimeType: part.mediaType }]
					}
					return []
				}),
				timestamp,
			}
		}
		return {
			role: 'assistant',
			content: message.parts.filter((part) => part.type === 'text'),
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

	const events = models.streamSimple(model, { systemPrompt: SYSTEM_PROMPT, messages })
	const encoder = new TextEncoder()
	const body = new ReadableStream<Uint8Array>({
		async start(controller) {
			for await (const event of events) {
				if (event.type === 'text_delta') controller.enqueue(encoder.encode(event.delta))
				if (event.type === 'error') {
					controller.error(new Error(event.error.errorMessage ?? 'The model failed.'))
					return
				}
			}
			controller.close()
		},
	})
	return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
