import { Editor, TLShape, TLThemeDefinition } from '@tldraw/editor'

/** @public */
export interface ShapeOptionsWithDisplayValues<
	Shape extends TLShape,
	DisplayValues extends object,
> {
	getDisplayValues(
		editor: Editor,
		shape: Shape,
		theme: TLThemeDefinition,
		colorMode: 'light' | 'dark'
	): DisplayValues
	getDisplayValueOverrides(
		editor: Editor,
		shape: Shape,
		theme: TLThemeDefinition,
		colorMode: 'light' | 'dark'
	): Partial<DisplayValues>
}

const dvCache = new WeakMap<
	TLShape,
	{ theme: TLThemeDefinition; colorMode: 'light' | 'dark'; values: object }
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
		...util.options.getDisplayValues(util.editor, shape, theme, resolvedColorMode),
		...util.options.getDisplayValueOverrides(util.editor, shape, theme, resolvedColorMode),
	}
	dvCache.set(shape, { theme, colorMode: resolvedColorMode, values })
	return values
}
