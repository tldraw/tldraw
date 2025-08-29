import { Editor, TLShape, debounce, throttle } from '@tldraw/editor'

function _updateHoveredShapeId(editor: Editor) {
	// todo: consider replacing `get hoveredShapeId` with this; it would mean keeping hoveredShapeId in memory rather than in the store and possibly re-computing it more often than necessary
	const hitShape = editor.getShapeAtPoint(editor.inputs.currentPagePoint, {
		hitInside: false,
		hitLabels: false,
		margin: editor.options.hitTestMargin / editor.getZoomLevel(),
		renderingOnly: true,
	})

	if (!hitShape) return editor.setHoveredShape(null)

	let shapeToHover: TLShape | undefined = undefined

	const outermostShape = editor.getOutermostSelectableShape(hitShape)

	if (outermostShape === hitShape) {
		shapeToHover = hitShape
	} else {
		if (
			outermostShape.id === editor.getFocusedGroupId() ||
			editor.getSelectedShapeIds().includes(outermostShape.id)
		) {
			shapeToHover = hitShape
		} else {
			shapeToHover = outermostShape
		}
	}

	return editor.setHoveredShape(shapeToHover.id)
}

// WeakMaps to store editor-specific throttled/debounced functions
interface ThrottledFn {
	(editor: Editor): Editor
	cancel(): void
}

interface DebouncedFn {
	(editor: Editor): Promise<Editor>
	cancel(): void
}

const editorThrottledFunctions = new WeakMap<Editor, ThrottledFn>()
const editorDebouncedFunctions = new WeakMap<Editor, DebouncedFn>()

/** @internal */
export const updateHoveredShapeIdResponsive = (editor: Editor) => {
	let throttledFn = editorThrottledFunctions.get(editor)
	if (!throttledFn) {
		throttledFn = throttle(_updateHoveredShapeId, process.env.NODE_ENV === 'test' ? 0 : 32)
		editorThrottledFunctions.set(editor, throttledFn)
	}
	return throttledFn
}

/** @internal */
export const updateHoveredShapeIdDeferred = (editor: Editor) => {
	let debouncedFn = editorDebouncedFunctions.get(editor)
	if (!debouncedFn) {
		debouncedFn = debounce(_updateHoveredShapeId, process.env.NODE_ENV === 'test' ? 0 : 32, {
			leading: process.env.NODE_ENV === 'test',
		})
		editorDebouncedFunctions.set(editor, debouncedFn)
	}
	return debouncedFn
}
