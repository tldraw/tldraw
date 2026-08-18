import { error, IRequest, json } from 'itty-router'
import { replicatePredict } from '../providers/replicate'
import { resolveImage } from '../providers/types'

interface GenerateTextRequest {
	input?: string
	prompt: string
}

function isImageInput(input: string) {
	return (
		input.startsWith('data:image/') ||
		input.startsWith('/api/images/') ||
		input.startsWith('https://') ||
		input.startsWith('http://')
	)
}

function truncate(text: string, max: number) {
	return text.length > max ? `${text.slice(0, max)}...` : text
}

/**
 * Takes an optional input (image or text) and a prompt, then calls
 * google/gemini-3-flash on Replicate. Falls back to a placeholder if no API token.
 */
export async function handleGenerateText(request: IRequest, env: Env) {
	const body = (await request.json()) as GenerateTextRequest

	if (!body.prompt) return error(400, 'prompt is required')

	// Coerce input to string so downstream .startsWith() never crashes
	const inputStr = body.input != null ? String(body.input) : null
	const isImage = inputStr != null && isImageInput(inputStr)

	const apiToken = env.REPLICATE_API_TOKEN
	if (!apiToken) {
		const inputDesc = inputStr
			? isImage
				? '[image provided]'
				: `[text: "${truncate(inputStr, 40)}"]`
			: '[no input]'
		return json({
			text: `[Placeholder] Prompt: "${truncate(body.prompt, 60)}" | Input: ${inputDesc} — Set REPLICATE_API_TOKEN for real text generation.`,
		})
	}

	const input: Record<string, unknown> = {
		prompt: inputStr && !isImage ? `Context:\n${inputStr}\n\n${body.prompt}` : body.prompt,
		max_output_tokens: 1024,
	}
	if (inputStr && isImage) {
		input.images = [(await resolveImage(inputStr, env)).dataUrl]
	}

	const result = await replicatePredict('google/gemini-3-flash', input, apiToken)
	const output = Array.isArray(result.output) ? result.output.join('') : result.output
	if (!output) throw new Error('No output from text generation')

	return json({ text: output })
}
