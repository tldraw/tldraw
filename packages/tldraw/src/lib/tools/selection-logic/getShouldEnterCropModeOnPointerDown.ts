import { Editor } from '@tldraw/editor'

export function getShouldEnterCropMode(editor: Editor): boolean {
	const { onlySelectedShape } = editor
	return !!(
		onlySelectedShape &&
		!editor.isShapeOrAncestorLocked(onlySelectedShape) &&
		editor.getShapeUtil(onlySelectedShape).canCrop(onlySelectedShape)
	)
}
