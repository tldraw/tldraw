import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { ExecutionContext } from '@cloudflare/workers-types'
import { convertToModelMessages, streamText, UIMessage } from 'ai'
import { WorkerEntrypoint } from 'cloudflare:workers'
import { AutoRouter, error, IRequest } from 'itty-router'
import { Buffer } from 'node:buffer'
import { Environment } from './types'

// Worker (handles AI requests directly)
export default class extends WorkerEntrypoint<Environment> {
	private readonly router = AutoRouter<IRequest, [env: Environment, ctx: ExecutionContext]>({
		catch: (e) => {
			console.error(e)
			return error(e)
		},
	})
		.post('/api/chat', (request, env) => this.chat(request, env))
		.post('/api/upload', (request, env) => this.upload(request, env))
		.get('/api/files/:fileId', (request, env) => this.getFile(request, env))

	override fetch(request: IRequest): Promise<Response> {
		return this.router.fetch(request, this.env, this.ctx)
	}

	private getModel(env: Environment) {
		return createGoogleGenerativeAI({
			apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
		})
	}

	// Handle chat requests (streaming)
	private async chat(request: IRequest, env: Environment) {
		const { messages }: { messages: UIMessage[] } = await request.json()

		const url = new URL(request.url)
		const localPrefix = `${url.origin}/api/files/`
		if (localPrefix.includes('localhost')) {
			for (const message of messages) {
				for (const part of message.parts) {
					if (part.type === 'file' && part.url.startsWith(localPrefix)) {
						const fileId = part.url.slice(localPrefix.length)
						const file = await env.CHAT_FILES.get(fileId)
						if (!file) continue
						const buffer = Buffer.from(await file.arrayBuffer())
						part.url = `data:${file.httpMetadata?.contentType || 'application/octet-stream'};base64,${buffer.toString('base64')}`
					}
				}
			}
		}

		const result = streamText({
			model: this.getModel(env)('gemini-2.5-flash-image-preview'),
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

	// Generate a unique file ID
	private generateFileId(): string {
		return crypto.randomUUID()
	}

	// Handle file upload requests to R2
	private async upload(request: IRequest, env: Environment) {
		const contentType = request.headers.get('content-type')
		if (!contentType) {
			return new Response('content-type is not set', { status: 400 })
		}

		const displayName = request.headers.get('x-file-name')
		if (!displayName) {
			return new Response('x-file-name is not set', { status: 400 })
		}

		const fileId = this.generateFileId()
		const fileKey = fileId

		// Upload file to R2
		await env.CHAT_FILES.put(fileKey, await request.blob(), {
			httpMetadata: {
				contentType: contentType,
			},
		})

		// Calculate expiration time (24 hours from now)
		const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

		// Return the full file URL using the request origin
		const url = new URL(request.url)
		const uploadedUrl = `${url.origin}/api/files/${fileId}`

		return Response.json({
			uploadedUrl,
			expiresAt,
		})
	}

	// Handle file serving from R2
	private async getFile(request: IRequest, env: Environment) {
		const fileId = request.params?.fileId
		if (!fileId) {
			return new Response('File ID is required', { status: 400 })
		}

		// Get the file directly using the fileId as the key
		const object = await env.CHAT_FILES.get(fileId)

		if (!object) {
			return new Response('File not found', { status: 404 })
		}

		// Return the file with appropriate headers
		return new Response(object.body, {
			headers: {
				'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
				'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
			},
		})
	}
}
