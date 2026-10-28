import { useEditor, useValue } from '@tldraw/editor'
import {
	canApplySelectionAction,
	getUnlockedSelectedShapes,
	hasShapesOnPage,
} from '../context/action-predicates'

// The @public hooks here are SDK API: keep them even when nothing in tldraw calls them.

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
