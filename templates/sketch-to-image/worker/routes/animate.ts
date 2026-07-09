import { IRequest } from 'itty-router'

/**
 * Request body for the /api/animate endpoint.
 */
interface AnimateRequest {
	/** The image to animate, as an https URL or a data: URL. */
	imageUrl: string
	/** Optional prompt describing the motion. */
	prompt?: string
}

/**
 * The fal model used to turn a still image into a short video clip.
 *
 * Seedance is an image/text-to-video model — unlike the realtime sketch loop,
 * this is a queued, multi-second generation, so it is a deliberate "click to
 * animate" action rather than something that runs live as you draw.
 */
const VIDEO_MODEL = 'fal-ai/bytedance/seedance/v1/lite/image-to-video'

/**
 * POST /api/animate
 *
 * Turns a generated image into a short video via fal's Seedance endpoint.
 *
 * This is the secondary, non-realtime feature of the template. It is
 * intentionally minimal: it submits the job and waits for the result. For
 * production you'd likely want to move to fal's async queue with status polling
 * so long generations don't hold the request open.
 *
 * Returns: { videoUrl: string }
 */
export async function handleAnimate(request: IRequest, env: Env): Promise<Response> {
	const falKey = env.FAL_KEY
	if (!falKey || falKey === 'your_fal_key_here') {
		return json({ error: 'FAL_KEY is not configured. Add it to .dev.vars.' }, 500)
	}

	const body = (await request.json()) as AnimateRequest
	if (!body.imageUrl) {
		return json({ error: 'imageUrl is required' }, 400)
	}

	try {
		const response = await fetch(`https://fal.run/${VIDEO_MODEL}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Key ${falKey}`,
			},
			body: JSON.stringify({
				image_url: body.imageUrl,
				prompt: body.prompt ?? '',
			}),
		})

		if (!response.ok) {
			const text = await response.text()
			throw new Error(`fal animate error ${response.status}: ${text}`)
		}

		const data = (await response.json()) as { video?: { url?: string } }
		const videoUrl = data.video?.url
		if (!videoUrl) {
			throw new Error('fal did not return a video URL')
		}

		return json({ videoUrl }, 200)
	} catch (e: any) {
		console.error('Animate error:', e)
		return json({ error: e.message ?? 'Animation failed' }, 500)
	}
}

function json(body: unknown, status: number): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	})
}
