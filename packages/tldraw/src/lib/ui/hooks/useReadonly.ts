import { useMaybeEditor, useValue } from '@tldraw/editor'
import { canUpdateShape } from '../../tools/SelectTool/selectHelpers'

/** @public */
export function useReadonly() {
	const editor = useMaybeEditor()
	return useValue('isReadonlyMode', () => !!editor?.getIsReadonly(), [editor])
}

/**
 * Whether the style panel has anything to style: selected shapes that can be changed, or shapes
 * still to be created here (any type, or the current tool's).
 *
 * @internal
 */
export function useCanStyleShapes() {
	const editor = useMaybeEditor()
	return useValue(
		'canStyleShapes',
		() =>
			!editor ||
			editor.isPermitted('tl:shape:create') ||
			editor.isPermitted(`tl:shape:create:${editor.getCurrentToolId()}`) ||
			editor.getSelectedShapes().some((shape) => canUpdateShape(editor, shape)),
		[editor]
	)
}
