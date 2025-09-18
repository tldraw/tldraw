import { GoogleGenAI } from '@google/genai'

export async function POST(req: Request) {
	const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
	if (!apiKey) {
		return new Response('GOOGLE_GENERATIVE_AI_API_KEY is not set', { status: 500 })
	}

	const contentType = req.headers.get('content-type')
	if (!contentType) {
		return new Response('content-type is not set', { status: 400 })
	}

	const displayName = req.headers.get('x-file-name')
	if (!displayName) {
		return new Response('x-file-name is not set', { status: 400 })
	}

	const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY })

	const file = await ai.files.upload({
		file: await req.blob(),
		config: {
			mimeType: contentType,
			displayName,
		},
	})

	return Response.json({ uploadedUrl: file.uri, expiresAt: file.expirationTime })
}
