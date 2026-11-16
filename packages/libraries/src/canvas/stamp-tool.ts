import { Box, EditorAtom, StateNode, type TLStateNodeConstructor } from 'tldraw'
import { armedStamp, LIBRARY_STAMP_TOOL_ID } from './arm-item'
import { MIN_STAMP_BOX_SIZE, stampContent } from './stamp-item'

/** The box being dragged out with the stamp tool, in page space. Scoped per editor. */
export const stampDragBox = new EditorAtom<Box | null>('libraryStampDragBox', () => null)

class Idle extends StateNode {
	static override id = 'idle'

	override onPointerDown() {
		this.parent.transition('pointing')
	}
}

class Pointing extends StateNode {
	static override id = 'pointing'

	// The editor stops reporting a drag before the pointer up reaches the tool.
	private didDrag = false

	override onEnter() {
		this.didDrag = false
	}

	override onExit() {
		stampDragBox.set(this.editor, null)
	}

	override onPointerMove() {
		if (!this.editor.inputs.getIsDragging()) return
		this.didDrag = true
		stampDragBox.set(this.editor, this.getDragBox())
	}

	override onPointerUp() {
		const { editor } = this
		const stamp = armedStamp.get(editor)
		if (!stamp) {
			editor.setCurrentTool('select')
			return
		}
		const box = this.getDragBox()
		const minSize = MIN_STAMP_BOX_SIZE / editor.getZoomLevel()
		if (this.didDrag && box.w >= minSize && box.h >= minSize) {
			stampContent(editor, stamp.content, box.center, box)
		} else {
			stampContent(editor, stamp.content, editor.inputs.getOriginPagePoint())
		}

		if (editor.getInstanceState().isToolLocked) {
			editor.selectNone()
			this.parent.transition('idle')
		} else {
			editor.setCurrentTool('select')
		}
	}

	override onInterrupt() {
		this.parent.transition('idle')
	}

	private getDragBox() {
		return Box.FromPoints([
			this.editor.inputs.getOriginPagePoint(),
			this.editor.inputs.getCurrentPagePoint(),
		])
	}
}

/**
 * The tool that places copies of a library item, armed with one by {@link armLibraryItem}.
 * Clicking places a copy at the item's own size, centred on the pointer; dragging places one scaled
 * to fit the dragged box, keeping its proportions, with strokes and text scaled to match. A drag of
 * a few pixels counts as a click. Each copy is one undo step. With the tool locked, it stays armed
 * for the next copy; otherwise it hands back to the select tool with the copy selected. Escape
 * returns to the select tool.
 *
 * Add it to the editor's tools, e.g. `<Tldraw tools={[LibraryStampTool]} />`, and render
 * {@link LibraryStampPreview} in front of the canvas to show the item under the pointer.
 * @public
 */
export class LibraryStampTool extends StateNode {
	static override id = LIBRARY_STAMP_TOOL_ID
	static override initial = 'idle'
	static override children(): TLStateNodeConstructor[] {
		return [Idle, Pointing]
	}

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onCancel() {
		this.editor.setCurrentTool('select')
	}
}
