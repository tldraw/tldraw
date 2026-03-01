import { Editor, TLShape } from '@tldraw/editor'

/** @public */
export interface ShapeOptionsWithDisplayValues<
	Shape extends TLShape,
	DisplayValues extends object,
> {
	getDisplayValues(editor: Editor, shape: Shape, isDarkMode: boolean): DisplayValues
	getDisplayValueOverrides(
		editor: Editor,
		shape: Shape,
		isDarkMode: boolean
	): Partial<DisplayValues>
}

/**
 * Get the resolved display values for a shape, merging the base values with any overrides.
 *
 * @public
 */
export function getDisplayValues<Shape extends TLShape, DisplayValues extends object>(
	util: { editor: Editor; options: ShapeOptionsWithDisplayValues<Shape, DisplayValues> },
	shape: Shape,
	isDarkMode: boolean
): DisplayValues {
	return {
		...util.options.getDisplayValues(util.editor, shape, isDarkMode),
		...util.options.getDisplayValueOverrides(util.editor, shape, isDarkMode),
	}
}
