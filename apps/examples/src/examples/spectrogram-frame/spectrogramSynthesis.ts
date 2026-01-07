import { SPECTROGRAM_CONFIG } from './spectrogram-frame-props'

const { MIN_FREQ, MAX_FREQ, SAMPLE_RATE, RED_AMPLITUDE, GREEN_AMPLITUDE, BLUE_AMPLITUDE } =
	SPECTROGRAM_CONFIG

/**
 * Synthesize audio from an image using spectrogram synthesis.
 *
 * The image is interpreted as a spectrogram where:
 * - X-axis = time
 * - Y-axis = frequency (top = high frequency, bottom = low frequency)
 * - RGB channels = amplitude (R=1.0, G=0.67, B=0.33)
 * - White background = silence
 *
 * Uses additive synthesis with sine wave oscillators.
 */
export async function synthesizeSpectrogramAudio(
	imageData: ImageData,
	durationMs: number,
	_backgroundColor: string
): Promise<AudioBuffer> {
	const { width, height, data } = imageData
	const durationSec = durationMs / 1000
	const numSamples = Math.floor(durationSec * SAMPLE_RATE)

	// Create output buffer
	const audioContext = new OfflineAudioContext(1, numSamples, SAMPLE_RATE)
	const buffer = audioContext.createBuffer(1, numSamples, SAMPLE_RATE)
	const output = buffer.getChannelData(0)

	// Pre-compute frequency bins (logarithmic scale)
	const frequencies: number[] = []
	for (let y = 0; y < height; y++) {
		// Invert: y=0 (top) = high freq, y=height (bottom) = low freq
		const normalizedY = 1 - y / height
		// Logarithmic mapping for more natural frequency perception
		const freq = MIN_FREQ * Math.pow(MAX_FREQ / MIN_FREQ, normalizedY)
		frequencies.push(freq)
	}

	// Process each column (time slice)
	const samplesPerColumn = numSamples / width

	for (let x = 0; x < width; x++) {
		const startSample = Math.floor(x * samplesPerColumn)
		const endSample = Math.floor((x + 1) * samplesPerColumn)

		// For each frequency bin (row)
		for (let y = 0; y < height; y++) {
			const pixelIndex = (y * width + x) * 4
			const r = data[pixelIndex]
			const g = data[pixelIndex + 1]
			const b = data[pixelIndex + 2]

			// Calculate amplitude based on RGB channels
			// White (255,255,255) = silence, colors = sound
			// Each channel's contribution is weighted differently
			const amplitude = getAmplitude(r, g, b)

			// Skip near-silence for performance
			if (amplitude < 0.01) continue

			const freq = frequencies[y]

			// Add sine wave contribution for this time slice
			for (let s = startSample; s < endSample && s < numSamples; s++) {
				const t = s / SAMPLE_RATE
				// Use a small amplitude scaling to prevent clipping when many frequencies sum
				output[s] += amplitude * 0.1 * Math.sin(2 * Math.PI * freq * t)
			}
		}
	}

	// Normalize to prevent clipping
	normalizeBuffer(output)

	// Apply a gentle fade in/out to reduce clicks
	applyFades(output, SAMPLE_RATE)

	return buffer
}

/**
 * Calculate amplitude from RGB values.
 * White/near-white = silence.
 * Red pixels are loudest (1.0), green medium (0.67), blue quietest (0.33).
 * Mixed colors get weighted blend based on their RGB composition.
 */
function getAmplitude(r: number, g: number, b: number): number {
	// Near-white = silence
	if (r >= 240 && g >= 240 && b >= 240) return 0

	// Normalize RGB to 0-1
	const rNorm = r / 255
	const gNorm = g / 255
	const bNorm = b / 255
	const total = rNorm + gNorm + bNorm

	// Calculate amplitude multiplier based on dominant color
	let colorMultiplier: number
	if (total < 0.01) {
		// Black/near-black: average of all weights
		colorMultiplier = (RED_AMPLITUDE + GREEN_AMPLITUDE + BLUE_AMPLITUDE) / 3
	} else {
		// Weight by which color channel dominates
		const rWeight = rNorm / total
		const gWeight = gNorm / total
		const bWeight = bNorm / total
		colorMultiplier = rWeight * RED_AMPLITUDE + gWeight * GREEN_AMPLITUDE + bWeight * BLUE_AMPLITUDE
	}

	// Calculate intensity (distance from white, normalized 0-1)
	const whiteDistance =
		Math.sqrt(Math.pow(255 - r, 2) + Math.pow(255 - g, 2) + Math.pow(255 - b, 2)) /
		(255 * Math.sqrt(3))

	return whiteDistance * colorMultiplier
}

/**
 * Normalize audio buffer to prevent clipping.
 * Scales all values so the peak is at 0.9.
 */
function normalizeBuffer(buffer: Float32Array): void {
	let maxAbs = 0
	for (let i = 0; i < buffer.length; i++) {
		maxAbs = Math.max(maxAbs, Math.abs(buffer[i]))
	}

	if (maxAbs > 0) {
		const scale = 0.9 / maxAbs
		for (let i = 0; i < buffer.length; i++) {
			buffer[i] *= scale
		}
	}
}

/**
 * Apply fade in and fade out to reduce audio clicks.
 */
function applyFades(buffer: Float32Array, sampleRate: number): void {
	const fadeDuration = 0.01 // 10ms fade
	const fadeSamples = Math.floor(fadeDuration * sampleRate)

	// Fade in
	for (let i = 0; i < fadeSamples && i < buffer.length; i++) {
		buffer[i] *= i / fadeSamples
	}

	// Fade out
	for (let i = 0; i < fadeSamples && i < buffer.length; i++) {
		const idx = buffer.length - 1 - i
		buffer[idx] *= i / fadeSamples
	}
}
