import {
	Computed,
	computed,
	createShapeId,
	Editor,
	IndexKey,
	TLImageShape,
	TLShape,
	TLVideoShape,
} from '@tldraw/editor'
import { getArrowBindings } from '../../shapes/arrow/shared'
import { EmbedShapeUtil } from '../../shapes/embed/EmbedShapeUtil'
import { getFrameableShapeIds } from '../../utils/frames/frames'
import { getSelectedLinkShape } from '../../utils/shapes/shapes'

// Shared by action isAvailable/isEnabled and the menu hooks, so the two can't drift.
// Every function must stay pure and read only editor state or values fixed for the session (like
// clipboard support): menus re-run them when editor state changes, so anything else goes stale.

/** @internal */
export function canApplySelectionAction(editor: Editor) {
	return editor.isIn('select') && editor.getSelectedShapeIds().length > 0
}

/**
 * Whether the `canWrite` editor option lets this person update and delete every selected shape
 * and its descendants. An action on a selection that holds one they may not write would be rolled
 * back whole, so it shows as disabled instead.
 *
 * @internal
 */
export function canWriteSelection(editor: Editor) {
	let cached = canWriteSelectionCache.get(editor)
	if (!cached) {
		// Many predicates ask this on every selection change, so walk the selection once
		cached = computed('can write selection', () => {
			for (const id of editor.getShapeAndDescendantIds(editor.getSelectedShapeIds())) {
				const shape = editor.getShape(id)
				if (!shape) continue
				if (!editor.canWrite({ type: 'update', record: shape })) return false
				if (!editor.canWrite({ type: 'delete', record: shape })) return false
			}
			return true
		})
		canWriteSelectionCache.set(editor, cached)
	}
	return cached.get()
}

const canWriteSelectionCache = new WeakMap<Editor, Computed<boolean>>()

/**
 * Duplicating writes only the new shapes, so unlike other selection actions it does not need to
 * write the selection.
 *
 * @internal
 */
export function canDuplicateSelection(editor: Editor) {
	const shapes = getUnlockedSelectedShapes(editor)
	return (
		editor.isIn('select') &&
		shapes.length > 0 &&
		shapes.every((shape) => canCreateShapeOfType(editor, shape.type))
	)
}

/**
 * Whether the `canWrite` editor option lets this person create a shape of this type on the current
 * page. It asks about a new shape with the type's default props, so a check that reads the props
 * of the shape to create may answer differently for the real one.
 *
 * @internal
 */
export function canCreateShapeOfType(editor: Editor, type: TLShape['type']) {
	if (!editor.hasShapeUtil(type)) return true
	const shape = {
		id: createShapeId(),
		typeName: 'shape',
		type,
		parentId: editor.getCurrentPageId(),
		index: 'a1' as IndexKey,
		x: 0,
		y: 0,
		rotation: 0,
		isLocked: false,
		opacity: 1,
		props: editor.getShapeUtil(type).getDefaultProps(),
		meta: {},
	} as TLShape
	shape.meta = editor.getInitialMetaForShape(shape)
	return editor.canWrite({ type: 'create', record: shape })
}

/** @internal */
export function getUnlockedSelectedShapes(editor: Editor): TLShape[] {
	return editor.getSelectedShapes().filter((s) => !editor.isShapeOrAncestorLocked(s))
}

/** @internal */
export function hasUnlockedSelection(editor: Editor, min: number) {
	return getUnlockedSelectedShapes(editor).length >= min && canWriteSelection(editor)
}

/** @internal */
export function canApplyToUnlockedSelection(editor: Editor, min: number) {
	return editor.isIn('select') && hasUnlockedSelection(editor, min)
}

/** @internal */
export function hasShapesOnPage(editor: Editor) {
	return editor.getCurrentPageShapeIds().size > 0
}

/** @internal */
export function hasLockedShapesOnPage(editor: Editor) {
	const locked = editor.getCurrentPageShapes().filter((s) => s.isLocked)
	return locked.length > 0 && locked.every((s) => editor.canWrite({ type: 'update', record: s }))
}

/** @internal */
export function isGroupAllowed(editor: Editor) {
	if (!hasUnlockedSelection(editor, 2)) return false
	const selected = editor.getSelectedShapes()
	const selectedIds = new Set(selected.map((s) => s.id))
	// An arrow grouped without a shape it's bound to gets reparented back out of the group.
	for (const shape of selected) {
		if (!editor.isShapeOfType(shape, 'arrow')) continue
		const { start, end } = getArrowBindings(editor, shape)
		if (start && !selectedIds.has(start.toId)) return false
		if (end && !selectedIds.has(end.toId)) return false
	}
	return true
}

/** @internal */
export function isUngroupAllowed(editor: Editor) {
	return (
		getUnlockedSelectedShapes(editor).some((s) => editor.isShapeOfType(s, 'group')) &&
		canWriteSelection(editor)
	)
}

