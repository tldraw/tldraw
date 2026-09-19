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
 * When `colorMode` is omitted, the current color mode is read without creating a reactive
 * dependency on it. Within a single theme, light and dark only differ in their color palette, so
 * dimension-affecting values (font family, font size, line height, padding, stroke width, etc.)
 * are safe to read from any reactive scope — computed caches that measure text or build geometry
 * won't be invalidated by a light/dark toggle. (This assumes `getCustomDisplayValues` overrides
 * don't derive dimension values from `colorMode`.) The returned colors still reflect the color
 * mode at call time, but without a subscription they can go stale.
 *
 * Callers that render colors and need to update when the color mode changes must pass `colorMode`
 * explicitly from a reactive read: `useColorMode()` in components, `ctx.colorMode` in exports, or
 * `editor.getColorMode()` in other reactive scopes.
 *
 * @public
 */
export function getDisplayValues<Shape extends TLShape, DisplayValues extends object>(
	util: { editor: Editor; options: ShapeOptionsWithDisplayValues<Shape, DisplayValues> },
	shape: Shape,
	colorMode?: 'light' | 'dark' // Pass explicitly for color-mode reactivity, or to export from the non-current color mode
): DisplayValues {
	const theme = util.editor.getCurrentTheme()
	const resolvedColorMode = colorMode ?? unsafe__withoutCapture(() => util.editor.getColorMode())
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
