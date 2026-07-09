/** The fal realtime image-to-image model that turns the sketch into an image. */
export const REALTIME_MODEL = 'fal-ai/lcm-sd15-i2i'

/** Worker route the fal client proxies all of its requests through. */
export const FAL_PROXY_URL = '/api/fal/proxy'

/**
 * LCM is optimized for 512x512. We capture the sketch at this resolution and
 * ask fal to return the same size.
 */
export const CAPTURE_SIZE = 512

/**
 * How long to wait after the last edit before sending a new frame. LCM returns
 * in ~150ms, so a short debounce keeps the loop feeling live without flooding
 * the socket while the user is mid-stroke.
 */
export const DEBOUNCE_MS = 120

/** Default generation controls. These are surfaced in the generation panel. */
export const DEFAULTS = {
	prompt: 'a detailed pencil illustration of a cat, soft lighting',
	/**
	 * How much the model is allowed to deviate from the sketch. Lower keeps the
	 * result close to what you drew; higher leans on the prompt.
	 */
	strength: 0.75,
	/** LCM needs very few steps. */
	steps: 4,
	guidanceScale: 1,
	seed: 42,
} as const
