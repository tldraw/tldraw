import { useEditor, useValue } from '@tldraw/editor'
import {
	canApplySelectionAction,
	canReadClipboard,
	canToggleAutoSize,
	getUnlockedSelectedShapes,
	hasLinkShapeSelected,
	hasShapesOnPage,
	hasThreeStackableShapes,
	isGroupAllowed,
	isOnlyFlippableShapeSelected,
	isUngroupAllowed,
} from '../context/action-predicates'

// The @public hooks here are SDK API: keep them even when nothing in tldraw calls them.

/** @internal */
export function useThreeStackableItems() {
	const editor = useEditor()
	return useValue('threeStackableItems', () => hasThreeStackableShapes(editor), [editor])
}

/** @internal */
export function useIsInSelectState() {
	const editor = useEditor()
	return useValue('isInSelectState', () => editor.isIn('select'), [editor])
}

/** @internal */
export function useAllowGroup() {
	const editor = useEditor()
	return useValue('allow group', () => isGroupAllowed(editor), [editor])
}

/** @internal */
export function useAllowUngroup() {
	const editor = useEditor()
	return useValue('allowUngroup', () => isUngroupAllowed(editor), [editor])
}

export const showMenuPaste = canReadClipboard()

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
		() => countWithinBounds(getUnlockedSelectedShapes(editor).length, min, max),
		[editor, min, max]
	)
}

export function useShowAutoSizeToggle() {
	const editor = useEditor()
	return useValue('showAutoSizeToggle', () => canToggleAutoSize(editor), [editor])
}

export function useHasLinkShapeSelected() {
	const editor = useEditor()
	return useValue('hasLinkShapeSelected', () => hasLinkShapeSelected(editor), [editor])
}

export function useOnlyFlippableShape() {
	const editor = useEditor()
	return useValue('onlyFlippableShape', () => isOnlyFlippableShapeSelected(editor), [editor])
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
	return useValue('hasShapesOnPage', () => hasShapesOnPage(editor), [editor])
}

/**
 * Returns true if the user is in the select tool and has at least one shape selected.
 * @public
 */
export function useCanApplySelectionAction() {
	const editor = useEditor()
	return useValue('canApplySelectionAction', () => canApplySelectionAction(editor), [editor])
}