/** @internal */
export function hasThreeStackableShapes(editor: Editor) {
	const stackable = getUnlockedSelectedShapes(editor).filter((shape) => {
		if (!editor.isShapeOfType(shape, 'arrow')) return true
		const { start, end } = getArrowBindings(editor, shape)
		return !start && !end
	})
	return stackable.length > 2 && canWriteSelection(editor)
}

/** @internal */
export function isOnlyFlippableShapeSelected(editor: Editor) {
	const shape = editor.getOnlySelectedShape()
	if (!shape || editor.isShapeOrAncestorLocked(shape) || !canWriteSelection(editor)) return false
	const util = editor.getShapeUtil(shape)
	// A lone bound arrow opts out of the flip via canBeLaidOut, so flipping it would do nothing.
	return util.canFlip(shape) && util.canBeLaidOut(shape, { type: 'flip', shapes: [shape] })
}

/** @internal */
export function canFlipSelection(editor: Editor) {
	return (
		editor.isIn('select') &&
		(hasUnlockedSelection(editor, 2) || isOnlyFlippableShapeSelected(editor))
	)
}

/** @internal */
export function canToggleAutoSize(editor: Editor) {
	const shape = editor.getOnlySelectedShape()
	return (
		!!shape &&
		editor.isShapeOfType(shape, 'text') &&
		shape.props.autoSize === false &&
		canWriteSelection(editor)
	)
}

/** @internal */
export function hasLinkShapeSelected(editor: Editor) {
	return !!getSelectedLinkShape(editor) && canWriteSelection(editor)
}

/** @internal */
export function canFrameSelection(editor: Editor) {
	if (editor.getSelectedShapeIds().length === 0) return false
	// An all-frame selection is disabled; remove-frame covers it.
	if (areAllSelectedFrames(editor)) return false
	if (!canWriteSelection(editor)) return false
	return getFrameableShapeIds(editor, editor.getSelectedShapeIds()).length > 0
}

/**
 * Strictly `frame`, unlike {@link areAllSelectedFrameLike}: the frame toggle shortcut wraps custom
 * frame-like shapes rather than removing them.
 *
 * @internal
 */
export function areAllSelectedFrames(editor: Editor) {
	const selected = editor.getSelectedShapes()
	return selected.length > 0 && selected.every((s) => editor.isShapeOfType(s, 'frame'))
}

/** @internal */
export function areAllSelectedFrameLike(editor: Editor) {
	const selected = editor.getSelectedShapes()
	return (
		selected.length > 0 &&
		selected.every((s) => editor.isShapeFrameLike(s)) &&
		canWriteSelection(editor)
	)
}

/** @internal */
export function canFitFrameToContent(editor: Editor) {
	const shape = editor.getOnlySelectedShape()
	return (
		!!shape &&
		editor.isShapeFrameLike(shape) &&
		editor.getSortedChildIdsForParent(shape).length > 0 &&
		canWriteSelection(editor)
	)
}

/** @internal */
export function isOnlyEmbedWithUrlSelected(editor: Editor) {
	const shape = editor.getOnlySelectedShape()
	return (
		!!shape &&
		editor.isShapeOfType(shape, 'embed') &&
		!!shape.props.url &&
		!editor.isShapeOrAncestorLocked(shape) &&
		canWriteSelection(editor)
	)
}

/** @internal */
export function isOnlyEmbeddableBookmarkSelected(editor: Editor) {
	const shape = editor.getOnlySelectedShape()
	if (!shape || !editor.isShapeOfType(shape, 'bookmark') || !shape.props.url) return false
	if (editor.isShapeOrAncestorLocked(shape) || !editor.hasShapeUtil('embed')) return false
	if (!canWriteSelection(editor)) return false
	return !!(editor.getShapeUtil('embed') as EmbedShapeUtil).getEmbedDefinition(shape.props.url)
}

/** @internal */
export function canFlatten(editor: Editor) {
	if (editor.getSelectedShapeIds().length === 0) return false
	const shape = editor.getOnlySelectedShape()
	return !(shape && editor.isShapeOfType(shape, 'image')) && canWriteSelection(editor)
}

/** @public */
export function supportsDownloadingOriginal(
	shape: TLShape,
	editor: Editor
): shape is TLImageShape | TLVideoShape {
	return (
		(editor.isShapeOfType(shape, 'image') || editor.isShapeOfType(shape, 'video')) &&
		!!(shape as any).props.assetId
	)
}

/** @internal */
export function hasDownloadableMediaSelected(editor: Editor) {
	return editor.getSelectedShapes().some((s) => supportsDownloadingOriginal(s, editor))
}

/** @internal */
export function isContentOffscreen(editor: Editor) {
	const ids = editor.getCurrentPageShapeIds()
	return ids.size > 0 && ids.size === editor.getNotVisibleShapes().size
}

/** @internal */
export function canWriteClipboard(editor: Editor) {
	return !!editor.getContainerWindow().navigator.clipboard?.write
}

const clipboardReadable =
	typeof window !== 'undefined' &&
	'navigator' in window &&
	Boolean(navigator.clipboard) &&
	Boolean(navigator.clipboard.read)

/** @internal */
export function canReadClipboard() {
	return clipboardReadable
}
