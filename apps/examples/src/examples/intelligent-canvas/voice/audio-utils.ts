/**
 * Audio helpers for the Gemini Live integration.
 *
 * Live API expects:
 *   input  — 16-bit signed PCM, 16 kHz, mono, little-endian
 *   output — 16-bit signed PCM, 24 kHz, mono, little-endian
 *
 * Both directions are sent base64-encoded inside JSON messages.
 */

/** Convert Float32 PCM samples in [-1, 1] to Int16 PCM (little-endian). */
export function float32ToInt16(input: Float32Array): Int16Array {
	const out = new Int16Array(input.length)
	for (let i = 0; i < input.length; i++) {
		const s = Math.max(-1, Math.min(1, input[i]))
		out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
	}
	return out
}

/** Convert Int16 PCM samples to Float32 PCM in [-1, 1]. */
export function int16ToFloat32(input: Int16Array): Float32Array {
	const out = new Float32Array(input.length)
	for (let i = 0; i < input.length; i++) {
		out[i] = input[i] / 0x8000
	}
	return out
}

/** Encode an ArrayBuffer / typed array buffer as base64. */
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
	const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
	let binary = ''
	const chunk = 0x8000
	for (let i = 0; i < bytes.length; i += chunk) {
		binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
	}
	return btoa(binary)
}

/** Decode base64 into a Uint8Array. */
export function base64ToBytes(b64: string): Uint8Array {
	const binary = atob(b64)
	const bytes = new Uint8Array(binary.length)
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
	return bytes
}

/**
 * AudioWorklet processor source. Reads input frames at the AudioContext's
 * native rate (typically 48 kHz), downsamples to `targetRate` (16 kHz) and
 * posts Int16 chunks back to the main thread.
 *
 * Loaded via Blob URL so we don't need a separate file in the build pipeline.
 */
export const CAPTURE_WORKLET_SOURCE = /* js */ `
class CaptureProcessor extends AudioWorkletProcessor {
	constructor(options) {
		super()
		this.targetRate = options.processorOptions.targetRate
		this.sourceRate = sampleRate
		this.ratio = this.sourceRate / this.targetRate
		this.acc = 0
		this.buffer = []
		this.flushSamples = Math.round(this.targetRate * 0.1) // ~100ms chunks
	}

	process(inputs) {
		const input = inputs[0]
		if (!input || input.length === 0) return true
		const channel = input[0]
		if (!channel) return true

		// naive linear-interpolation downsample, mono
		while (this.acc < channel.length) {
			const idx = this.acc
			const i0 = Math.floor(idx)
			const i1 = Math.min(i0 + 1, channel.length - 1)
			const frac = idx - i0
			const sample = channel[i0] * (1 - frac) + channel[i1] * frac
			this.buffer.push(sample)
			this.acc += this.ratio
		}
		this.acc -= channel.length

		if (this.buffer.length >= this.flushSamples) {
			const out = new Int16Array(this.buffer.length)
			for (let i = 0; i < this.buffer.length; i++) {
				const s = Math.max(-1, Math.min(1, this.buffer[i]))
				out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
			}
			this.port.postMessage(out.buffer, [out.buffer])
			this.buffer = []
		}
		return true
	}
}
registerProcessor('gemini-live-capture', CaptureProcessor)
`
