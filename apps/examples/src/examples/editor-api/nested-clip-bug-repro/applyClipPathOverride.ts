import { Editor, TLShapeId } from 'tldraw'

/** Shape DOM nodes live under the editor container — never use `document` (two canvases share ids). */
export function forEachShapeElement(
	editor: Editor,
	shapeId: TLShapeId,
	fn: (el: HTMLElement) => void
) {
	const nodes = editor
		.getContainer()
		.querySelectorAll(`[data-shape-id="${shapeId}"]`) as NodeListOf<HTMLElement>
	for (const el of nodes) fn(el)
}

export function applyClipPathOverride(
	editor: Editor,
	shapeId: TLShapeId,
	clipPath: string | undefined
) {
	forEachShapeElement(editor, shapeId, (el) => {
		if (clipPath) {
			el.style.setProperty('clip-path', clipPath, 'important')
		} else {
			el.style.removeProperty('clip-path')
		}
	})
}

export function clearClipPathOverride(editor: Editor, shapeId: TLShapeId) {
	forEachShapeElement(editor, shapeId, (el) => el.style.removeProperty('clip-path'))
}
