import { IRequest } from 'itty-router'

/**
 * Request body for the /api/describe endpoint.
 */
interface DescribeRequest {
	/**
	 * The sketch to describe, as a base64 PNG data URL
	 * (`data:image/png;base64,...`).
	 */
	image: string
}

/** The Anthropic model used to turn a sketch into an image-generation prompt. */
const DESCRIBE_MODEL = 'claude-haiku-4-5'

/** Anthropic Messages API endpoint. */
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

/**
 * Instruction given to Claude. We want a short, positive, image-generation
 * style prompt describing what the sketch should *become* — not a caption of
 * the strokes themselves. LCM leans on the prompt for style and detail, so the
 * result reads best as a concrete subject plus a rendering style.
 */
const SYSTEM_PROMPT = [
	'You turn rough sketches into prompts for an image generator.',
	'Look at the drawing and write a single short prompt (one line, under 20 words)',
	'describing what the finished image should be: the subject, plus a fitting art',
	'style, lighting, or medium. Interpret loose strokes generously.',
	'Reply with only the prompt text — no quotes, no preamble, no explanation.',
].join(' ')

/**
 * POST /api/describe
 *
 * Looks at the current sketch and returns a short image-generation prompt,
 * so the user doesn't have to write one themselves. The Anthropic key is
 * injected server-side and never reaches the browser — mirroring the fal proxy.
 *
 * Returns: { prompt: string }
 */
export async function handleDescribe(request: IRequest, env: Env): Promise<Response> {
	const apiKey = env.ANTHROPIC_API_KEY
	if (!apiKey || apiKey === 'your_anthropic_key_here') {
		return json(
			{ error: 'ANTHROPIC_API_KEY is not configured. Add it to .dev.vars (see the README).' },
			500
		)
	}

	const body = (await request.json()) as DescribeRequest
	if (!body.image) {
		return json({ error: 'image is required' }, 400)
	}

	// The Anthropic image block wants the raw base64 and a media type, not a
	// full data URL — split the `data:image/png;base64,` prefix off.
	const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(body.image)
	if (!match) {
		return json({ error: 'image must be a base64 PNG data URL' }, 400)
	}
	const [, mediaType, base64Data] = match

	try {
		const response = await fetch(ANTHROPIC_API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': apiKey,
				'anthropic-version': '2023-06-01',
			},
			body: JSON.stringify({
				model: DESCRIBE_MODEL,
				max_tokens: 64,
				system: SYSTEM_PROMPT,
				messages: [
					{
						role: 'user',
						content: [
							{
								type: 'image',
								source: { type: 'base64', media_type: mediaType, data: base64Data },
							},
							{ type: 'text', text: 'Write the image-generation prompt for this sketch.' },
						],
					},
				],
			}),
		})

		if (!response.ok) {
			const text = await response.text()
			throw new Error(`Anthropic error ${response.status}: ${text}`)
		}

		const data = (await response.json()) as {
			content?: Array<{ type: string; text?: string }>
		}
		const prompt = data.content
			?.filter((block) => block.type === 'text')
			.map((block) => block.text ?? '')
			.join('')
			.trim()

		if (!prompt) {
			throw new Error('Anthropic did not return a prompt')
		}

		return json({ prompt }, 200)
	} catch (e: any) {
		console.error('Describe error:', e)
		return json({ error: e.message ?? 'Describe failed' }, 500)
	}
}

function json(body: unknown, status: number): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	})
}
