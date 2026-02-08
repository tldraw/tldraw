import { IRequest } from 'itty-router'
import { resolveImage } from '../providers/types'

interface GenerateTextRequest {
	input?: string
	prompt: string
}

/**
 * POST /api/generate-text
 *
 * Takes an optional input (image or text) and a prompt, then calls
 * google/gemini-3-flash-preview on Replicate to generate text.
 * Falls back to a placeholder if no API token is configured.
 */
export async function handleGenerateText(request: IRequest, env: Env) {
	const body = (await request.json()) as GenerateTextRequest

	if (!body.prompt) {
		return new Response(JSON.stringify({ error: 'prompt is required' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		})
	}

	const apiToken = env.REPLICATE_API_TOKEN
	if (!apiToken) {
		return new Response(JSON.stringify(generateTextPlaceholder(body)), {
			headers: { 'Content-Type': 'application/json' },
		})
	}

	// Detect whether the input is an image or text
	const isImage =
		body.input != null &&
		(body.input.startsWith('data:image/') || body.input.startsWith('/api/images/'))

	try {
		// Build the prompt — if input is text, prepend it to the prompt
		let prompt = body.prompt
		if (body.input && !isImage) {
			prompt = `Context:\n${body.input}\n\n${body.prompt}`
		}

		// Build the images array if we have an image input
		const images: string[] = []
		if (body.input && isImage) {
			const { dataUrl } = await resolveImage(body.input, env)
			images.push(dataUrl)
		}

		const input: Record<string, unknown> = {
			prompt,
			max_output_tokens: 1024,
		}
		if (images.length > 0) {
			input.images = images
		}

		const response = await fetch(
			'https://api.replicate.com/v1/models/google/gemini-2.5-flash/predictions',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${apiToken}`,
					Prefer: 'wait',
				},
				body: JSON.stringify({ input }),
			}
		)

		if (!response.ok) {
			const err = await response.text()
			throw new Error(`Replicate error: ${response.status} ${err}`)
		}

		const result = (await response.json()) as { output?: string | string[] }
		const output = Array.isArray(result.output) ? result.output.join('') : result.output
		if (!output) throw new Error('No output from text generation')

		return new Response(JSON.stringify({ text: output }), {
			headers: { 'Content-Type': 'application/json' },
		})
	} catch (e: any) {
		console.error('Generate text error:', e)
		return new Response(JSON.stringify({ error: e.message ?? 'Text generation failed' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		})
	}
}

function generateTextPlaceholder(body: GenerateTextRequest): { text: string } {
	const isImage =
		body.input != null &&
		(body.input.startsWith('data:image/') || body.input.startsWith('/api/images/'))
	const inputDesc = body.input
		? isImage
			? '[image provided]'
			: `[text: "${body.input.slice(0, 40)}${body.input.length > 40 ? '...' : ''}"]`
		: '[no input]'
	return {
		text: `[Placeholder] Prompt: "${body.prompt.slice(0, 60)}${body.prompt.length > 60 ? '...' : ''}" | Input: ${inputDesc} — Set REPLICATE_API_TOKEN for real text generation.`,
	}
}
