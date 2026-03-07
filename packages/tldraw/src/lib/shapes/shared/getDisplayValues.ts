import { Editor, TLShape, TLTheme } from '@tldraw/editor'

/** @public */
export interface ShapeOptionsWithDisplayValues<
	Shape extends TLShape,
	DisplayValues extends object,
> {
	getDisplayValues(editor: Editor, shape: Shape, theme: TLTheme): DisplayValues
	getDisplayValueOverrides(editor: Editor, shape: Shape, theme: TLTheme): Partial<DisplayValues>
}

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
	return {
		...util.options.getDisplayValues(util.editor, shape, theme),
		...util.options.getDisplayValueOverrides(util.editor, shape, theme),
	}
}
