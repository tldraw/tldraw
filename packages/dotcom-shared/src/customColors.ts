import {
	DefaultColorStyle,
	TLDefaultColor,
	TLDefaultColorStyle,
	TLThemes,
	createTLSchema,
	registerColorsFromThemes,
} from '@tldraw/tlschema'

// Teach TypeScript about the custom color name. This augmentation applies
// wherever this module is part of the compilation (client and worker).
declare module '@tldraw/tlschema' {
	interface TLThemeDefaultColors {
		pink: TLDefaultColor
	}
}

// The custom color names dotcom adds on top of the built-in palette.
const DOTCOM_CUSTOM_COLORS = ['pink'] as const satisfies TLDefaultColorStyle[]

// Color values for the custom "pink" palette entry, in both light and dark
// variants. These are only used for client-side rendering; the worker never
// needs them, but they live here so client and worker share one source of truth
// for the color name.
export const PINK_LIGHT: TLDefaultColor = {
	solid: '#e91e8c',
	semi: '#fce4f2',
	pattern: '#f06baf',
	fill: '#e91e8c',
	linedFill: '#fce4f2',
	frameHeadingStroke: '#e91e8c',
	frameHeadingFill: '#fce4f2',
	frameStroke: '#e91e8c',
	frameFill: '#fce4f2',
	frameText: '#e91e8c',
	noteFill: '#fce4f2',
	noteText: '#e91e8c',
	highlightSrgb: '#e91e8c',
	highlightP3: '#e91e8c',
}

export const PINK_DARK: TLDefaultColor = {
	solid: '#f06baf',
	semi: '#3d1a2e',
	pattern: '#e91e8c',
	fill: '#f06baf',
	linedFill: '#3d1a2e',
	frameHeadingStroke: '#f06baf',
	frameHeadingFill: '#3d1a2e',
	frameStroke: '#f06baf',
	frameFill: '#3d1a2e',
	frameText: '#f06baf',
	noteFill: '#3d1a2e',
	noteText: '#f06baf',
	highlightSrgb: '#f06baf',
	highlightP3: '#f06baf',
}

/**
 * Register dotcom's custom color names into the global color and label-color
 * style enums, so the schema validators accept them. Uses
 * `registerColorsFromThemes` (the only public API that covers the label-color
 * enum too), feeding it a palette built from the currently-registered colors
 * plus our custom ones — this adds the custom colors without removing the
 * built-ins, and needs no real theme values, so it runs on the worker without
 * pulling in the editor's theme defaults. Idempotent.
 */
export function registerDotcomColors() {
	// registerColorsFromThemes only inspects which palette keys hold an object;
	// the values are irrelevant to registration (the client supplies the real
	// values for rendering). PINK_LIGHT is reused here purely as a stand-in.
	const names = new Set<TLDefaultColorStyle>([
		...(DefaultColorStyle.values as TLDefaultColorStyle[]),
		...DOTCOM_CUSTOM_COLORS,
	])
	const palette = Object.fromEntries([...names].map((name) => [name, PINK_LIGHT]))
	registerColorsFromThemes({
		default: { colors: { light: palette, dark: palette } },
	} as unknown as TLThemes)
}

/**
 * Build a `TLSchema` with dotcom's custom colors registered. Use this anywhere
 * dotcom would otherwise call `createTLSchema()` directly, so the schema's
 * validators accept the custom colors on both the client and the sync worker.
 */
export function createDotcomTLSchema() {
	registerDotcomColors()
	return createTLSchema()
}
