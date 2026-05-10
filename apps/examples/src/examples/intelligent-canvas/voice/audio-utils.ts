/**
 * Audio helpers for the Gemini Live integration (output side only).
 *
 * Live emits 16-bit signed PCM @ 24 kHz mono LE, base64-encoded inside JSON
 * messages. We decode and convert to Float32 for AudioBuffer playback.
 */

/** Convert Int16 PCM samples to Float32 PCM in [-1, 1]. */
export function int16ToFloat32(input: Int16Array): Float32Array {
	const out = new Float32Array(input.length)
	for (let i = 0; i < input.length; i++) {
		out[i] = input[i] / 0x8000
	}
	return out
}

/** Decode base64 into a Uint8Array. */
export function base64ToBytes(b64: string): Uint8Array {
	const binary = atob(b64)
	const bytes = new Uint8Array(binary.length)
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
	return bytes
}
