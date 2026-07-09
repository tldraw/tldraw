import { FAL_PROXY_URL, REALTIME_MODEL } from '../constants'

/** The input we send to the LCM image-to-image model on each frame. */
export interface RealtimeInput {
	/** The sketch, as a base64-encoded PNG data URL. */
	image_url: string
	prompt: string
	/** 0–1: how far the result may deviate from the sketch. */
	strength: number
	num_inference_steps: number
	guidance_scale: number
	seed: number
	/** Return the image inline as a data URL rather than a hosted file. */
	sync_mode: boolean
	enable_safety_checker: boolean
}

/** The result shape the model returns. */
interface FalResult {
	images?: Array<{ url: string; width: number; height: number }>
}

export interface RealtimeConnectionHandlers {
	onResult(imageUrl: string): void
	onError(error: unknown): void
}

/**
 * A connection to the LCM image-to-image model.
 *
 * This uses fal's synchronous HTTP endpoint (`fal.run/<model>`) through our
 * worker proxy rather than the realtime WebSocket. LCM returns in ~150–350ms,
 * so with the debounced send loop the experience is still effectively live, and
 * this avoids the WebSocket token-scoping fragility. Each `send` supersedes any
 * in-flight request so we never render a stale frame.
 */
export interface RealtimeConnection {
	send(input: RealtimeInput): void
	close(): void
}

export function createRealtimeConnection(handlers: RealtimeConnectionHandlers): RealtimeConnection {
	let closed = false
	// Monotonically increasing id so a slow response from an earlier frame can't
	// overwrite the result of a later one.
	let latestRequestId = 0
	let inFlight: AbortController | null = null

	async function send(input: RealtimeInput) {
		if (closed) return
		const requestId = ++latestRequestId

		// Cancel any request that is still in flight — its result is now stale.
		inFlight?.abort()
		const controller = new AbortController()
		inFlight = controller

		try {
			const response = await fetch(FAL_PROXY_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-fal-target-url': `https://fal.run/${REALTIME_MODEL}`,
				},
				body: JSON.stringify(input),
				signal: controller.signal,
			})

			if (!response.ok) {
				const text = await response.text()
				throw new Error(`fal error ${response.status}: ${text}`)
			}

			const data = (await response.json()) as FalResult
			// Ignore if a newer frame was sent while we were waiting.
			if (closed || requestId !== latestRequestId) return

			const url = data.images?.[0]?.url
			if (url) handlers.onResult(url)
		} catch (err) {
			// Aborted requests are expected when the user keeps drawing — ignore them.
			if (controller.signal.aborted) return
			handlers.onError(err)
		}
	}

	return {
		send(input) {
			void send(input)
		},
		close() {
			closed = true
			inFlight?.abort()
		},
	}
}
