import { DESCRIBE_URL } from '../constants'

/**
 * Ask the worker to turn the current sketch into a short image-generation
 * prompt (via Claude vision). Returns the prompt, or throws on failure.
 *
 * This is how the template avoids forcing the user to write a prompt: the
 * settled sketch is described automatically, and that description is what steers
 * generation until the user types their own.
 */
export async function describeSketch(imageDataUrl: string, signal?: AbortSignal): Promise<string> {
	const response = await fetch(DESCRIBE_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ image: imageDataUrl }),
		signal,
	})

	if (!response.ok) {
		const err = (await response.json().catch(() => ({}))) as { error?: string }
		throw new Error(err.error ?? `Describe failed (${response.status})`)
	}

	const data = (await response.json()) as { prompt: string }
	return data.prompt
}
