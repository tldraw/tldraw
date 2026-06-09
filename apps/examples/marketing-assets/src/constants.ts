import type { OutputType } from './api/marketingApi'

/** The longest side of an asset frame on the canvas, in tldraw units. */
export const DISPLAY_MAX = 360

/** Height of the on-canvas control bar under each asset, in tldraw units. */
export const FOOTER_HEIGHT = 56

/** The output formats offered in the generate dropdown. */
export const OUTPUT_TYPES: OutputType[] = [
	{ id: 'ig-square', label: 'Instagram square', width: 1080, height: 1080 },
	{ id: 'ig-story', label: 'Instagram story', width: 1080, height: 1920 },
	{ id: 'ig-landscape', label: 'Instagram landscape', width: 1080, height: 566 },
	{ id: 'fb-cover', label: 'Facebook cover', width: 820, height: 312 },
	{ id: 'x-header', label: 'X header', width: 1500, height: 500 },
	{ id: 'poster', label: 'Poster (A4)', width: 1240, height: 1754 },
]

export function getOutputType(id: string): OutputType {
	return OUTPUT_TYPES.find((t) => t.id === id) ?? OUTPUT_TYPES[0]
}

/** Scale an output type down to its on-canvas display size. */
export function getDisplaySize(outputType: OutputType): { w: number; h: number } {
	const scale = DISPLAY_MAX / Math.max(outputType.width, outputType.height)
	return {
		w: Math.round(outputType.width * scale),
		h: Math.round(outputType.height * scale),
	}
}

/** Heading/body font choices offered in the brand form. */
export const FONT_OPTIONS = [
	'Inter',
	'Helvetica',
	'Georgia',
	'Playfair Display',
	'Montserrat',
	'Roboto Slab',
	'Courier New',
]

/** Tone-of-voice choices offered in the brand form. */
export const TONE_OPTIONS = [
	'Professional',
	'Playful',
	'Bold',
	'Minimal',
	'Luxury',
	'Friendly',
	'Technical',
]

/** Visual-density choices offered in the brand form. */
export const DENSITY_OPTIONS = ['Airy', 'Balanced', 'Dense']
