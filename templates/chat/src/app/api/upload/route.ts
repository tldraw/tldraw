import { GoogleGenAI } from '@google/genai'

export async function POST(req: Request) {
	const apiKey = req.headers.get('x-ai-api-key')?.trim()
	if (!apiKey) {
		return new Response('A Google API key is required.', { status: 401 })
	}

	const contentType = req.headers.get('content-type')
	if (!contentType) {
		return new Response('content-type is not set', { status: 400 })
	}

	const displayName = req.headers.get('x-file-name')
	if (!displayName) {
		return new Response('x-file-name is not set', { status: 400 })
	}

	const ai = new GoogleGenAI({ apiKey })

	const file = await ai.files.upload({
		file: await req.blob(),
		config: { mimeType: contentType, displayName },
	})

	return Response.json({ uploadedUrl: file.uri, expiresAt: file.expirationTime })
}
