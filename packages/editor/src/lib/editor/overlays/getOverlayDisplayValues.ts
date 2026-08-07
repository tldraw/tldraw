import { TLTheme } from '@tldraw/tlschema'
import type { Editor } from '../Editor'
import { TLOverlay } from './OverlayUtil'

/** @public */
export interface OverlayOptionsWithDisplayValues<
	Overlay extends TLOverlay,
	DisplayValues extends object,
> {
	getDefaultDisplayValues(
		editor: Editor,
		overlay: Overlay,
		theme: TLTheme,
		colorMode: 'light' | 'dark'
	): DisplayValues
	getCustomDisplayValues(
		editor: Editor,
		overlay: Overlay,
		theme: TLTheme,
		colorMode: 'light' | 'dark'
	): Partial<DisplayValues>
}

const dvCache = new WeakMap<
	TLOverlay,
	{ theme: TLTheme; colorMode: 'light' | 'dark'; values: object }
>()

/**
 * Get the resolved display values for an overlay, merging the base values with any overrides.
 *
 * @public
 */
export function getOverlayDisplayValues<Overlay extends TLOverlay, DisplayValues extends object>(
	util: { editor: Editor; options: OverlayOptionsWithDisplayValues<Overlay, DisplayValues> },
	overlay: Overlay,
	colorMode?: 'light' | 'dark'
): DisplayValues {
	const theme = util.editor.getCurrentTheme()
	const resolvedColorMode = colorMode ?? util.editor.getColorMode()
	const cached = dvCache.get(overlay)
	if (cached && cached.theme === theme && cached.colorMode === resolvedColorMode) {
		return cached.values as DisplayValues
	}
	const values = {
		...util.options.getDefaultDisplayValues(util.editor, overlay, theme, resolvedColorMode),
		...util.options.getCustomDisplayValues(util.editor, overlay, theme, resolvedColorMode),
	}
	dvCache.set(overlay, { theme, colorMode: resolvedColorMode, values })
	return values
}
