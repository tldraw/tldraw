import { Editor, JsonObject, useValue } from 'tldraw'
import { getLocalStorageItem, setLocalStorageItem } from '../localStorage'

/**
 * The global brand guidelines. One brand applies to every asset in the session.
 * Stored in the tldraw document meta so it persists with (and syncs through) the
 * canvas, and mirrored to localStorage as the reusable "company settings" that
 * seed every new room.
 */
export interface Brand {
	primary: string
	secondary: string
	accent: string
	background: string
	headingFont: string
	bodyFont: string
	tone: string
	/** Free-text tone-of-voice notes for the copy (how it should read). */
	voice: string
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
	voice: '',
	density: 'Balanced',
	logo: null,
	refs: [],
}

const META_KEY = 'brand'
// Company-wide brand defaults, kept outside any one room so a new room starts
// from the brand you last configured rather than the hard-coded default.
const STORAGE_KEY = 'marketing-assets:brand'

/** The reusable company brand stored in localStorage, or the default. */
export function getStoredBrand(): Brand {
	const raw = getLocalStorageItem(STORAGE_KEY)
	if (!raw) return DEFAULT_BRAND
	try {
		return { ...DEFAULT_BRAND, ...(JSON.parse(raw) as Partial<Brand>) }
	} catch {
		return DEFAULT_BRAND
	}
}

/**
 * Read the current brand. A room that has its own brand uses it; a fresh room
 * falls back to the company defaults from localStorage.
 */
export function getBrand(editor: Editor): Brand {
	const stored = editor.getDocumentSettings().meta[META_KEY] as Brand | undefined
	return stored ? { ...DEFAULT_BRAND, ...stored } : getStoredBrand()
}

/** Write the brand to the document meta and to the company-wide defaults. */
export function setBrand(editor: Editor, brand: Brand): void {
	const meta = editor.getDocumentSettings().meta
	editor.updateDocumentSettings({ meta: { ...meta, [META_KEY]: brand as unknown as JsonObject } })
	setLocalStorageItem(STORAGE_KEY, JSON.stringify(brand))
}

/**
 * On a fresh room (no brand in the document yet), persist the company defaults
 * into the document so they sync to everyone who joins.
 */
export function seedBrandFromStorage(editor: Editor): void {
	if (editor.getDocumentSettings().meta[META_KEY]) return
	const stored = getStoredBrand()
	if (stored !== DEFAULT_BRAND) setBrand(editor, stored)
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
	if (brand.voice.trim()) {
		parts.push(`Tone of voice for any copy: ${brand.voice.trim()}`)
	}
	if (brand.logo) {
		parts.push('A logo image is provided; feature it prominently and keep it undistorted.')
	}
	return parts.join(' ')
}
