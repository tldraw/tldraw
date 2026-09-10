export async function POST(req: Request) {
	const apiKey = process.env.OPENAI_API_KEY
	if (!apiKey) {
		return Response.json({ error: 'OPENAI_API_KEY is not set' }, { status: 500 })
	}

	const contentType = req.headers.get('content-type')
	if (!contentType) {
		return Response.json({ error: 'content-type is not set' }, { status: 400 })
	}

	const displayName = req.headers.get('x-file-name')
	if (!displayName) {
		return Response.json({ error: 'x-file-name is not set' }, { status: 400 })
	}

	const formData = new FormData()
	formData.set('file', await req.blob(), displayName)
	formData.set('purpose', 'vision')
	formData.set('expires_after[anchor]', 'created_at')
	formData.set('expires_after[seconds]', '86400')

	const response = await fetch('https://api.openai.com/v1/files', {
		method: 'POST',
		headers: { Authorization: `Bearer ${apiKey}` },
		body: formData,
		signal: req.signal,
	})

	if (!response.ok) {
		return Response.json(
			{ error: 'OpenAI could not upload the image. Check your API key and try again.' },
			{ status: 502 }
		)
	}

	const file: { id: string; expires_at: number } = await response.json()
	if (!file.id?.startsWith('file-') || !Number.isFinite(file.expires_at)) {
		return Response.json({ error: 'OpenAI returned an invalid file upload.' }, { status: 502 })
	}

	return Response.json({
		provider: 'openai',
		fileId: file.id,
		expiresAt: new Date(file.expires_at * 1000).toISOString(),
	})
}
