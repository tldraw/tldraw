/** The fal realtime image-to-image model that turns the sketch into an image. */
export const REALTIME_MODEL = 'fal-ai/lcm-sd15-i2i'

/** Worker route the fal client proxies all of its requests through. */
export const FAL_PROXY_URL = '/api/fal/proxy'

/**
 * Worker route that turns the current sketch into an image-generation prompt
 * (via Claude vision), so the user doesn't have to write one.
 */
export const DESCRIBE_URL = '/api/describe'

/**
 * LCM is optimized for 512x512. We capture the sketch at this resolution and
 * ask fal to return the same size.
 */
export const CAPTURE_SIZE = 512

/**
 * How long to wait after the last edit before generating. We deliberately wait
 * for the stroke to settle (roughly a beat after the pen lifts) rather than
 * updating mid-stroke: each settled frame both auto-generates a prompt and
 * generates the image, and we don't want to fire those on every wobble.
 */
export const DEBOUNCE_MS = 600

/** Default generation controls. These are surfaced in the generation panel. */
export const DEFAULTS = {
	/**
	 * Empty by default: the prompt is written for you from the sketch (via
	 * Claude) once you start drawing. Type here to take over — see the panel.
	 */
	prompt: '',
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
