import { Editor, useEditor, useValue } from '@tldraw/editor'
import { getArrowBindings } from '../../shapes/arrow/shared'

function shapesWithUnboundArrows(editor: Editor) {
	return editor.getSelectedShapes().filter((shape) => {
		if (!editor.isShapeOfType(shape, 'arrow')) return true
		const bindings = getArrowBindings(editor, shape)
		return !bindings.start && !bindings.end
	})
}

/** @internal */
export function useThreeStackableItems() {
	const editor = useEditor()
	return useValue('threeStackableItems', () => shapesWithUnboundArrows(editor).length > 2, [editor])
}

/** @internal */
export function useIsInSelectState() {
	const editor = useEditor()
	return useValue('isInSelectState', () => editor.isIn('select'), [editor])
}

/** @internal */
export function useAllowGroup() {
	const editor = useEditor()
	return useValue(
		'allow group',
		() => {
			// We can't group arrows that are bound to shapes that aren't selected
			// if more than one shape has an arrow bound to it, allow group
			const selectedShapes = editor.getSelectedShapes()

			if (selectedShapes.length < 2) return false

			for (const shape of selectedShapes) {
				if (!editor.isShapeOfType(shape, 'arrow')) continue
				const { start, end } = getArrowBindings(editor, shape)
				// if the other shape is not among the selected shapes...
				if (start && !selectedShapes.some((s) => s.id === start.toId)) return false
				// if the other shape is not among the selected shapes...
				if (end && !selectedShapes.some((s) => s.id === end.toId)) return false
			}
			return true
		},
		[editor]
	)
}

/** @internal */
export function useAllowUngroup() {
	const editor = useEditor()
	return useValue(
		'allowUngroup',
		() => editor.getSelectedShapeIds().some((id) => editor.getShape(id)?.type === 'group'),
		[editor]
	)
}

export const showMenuPaste =
	typeof window !== 'undefined' &&
	'navigator' in window &&
	Boolean(navigator.clipboard) &&
	Boolean(navigator.clipboard.read)

function countWithinBounds(len: number, min?: number, max?: number) {
	if (min === undefined && max === undefined) return len
	return (min === undefined || len >= min) && (max === undefined || len <= max)
}

/**
 * Returns true if the number of LOCKED OR UNLOCKED selected shapes is at least min or at most max.
 */
export function useAnySelectedShapesCount(min?: number, max?: number) {
	const editor = useEditor()
	return useValue(
		'selectedShapes',
		() => countWithinBounds(editor.getSelectedShapes().length, min, max),
		[editor, min, max]
	)
}

/**
 * Returns true if the number of UNLOCKED selected shapes is at least min or at most max.
 * @public
 */
export function useUnlockedSelectedShapesCount(min?: number, max?: number) {
	const editor = useEditor()
	return useValue(
		'selectedShapes',
		() => {
			const len = editor
				.getSelectedShapes()
				.filter((s) => !editor.isShapeOrAncestorLocked(s)).length
			return countWithinBounds(len, min, max)
		},
		[editor, min, max]
	)
}

export function useShowAutoSizeToggle() {
	const editor = useEditor()
	return useValue(
		'showAutoSizeToggle',
		() => {
			const selectedShapes = editor.getSelectedShapes()
			return (
				selectedShapes.length === 1 &&
				editor.isShapeOfType(selectedShapes[0], 'text') &&
				selectedShapes[0].props.autoSize === false
			)
		},
		[editor]
	)
}

export function useHasLinkShapeSelected() {
	const editor = useEditor()
	return useValue(
		'hasLinkShapeSelected',
		() => {
			const onlySelectedShape = editor.getOnlySelectedShape()
			return !!(
				onlySelectedShape &&
				onlySelectedShape.type !== 'embed' &&
				'url' in onlySelectedShape.props &&
				!onlySelectedShape.isLocked
			)
		},
		[editor]
	)
}

export function useOnlyFlippableShape() {
	const editor = useEditor()
	return useValue(
		'onlyFlippableShape',
		() => {
			const shape = editor.getOnlySelectedShape()
			return (
				shape &&
				(editor.isShapeOfType(shape, 'group') ||
					editor.isShapeOfType(shape, 'image') ||
					editor.isShapeOfType(shape, 'arrow') ||
					editor.isShapeOfType(shape, 'line') ||
					editor.isShapeOfType(shape, 'draw') ||
					editor.isShapeOfType(shape, 'geo'))
			)
		},
		[editor]
	)
}

/** @public */
export function useCanRedo() {
	const editor = useEditor()
	return useValue('useCanRedo', () => editor.getCanRedo(), [editor])
}

/** @public */
export function useCanUndo() {
	const editor = useEditor()
	return useValue('useCanUndo', () => editor.getCanUndo(), [editor])
}

/** Returns true if the current page has at least one shape. */
export function useHasShapesOnPage() {
	const editor = useEditor()
	return useValue('hasShapesOnPage', () => editor.getCurrentPageShapeIds().size > 0, [editor])
}

/**
 * Returns true if the user is in the select tool and has at least one shape selected.
 * This corresponds to the `canApplySelectionAction()` check in actions.tsx.
 * @public
 */
export function useCanApplySelectionAction() {
	const editor = useEditor()
	return useValue(
		'canApplySelectionAction',
		() => editor.isIn('select') && editor.getSelectedShapeIds().length > 0,
		[editor]
	)
}
