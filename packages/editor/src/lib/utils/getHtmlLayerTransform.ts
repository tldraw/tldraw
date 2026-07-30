import { modulate } from '@tldraw/utils'
import type { Editor } from '../editor/Editor'
import { toDomPrecision } from '../primitives/utils'

/**
 * The CSS `transform` that puts a 1px-sized html layer into page space under the current camera.
 * Shared by every camera-tracked DOM layer (the canvas's shape layer, the collaborator cursor
 * layer) so they line up exactly and can't drift apart.
 *
 * The offset compensates for the layer's 1px width/height when zoomed, so it registers precisely
 * with the other layers.
 *
 * @internal
 */
export function getHtmlLayerTransform(editor: Editor): string {
	const { x, y, z } = editor.getCamera()
	const offset =
		z >= 1 ? modulate(z, [1, 8], [0.125, 0.5], true) : modulate(z, [0.1, 1], [-2, 0.125], true)
	return `scale(${toDomPrecision(z)}) translate(${toDomPrecision(x + offset)}px,${toDomPrecision(
		y + offset
	)}px)`
}
