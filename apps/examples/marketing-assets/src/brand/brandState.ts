import { Editor, JsonObject, useValue } from 'tldraw'

/**
 * The global brand guidelines. One brand applies to every asset in the session.
 * Stored in the tldraw document meta so it persists with the canvas.
 */
export interface Brand {
	primary: string
	secondary: string
	accent: string
	background: string
	headingFont: string
	bodyFont: string
	tone: string
	density: string
	/** Logo as a data URL, or null. */
	logo: string | null
	/** Additional brand reference images as data URLs. */
	refs: string[]
}

export const DEFAULT_BRAND: Brand = {
	primary: '#2563eb',
	secondary: '#1e293b',
	accent: '#f59e0b',
	background: '#ffffff',
	headingFont: 'Inter',
	bodyFont: 'Inter',
	tone: 'Professional',
	density: 'Balanced',
	logo: null,
	refs: [],
}

const META_KEY = 'brand'

/** Read the current brand from the document meta. */
export function getBrand(editor: Editor): Brand {
	const stored = editor.getDocumentSettings().meta[META_KEY] as Brand | undefined
	return stored ? { ...DEFAULT_BRAND, ...stored } : DEFAULT_BRAND
}

/** Write the brand back to the document meta. */
export function setBrand(editor: Editor, brand: Brand): void {
	const meta = editor.getDocumentSettings().meta
	editor.updateDocumentSettings({ meta: { ...meta, [META_KEY]: brand as unknown as JsonObject } })
}

/** Reactively subscribe to the current brand. */
export function useBrand(editor: Editor): Brand {
	return useValue('brand', () => getBrand(editor), [editor])
}

/** All brand images (logo first), as data URLs, for passing to the model. */
export function brandReferenceImages(brand: Brand): string[] {
	return [brand.logo, ...brand.refs].filter((x): x is string => !!x)
}

/**
 * Serialize the brand as design direction for the model. Written as prose, not a
 * label list, so the image model treats it as styling rather than text to typeset.
 */
export function serializeBrand(brand: Brand): string {
	const parts = [
		`Build the colour palette around ${brand.primary} as the primary colour, ${brand.secondary} as secondary, and ${brand.accent} as an accent, on a ${brand.background} background.`,
		`Set headings in ${brand.headingFont} (or a very similar typeface) and body text in ${brand.bodyFont}.`,
		`The overall tone should feel ${brand.tone.toLowerCase()}, with a ${brand.density.toLowerCase()} visual density.`,
	]
	if (brand.logo) {
		parts.push('A logo image is provided; feature it prominently and keep it undistorted.')
	}
	return parts.join(' ')
}
