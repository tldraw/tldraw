export const NEARBY_MARGIN = 400
export const MAX_AGENT_ITERATIONS = 10
export const ERROR_CLEAR_DELAY_MS = 5000

export const ELEVENLABS_DEFAULT_VOICE_ID = 'A9evEp8yGjv4c3WsIKuY'

/** Set to true to use the browser's built-in speechSynthesis instead of ElevenLabs. */
export const USE_BROWSER_TTS = false

/**
 * Use the Gemini Live API for voice (low-latency bidi streaming) instead of
 * the webkitSpeechRecognition + ElevenLabs pipeline. The Live model holds
 * the conversation; canvas-touching requests are delegated to the heavy
 * agent via the `delegate_to_canvas` tool call. Requires GEMINI_API_KEY.
 */
export const USE_GEMINI_LIVE = true
