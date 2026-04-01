import { Editor, TLShape, TLTheme, resolveTheme } from '@tldraw/editor'

/** @public */
export interface ShapeOptionsWithDisplayValues<
	Shape extends TLShape,
	DisplayValues extends object,
> {
	getDisplayValues(editor: Editor, shape: Shape, theme: TLTheme): DisplayValues
	getDisplayValueOverrides(editor: Editor, shape: Shape, theme: TLTheme): Partial<DisplayValues>
}

const dvCache = new WeakMap<TLShape, { theme: TLTheme; values: object }>()

/**
 * Get the resolved display values for a shape, merging the base values with any overrides.
 *
 * @public
 */
export function getDisplayValues<Shape extends TLShape, DisplayValues extends object>(
	util: { editor: Editor; options: ShapeOptionsWithDisplayValues<Shape, DisplayValues> },
	shape: Shape,
	colorMode?: string
): DisplayValues {
	let theme: TLTheme
	if (colorMode) {
		const mode = colorMode === 'dark' ? 'dark' : 'light'
		const definition = util.editor.getThemeDefinition(util.editor.getActiveThemeName())!
		theme = resolveTheme(definition, mode)
	} else {
		theme = util.editor.getCurrentTheme()
	}
	const cached = dvCache.get(shape)
	if (cached && cached.theme === theme) return cached.values as DisplayValues
	const values = {
		...util.options.getDisplayValues(util.editor, shape, theme),
		...util.options.getDisplayValueOverrides(util.editor, shape, theme),
	}
	dvCache.set(shape, { theme, values })
	return values
}
