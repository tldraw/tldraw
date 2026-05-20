import { Editor, TLShape, TLTheme, unsafe__withoutCapture } from '@tldraw/editor'

/** @public */
export interface ShapeOptionsWithDisplayValues<
	Shape extends TLShape,
	DisplayValues extends object,
> {
	getDefaultDisplayValues(
		editor: Editor,
		shape: Shape,
		theme: TLTheme,
		colorMode: 'light' | 'dark'
	): DisplayValues
	getCustomDisplayValues(
		editor: Editor,
		shape: Shape,
		theme: TLTheme,
		colorMode: 'light' | 'dark'
	): Partial<DisplayValues>
}

const dvCache = new WeakMap<
	TLShape,
	{ theme: TLTheme; colorMode: 'light' | 'dark'; values: object }
>()

/**
 * Get the resolved display values for a shape, merging the base values with any overrides.
 *
 * @public
 */
export function getDisplayValues<Shape extends TLShape, DisplayValues extends object>(
	util: { editor: Editor; options: ShapeOptionsWithDisplayValues<Shape, DisplayValues> },
	shape: Shape,
	colorMode?: 'light' | 'dark' // An override, used when exporting images from the non-current color mode
): DisplayValues {
	const theme = util.editor.getCurrentTheme()
	const resolvedColorMode = colorMode ?? util.editor.getColorMode()
	const cached = dvCache.get(shape)
	if (cached && cached.theme === theme && cached.colorMode === resolvedColorMode) {
		return cached.values as DisplayValues
	}
	const values = {
		...util.options.getDefaultDisplayValues(util.editor, shape, theme, resolvedColorMode),
		...util.options.getCustomDisplayValues(util.editor, shape, theme, resolvedColorMode),
	}
	dvCache.set(shape, { theme, colorMode: resolvedColorMode, values })
	return values
}

/**
 * Get a shape's display values without subscribing to the editor's color mode signal. Use this in
 * computed caches that depend only on the dimension-affecting fields of the display values (font
 * family, font size, line height, padding, etc.) so that toggling between light and dark mode
 * doesn't invalidate the cache.
 *
 * Within a single theme, light and dark only differ in their color palette; font, font size,
 * line height, and other dimension-affecting display values are identical. The returned object
 * still contains color values for the current mode, but callers must not depend on those — they
 * will be stale once color mode changes (the cache won't recompute on a toggle).
 *
 * @public
 */
export function getDimensionDisplayValues<Shape extends TLShape, DisplayValues extends object>(
	util: { editor: Editor; options: ShapeOptionsWithDisplayValues<Shape, DisplayValues> },
	shape: Shape
): DisplayValues {
	// Read colorMode outside the reactive capture so the surrounding computed scope doesn't
	// take a dependency on it. We still pass it through so the dvCache lookup remains correct.
	const colorMode = unsafe__withoutCapture(() => util.editor.getColorMode())
	return getDisplayValues(util, shape, colorMode)
}
