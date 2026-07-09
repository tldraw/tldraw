import { DESCRIBE_URL } from '../constants'

/**
 * How the sketch should be described:
 * - `art`: a creative image-generation prompt (subject + style).
 * - `pose`: a realistic full-body photograph of a person in the drawn pose,
 *   so the generated image works as a reference for pose estimation.
 */
export type DescribeMode = 'art' | 'pose'

/**
 * Ask the worker to turn the current sketch into a short image-generation
 * prompt (via Claude vision). Returns the prompt, or throws on failure.
 *
 * This is how the template avoids forcing the user to write a prompt: the
 * settled sketch is described automatically, and that description is what steers
 * generation until the user types their own. `mode` selects an artistic prompt
 * or a pose-reference photo prompt (see {@link DescribeMode}).
 */
export async function describeSketch(
	imageDataUrl: string,
	signal?: AbortSignal,
	mode: DescribeMode = 'art'
): Promise<string> {
	const response = await fetch(DESCRIBE_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ image: imageDataUrl, mode }),
		signal,
	})

	if (!response.ok) {
		const err = (await response.json().catch(() => ({}))) as { error?: string }
		throw new Error(err.error ?? `Describe failed (${response.status})`)
	}

	const data = (await response.json()) as { prompt: string }
	return data.prompt
}
