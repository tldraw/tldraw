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

const dimensionDvCache = new WeakMap<TLShape, { theme: TLTheme; values: object }>()

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
 * Get the resolved display values for a shape without taking a reactive dependency on the
 * current color mode. Use this from text measurement and other dimension-only computations,
 * so that toggling between light and dark mode does not invalidate downstream caches.
 *
 * Color-related fields in the result reflect the color mode at the time the cache was
 * populated and may be stale relative to the current color mode — only read
 * dimension-affecting fields from this result.
 *
 * @public
 */
export function getDimensionDisplayValues<Shape extends TLShape, DisplayValues extends object>(
	util: { editor: Editor; options: ShapeOptionsWithDisplayValues<Shape, DisplayValues> },
	shape: Shape
): DisplayValues {
	const theme = util.editor.getCurrentTheme()
	const cached = dimensionDvCache.get(shape)
	if (cached && cached.theme === theme) {
		return cached.values as DisplayValues
	}
	const colorMode = unsafe__withoutCapture(() => util.editor.getColorMode())
	const values = {
		...util.options.getDefaultDisplayValues(util.editor, shape, theme, colorMode),
		...util.options.getCustomDisplayValues(util.editor, shape, theme, colorMode),
	}
	dimensionDvCache.set(shape, { theme, values })
	return values
}
