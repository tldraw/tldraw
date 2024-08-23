import {
	Editor,
	TLArrowShape,
	TLBookmarkShape,
	TLDrawShape,
	TLEmbedShape,
	TLFrameShape,
	TLGroupShape,
	TLImageShape,
	TLLineShape,
	TLTextShape,
	useEditor,
	useQuickReactor,
	useValue,
} from '@tldraw/editor'
import { useRef, useState } from 'react'
import { getArrowBindings } from '../../shapes/arrow/shared'
import { useGetEmbedDefinition } from './useGetEmbedDefinition'

function shapesWithUnboundArrows(editor: Editor) {
	const selectedShapeIds = editor.getSelectedShapeIds()
	const selectedShapes = selectedShapeIds.map((id) => {
		return editor.getShape(id)
	})

	return selectedShapes.filter((shape) => {
		if (!shape) return false
		if (editor.isShapeOfType<TLArrowShape>(shape, 'arrow')) {
			const bindings = getArrowBindings(editor, shape)
			if (bindings.start || bindings.end) return false
		}
		return true
	})
}

/** @internal */
export const useThreeStackableItems = () => {
	const editor = useEditor()
	return useValue('threeStackableItems', () => shapesWithUnboundArrows(editor).length > 2, [editor])
}

/** @internal */
export const useIsInSelectState = () => {
	const editor = useEditor()
	return useValue('isInSelectState', () => editor.isIn('select'), [editor])
}

/** @internal */
export const useAllowGroup = () => {
	const editor = useEditor()
	return useValue(
		'allow group',
		() => {
			// We can't group arrows that are bound to shapes that aren't selected
			// if more than one shape has an arrow bound to it, allow group
			const selectedShapes = editor.getSelectedShapes()

			if (selectedShapes.length < 2) return false

			for (const shape of selectedShapes) {
				if (editor.isShapeOfType<TLArrowShape>(shape, 'arrow')) {
					const bindings = getArrowBindings(editor, shape)
					if (bindings.start) {
						// if the other shape is not among the selected shapes...
						if (!selectedShapes.some((s) => s.id === bindings.start!.toId)) {
							return false
						}
					}
					if (bindings.end) {
						// if the other shape is not among the selected shapes...
						if (!selectedShapes.some((s) => s.id === bindings.end!.toId)) {
							return false
						}
					}
				}
			}
			return true
		},
		[editor]
	)
}

