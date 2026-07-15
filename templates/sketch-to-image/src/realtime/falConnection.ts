import { FAL_PROXY_URL, REALTIME_MODEL } from '../constants'

/**
 * How many times to retry a frame that failed with a transient network error,
 * and the base backoff between tries (grows linearly per attempt). Tuned to ride
 * out the worker's cold-start / hot-reload window on a fresh `yarn dev` without
 * noticeably delaying a real error.
 */
const MAX_TRANSIENT_RETRIES = 2
const RETRY_BACKOFF_MS = 400

/**
 * How long to wait for a single fal request before giving up on it. LCM itself
 * returns in ~1s once the connection is warm, but the *first* request on a fresh
 * `yarn dev` (or right after a hot-reload restarts the dev worker) stalls while
 * the Cloudflare Vite dev worker establishes its outbound connection to fal —
 * measured at ~20–35s on a real 512px sketch. This timeout has to outlast that
 * cold window, or the first generation can never succeed: it aborts mid-handshake
 * every time, and aborting *restarts* the stall, so retries don't help either.
 *
 * We deliberately do NOT retry on timeout. Aborting a request that is stalled on
 * a cold connection throws away the handshake in progress; a single long wait
 * rides it out, whereas abort-and-retry just re-triggers the cold start. Genuine
 * network drops (fetch threw) are still retried below.
 */
const REQUEST_TIMEOUT_MS = 45000

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Sentinel thrown when a request exceeds REQUEST_TIMEOUT_MS. */
class TimeoutError extends Error {}

/**
 * True when a fetch failed at the network level (the request never got an HTTP
 * response) rather than the server returning an error status. On a fresh dev
 * start this is the worker not yet accepting connections; those are worth a
 * retry, whereas a real fal HTTP error is thrown with a `fal error <status>`
 * message and should surface immediately. A failed `fetch` rejects with a
 * TypeError ("Failed to fetch"), which is what we key on.
 */
function isNetworkError(err: unknown): boolean {
	return err instanceof TypeError
}

/**
 * True when the caught error is our request timeout firing. The timeout aborts
 * the controller with a `TimeoutError` reason, so the rejected fetch surfaces
 * either that error directly or an AbortError whose `signal.reason` is it.
 */
function isTimeout(err: unknown, controller: AbortController): boolean {
	return err instanceof TimeoutError || controller.signal.reason instanceof TimeoutError
}

/** The input we send to the LCM image-to-image model on each frame. */
export interface RealtimeInput {
	/** The sketch, as a base64-encoded PNG data URL. */
	image_url: string
	prompt: string
	/** Steers the model away from unwanted (here, unsafe) content. */
	negative_prompt: string
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
	/**
	 * Called when a frame's fetch to fal is actually opened (i.e. we're now waiting
	 * on the network), so the UI can show "connecting to fal" distinctly from the
	 * local capture/describe work that precedes it. On a cold dev worker this is
	 * where the multi-second stall lives — surfacing it keeps a long wait legible.
	 */
	onConnecting?(): void
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
		if (closed) {
			// A send arrived after this connection was torn down. In production this
			// is a harmless race; during dev it's usually a stale hot-reloaded
			// closure holding an old connection — surface it so a "prompt updates
			// but image doesn't" symptom isn't a silent mystery. Reload the page.
			if (import.meta.env.DEV) {
				console.warn(
					'[sketch-to-image] Ignored a frame sent to a closed realtime connection. ' +
						'If the image stopped updating after a code edit, reload the page.'
				)
			}
			return
		}
		const requestId = ++latestRequestId

		// Cancel any request that is still in flight — its result is now stale.
		inFlight?.abort()
		const controller = new AbortController()
		inFlight = controller

		// This frame is still the current one (not superseded, aborted, or closed).
		const isCurrent = () => !closed && !controller.signal.aborted && requestId === latestRequestId

		// Retry only transient *network* failures (fetch threw) — the worker isn't
		// accepting connections yet on a fresh dev start, or a hot-reload restarted
		// it mid-request. A real fal HTTP error (!response.ok) is not retried. We
		// keep this bounded and short so it absorbs the cold-start window without
		// masking genuine outages or stacking work behind a newer frame.
		for (let attempt = 0; ; attempt++) {
			// Give this attempt its own timeout that aborts the fetch. A wedged dev
			// worker otherwise leaves the fetch pending forever.
			const timeoutId = setTimeout(() => controller.abort(new TimeoutError()), REQUEST_TIMEOUT_MS)
			try {
				// Signal that we're now waiting on the network (fal), not local work.
				if (isCurrent()) handlers.onConnecting?.()
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
				if (!isCurrent()) return

				const url = data.images?.[0]?.url
				if (url) handlers.onResult(url)
				return
			} catch (err) {
				// A timeout fired: the request stalled past REQUEST_TIMEOUT_MS. We do
				// not retry — the timeout is tuned to outlast a cold-connection stall, so
				// hitting it means something is genuinely wrong (not a cold start), and
				// re-issuing would only restart the handshake. Surface it so the user can
				// click Generate again.
				if (isTimeout(err, controller)) {
					if (closed || requestId !== latestRequestId) return
					handlers.onError(
						new Error(
							`fal request timed out after ${Math.round(
								REQUEST_TIMEOUT_MS / 1000
							)}s — check the worker logs, then click Generate again.`
						)
					)
					return
				}
				// Aborted / superseded requests are expected when the user keeps
				// drawing — drop them silently.
				if (!isCurrent()) return
				// A network-level failure (fetch threw, not a fal HTTP error) during
				// startup: wait a beat and retry, up to the cap.
				if (isNetworkError(err) && attempt < MAX_TRANSIENT_RETRIES) {
					await delay(RETRY_BACKOFF_MS * (attempt + 1))
					if (!isCurrent()) return
					continue
				}
				handlers.onError(err)
				return
			} finally {
				clearTimeout(timeoutId)
			}
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
