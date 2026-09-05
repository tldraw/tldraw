import { FontMetrics, FontSpec, MeasureContext } from './types'

/** @public */
export interface FakeMeasureContextOptions {
	/** Advance of every grapheme as a fraction of the font size. Defaults to 0.5. */
	advance?: number
	/** Per-character overrides, as a fraction of the font size. */
	advances?: Record<string, number>
	/** Ascent as a fraction of the font size. Defaults to 0.8. */
	ascent?: number
	/** Descent as a fraction of the font size. Defaults to 0.2. */
	descent?: number
	/** Extra width factor applied when the weight is bold. Defaults to 1 (no change). */
	boldFactor?: number
}

// Zero-width spaces and joiners take no space in any browser; the fake agrees.
const ZERO_WIDTH = /^(?:\u200B|\u200C|\u200D|\u2060|\uFEFF)$/

/**
 * A deterministic measure context with fixed advances. It exists to prove the core has no canvas
 * dependency and to make layout tests exact.
 *
 * @public
 */
export function createFakeMeasureContext(options: FakeMeasureContextOptions = {}): MeasureContext {
	const advance = options.advance ?? 0.5
	const advances = options.advances ?? {}
	const ascent = options.ascent ?? 0.8
	const descent = options.descent ?? 0.2
	const boldFactor = options.boldFactor ?? 1
	const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

	return {
		measure(text: string, font: FontSpec) {
			let width = 0
			for (const { segment } of segmenter.segment(text)) {
				if (ZERO_WIDTH.test(segment)) continue
				width += (advances[segment] ?? advance) * font.size
			}
			if (font.weight === 'bold' || Number(font.weight) >= 600) width *= boldFactor
			return { width }
		},
		metrics(font: FontSpec): FontMetrics {
			return {
				ascent: ascent * font.size,
				descent: descent * font.size,
				zeroAdvance: (advances['0'] ?? advance) * font.size,
			}
		},
	}
}