/** @internal */
export const useAllowUngroup = () => {
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

/**
 * Returns true if the number of LOCKED OR UNLOCKED selected shapes is at least min or at most max.
 */
export function useAnySelectedShapesCount(min?: number, max?: number) {
	const editor = useEditor()
	return useValue(
		'selectedShapes',
		() => {
			const len = editor.getSelectedShapes().length
			if (min === undefined) {
				if (max === undefined) {
					// just length
					return len
				} else {
					// max but no min
					return len <= max
				}
			} else {
				if (max === undefined) {
					// min but no max
					return len >= min
				} else {
					// max and min
					return len >= min && len <= max
				}
			}
		},
		[editor, min, max]
	)
}

/**
 * Returns true if the number of UNLOCKED selected shapes is at least min or at most max.
 */
export function useUnlockedSelectedShapesCount(min?: number, max?: number) {
	const editor = useEditor()
	return useValue(
		'selectedShapes',
		() => {
			const len = editor
				.getSelectedShapes()
				.filter((s) => !editor.isShapeOrAncestorLocked(s)).length
			if (min === undefined) {
				if (max === undefined) {
					// just length
					return len
				} else {
					// max but no min
					return len <= max
				}
			} else {
				if (max === undefined) {
					// min but no max
					return len >= min
				} else {
					// max and min
					return len >= min && len <= max
				}
			}
		},
		[editor]
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
				editor.isShapeOfType<TLTextShape>(selectedShapes[0], 'text') &&
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
				(editor.isShapeOfType<TLGroupShape>(shape, 'group') ||
					editor.isShapeOfType<TLImageShape>(shape, 'image') ||
					editor.isShapeOfType<TLArrowShape>(shape, 'arrow') ||
					editor.isShapeOfType<TLLineShape>(shape, 'line') ||
					editor.isShapeOfType<TLDrawShape>(shape, 'draw'))
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

/** @public */
export function useOneEmbeddableBookmarkSelected() {
	const editor = useEditor()
	const getEmbedDefinition = useGetEmbedDefinition()

	return useValue(
		'oneEmbeddableBookmarkSelected',
		() => {
			const onlySelectedShape = editor.getOnlySelectedShape()
			if (!onlySelectedShape) return false
			return !!(
				editor.isShapeOfType<TLBookmarkShape>(onlySelectedShape, 'bookmark') &&
				onlySelectedShape.props.url &&
				getEmbedDefinition(onlySelectedShape.props.url) &&
				!editor.isShapeOrAncestorLocked(onlySelectedShape)
			)
		},
		[editor]
	)
}

/** @public */
export function useOneEmbedSelected() {
	const editor = useEditor()

	return useValue(
		'oneEmbedSelected',
		() => {
			const onlySelectedShape = editor.getOnlySelectedShape()
			if (!onlySelectedShape) return false
			return !!(
				editor.isShapeOfType<TLEmbedShape>(onlySelectedShape, 'embed') &&
				onlySelectedShape.props.url &&
				!editor.isShapeOrAncestorLocked(onlySelectedShape)
			)
		},
		[editor]
	)
}

/** @public */
export function useCanFlattenToImage() {
	const editor = useEditor()
	return useValue(
		'should display flatten option',
		() => {
			const selectedShapeIds = editor.getSelectedShapeIds()
			if (selectedShapeIds.length === 0) return false
			const onlySelectedShape = editor.getOnlySelectedShape()
			if (onlySelectedShape && editor.isShapeOfType<TLImageShape>(onlySelectedShape, 'image')) {
				return false
			}
			return true
		},
		[editor]
	)
}

/** @public */
export function useCanRemoveFrame() {
	const editor = useEditor()
	return useValue(
		'allow unframe',
		() => {
			const selectedShapes = editor.getSelectedShapes()
			if (selectedShapes.length === 0) return false
			return selectedShapes.every((shape) => editor.isShapeOfType<TLFrameShape>(shape, 'frame'))
		},
		[editor]
	)
}

/** @public */
export function useCanFitFrameToContent() {
	const editor = useEditor()
	return useValue(
		'allow fit frame to content',
		() => {
			const onlySelectedShape = editor.getOnlySelectedShape()
			if (!onlySelectedShape) return false
			return (
				editor.isShapeOfType<TLFrameShape>(onlySelectedShape, 'frame') &&
				editor.getSortedChildIdsForParent(onlySelectedShape).length > 0
			)
		},
		[editor]
	)
}

/** @public */
export function useCanUnlockAll() {
	const editor = useEditor()
	return useValue('any shapes', () => editor.getCurrentPageShapeIds().size > 0, [editor])
}

/** @public */
export function useIsSinglePageMode() {
	const editor = useEditor()
	return useValue('isSinglePageMode', () => editor.options.maxPages <= 1, [editor])
}

/** @public  */
export function useIsFollowingUser() {
	const editor = useEditor()
	return useValue('isFollowingUser', () => !!editor.getInstanceState().followingUserId, [editor])
}

/** @public  */
export function useShowBackToContent() {
	const editor = useEditor()

	const [showBackToContent, setShowBackToContent] = useState(false)
	const rIsShowing = useRef(false)

	useQuickReactor(
		'toggle showback to content',
		() => {
			const showBackToContentPrev = rIsShowing.current
			const shapeIds = editor.getCurrentPageShapeIds()
			let showBackToContentNow = false
			if (shapeIds.size) {
				showBackToContentNow = shapeIds.size === editor.getCulledShapes().size
			}

			if (showBackToContentPrev !== showBackToContentNow) {
				setShowBackToContent(showBackToContentNow)
				rIsShowing.current = showBackToContentNow
			}
		},
		[editor]
	)
	return [showBackToContent, setShowBackToContent] as const
}
