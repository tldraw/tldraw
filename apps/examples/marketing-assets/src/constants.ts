import type { OutputType } from './api/marketingApi'

/** The longest side of an asset frame on the canvas, in tldraw units. */
export const DISPLAY_MAX = 360

/** Height of the on-canvas control bar under each asset, in tldraw units. */
export const FOOTER_HEIGHT = 56

/**
 * Height of the accompanying-copy panel under the footer, in tldraw units. Holds
 * the platform caption (the body text shown beside the asset, not on the image).
 */
export const CAPTION_HEIGHT = 132

/** The output formats offered in the generate dropdown, grouped by platform. */
export const OUTPUT_TYPES: OutputType[] = [
	{ id: 'li-single', label: 'Single image', width: 1200, height: 627, platform: 'LinkedIn' },
	{ id: 'li-square', label: 'Square', width: 1080, height: 1080, platform: 'LinkedIn' },
	{ id: 'li-portrait', label: 'Portrait', width: 1080, height: 1350, platform: 'LinkedIn' },
	{ id: 'ig-square', label: 'Square', width: 1080, height: 1080, platform: 'Instagram' },
	{ id: 'ig-story', label: 'Story', width: 1080, height: 1920, platform: 'Instagram' },
	{ id: 'ig-landscape', label: 'Landscape', width: 1080, height: 566, platform: 'Instagram' },
	{ id: 'fb-cover', label: 'Cover', width: 820, height: 312, platform: 'Facebook' },
	{ id: 'x-header', label: 'Header', width: 1500, height: 500, platform: 'X' },
	{ id: 'poster', label: 'Poster (A4)', width: 1240, height: 1754, platform: 'Print' },
]

export function getOutputType(id: string): OutputType {
	return OUTPUT_TYPES.find((t) => t.id === id) ?? OUTPUT_TYPES[0]
}

/** Output types grouped by platform, preserving declaration order. */
export function outputTypesByPlatform(): { platform: string; types: OutputType[] }[] {
	const groups: { platform: string; types: OutputType[] }[] = []
	for (const type of OUTPUT_TYPES) {
		const platform = type.platform ?? 'Other'
		const group = groups.find((g) => g.platform === platform)
		if (group) group.types.push(type)
		else groups.push({ platform, types: [type] })
	}
	return groups
}

/** How many ideas a single batch can generate. */
export const BATCH_SIZES = [1, 4, 8, 12] as const

/** Default number of ideas generated per batch. */
export const DEFAULT_BATCH_SIZE = 8

/** Gap between asset frames when a batch is laid out in a grid, in tldraw units. */
export const BATCH_GAP = 40

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

/**
 * Distinct messaging angles, cycled across a batch so each asset's accompanying
 * copy takes a different approach instead of repeating the same caption. Each tile
 * already gets a different visual direction; this does the same for the words.
 */
export const CAPTION_ANGLES = [
	'Lead with the core benefit or the outcome the audience gets.',
	'Open with a sharp question that hooks the reader.',
	'Lead with a concrete stat, result, or proof point.',
	'Take a bold, slightly contrarian stance.',
	'Frame it as a quick, practical how-to or tip.',
	'Use a short, vivid scenario or mini-story.',
	'Lead with social proof — what peers or the market are doing.',
	'Emphasise speed and ease: the fast path to the result.',
	'Focus on the specific pain point it removes.',
	'Make one confident, punchy claim and stop.',
]
