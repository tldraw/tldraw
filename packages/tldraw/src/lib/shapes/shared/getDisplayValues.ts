import { Editor, TLShape, TLTheme } from '@tldraw/editor'

/** @public */
export interface ShapeOptionsWithDisplayValues<
	Shape extends TLShape,
	DisplayValues extends object,
> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	getDisplayValues(editor: Editor, shape: Shape, theme: TLTheme, options: any): DisplayValues
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	getDisplayValueOverrides(
		editor: Editor,
		shape: Shape,
		theme: TLTheme,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		options: any
	): Partial<DisplayValues>
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
	themeId?: string
): DisplayValues {
	const theme = themeId ? util.editor.getThemes()[themeId] : util.editor.getCurrentTheme()
	const cached = dvCache.get(shape)
	if (cached && cached.theme === theme) return cached.values as DisplayValues
	const values = {
		...util.options.getDisplayValues(util.editor, shape, theme, util.options),
		...util.options.getDisplayValueOverrides(util.editor, shape, theme, util.options),
	}
	dvCache.set(shape, { theme, values })
	return values
}
