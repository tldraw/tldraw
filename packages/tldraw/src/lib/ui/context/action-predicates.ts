import { Editor, TLImageShape, TLShape, TLVideoShape } from '@tldraw/editor'
import { getArrowBindings } from '../../shapes/arrow/shared'
import { EmbedShapeUtil } from '../../shapes/embed/EmbedShapeUtil'
import { getFrameableShapeIds } from '../../utils/frames/frames'
import { getSelectedLinkShape } from '../../utils/shapes/shapes'

// Shared by action isAvailable/isEnabled/isChecked and the menu hooks, so the two can't drift.
// Every function must stay pure and read only editor state: menus re-run them when that state
// changes, so anything else they read goes stale.

const FLIPPABLE_TYPES = new Set(['group', 'image', 'arrow', 'line', 'draw', 'geo'])

/** @internal */
export function canApplySelectionAction(editor: Editor) {
	return editor.isIn('select') && editor.getSelectedShapeIds().length > 0
}

/** @internal */
export function getUnlockedSelectedShapes(editor: Editor): TLShape[] {
	return editor.getSelectedShapes().filter((s) => !editor.isShapeOrAncestorLocked(s))
}

/** @internal */
export function hasUnlockedSelection(editor: Editor, min: number) {
	return getUnlockedSelectedShapes(editor).length >= min
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
	return editor.getCurrentPageShapes().some((s) => s.isLocked)
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
	return getUnlockedSelectedShapes(editor).some((s) => editor.isShapeOfType(s, 'group'))
}

/** @internal */
export function hasThreeStackableShapes(editor: Editor) {
	const stackable = getUnlockedSelectedShapes(editor).filter((shape) => {
		if (!editor.isShapeOfType(shape, 'arrow')) return true
		const { start, end } = getArrowBindings(editor, shape)
		return !start && !end
	})
	return stackable.length > 2
}

/** @internal */
export function isOnlyFlippableShapeSelected(editor: Editor) {
	const shape = editor.getOnlySelectedShape()
	return !!shape && FLIPPABLE_TYPES.has(shape.type) && !editor.isShapeOrAncestorLocked(shape)
}

/** @internal */
export function canToggleAutoSize(editor: Editor) {
	const shape = editor.getOnlySelectedShape()
	return !!shape && editor.isShapeOfType(shape, 'text') && shape.props.autoSize === false
}

/** @internal */
export function hasLinkShapeSelected(editor: Editor) {
	return !!getSelectedLinkShape(editor)
}

/** @internal */
export function canFrameSelection(editor: Editor) {
	const selected = editor.getSelectedShapes()
	if (selected.length === 0) return false
	// An all-frame selection unframes instead; remove-frame covers that.
	if (selected.every((s) => editor.isShapeOfType(s, 'frame'))) return false
	return getFrameableShapeIds(editor, editor.getSelectedShapeIds()).length > 0
}

/** @internal */
export function areAllSelectedFrameLike(editor: Editor) {
	const selected = editor.getSelectedShapes()
	return selected.length > 0 && selected.every((s) => editor.isShapeFrameLike(s))
}

/** @internal */
export function canFitFrameToContent(editor: Editor) {
	const shape = editor.getOnlySelectedShape()
	return (
		!!shape && editor.isShapeFrameLike(shape) && editor.getSortedChildIdsForParent(shape).length > 0
	)
}

/** @internal */
export function isOnlyEmbedWithUrlSelected(editor: Editor) {
	const shape = editor.getOnlySelectedShape()
	return (
		!!shape &&
		editor.isShapeOfType(shape, 'embed') &&
		!!shape.props.url &&
		!editor.isShapeOrAncestorLocked(shape)
	)
}

/** @internal */
export function isOnlyEmbeddableBookmarkSelected(editor: Editor) {
	const shape = editor.getOnlySelectedShape()
	if (!shape || !editor.isShapeOfType(shape, 'bookmark') || !shape.props.url) return false
	if (editor.isShapeOrAncestorLocked(shape) || !editor.hasShapeUtil('embed')) return false
	return !!(editor.getShapeUtil('embed') as EmbedShapeUtil).getEmbedDefinition(shape.props.url)
}

/** @internal */
export function canFlatten(editor: Editor) {
	if (editor.getSelectedShapeIds().length === 0) return false
	const shape = editor.getOnlySelectedShape()
	return !(shape && editor.isShapeOfType(shape, 'image'))
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
