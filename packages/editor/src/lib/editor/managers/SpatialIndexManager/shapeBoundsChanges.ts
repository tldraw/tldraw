import {
	Computed,
	RESET_VALUE,
	computed,
	isUninitialized,
	unsafe__withoutCapture,
	withDiff,
} from '@tldraw/state'
import type { TLShapeId } from '@tldraw/tlschema'
import { WeakCache } from '@tldraw/utils'
import type { Editor } from '../../Editor'
import { ShapesWithDirtyBounds, getShapesWithDirtyBounds } from './getShapesWithDirtyBounds'

// One store change's dirty shapes, expanded when a reader first asks. A reader that is about to
// rebuild never asks, so a bulk change (like loading a page of shapes) isn't expanded for it.
type PendingChanges = () => ShapesWithDirtyBounds

// A resolved entry holds every id its change touched, which for a frame with thousands of
// children is thousands of ids, so the buffer is kept short. Readers that are being observed lag
// by one entry; one that falls further behind than this rebuilds.
const HISTORY_LENGTH = 16

const trackers = new WeakCache<Editor, Computed<unknown[], PendingChanges>>()

function createTracker(editor: Editor) {
	const shapeHistory = editor.store.query.filterHistory('shape')
	// Binding changes can move a shape's derived bounds (e.g. creating or deleting an arrow
	// binding relocates the arrow's body) without touching any shape record.
	const bindingHistory = editor.store.query.filterHistory('binding')

	return computed<unknown[], PendingChanges>(
		'shapeBoundsChanges',
		(prevRebuildKey, lastComputedEpoch) => {
			const shapeDiff = shapeHistory.getDiffSince(lastComputedEpoch)
			const bindingDiff = bindingHistory.getDiffSince(lastComputedEpoch)
			// Everything else that bounds on the current page depend on. Which shapes a theme
			// change or font load resizes isn't known without visiting every shape, and both are
			// rare, so a change to any of these makes every reader rebuild.
			const rebuildKey = [
				editor.getCurrentPageId(),
				editor.getCurrentTheme(),
				editor.fonts.getFontLoadEpoch(),
			]

			if (
				isUninitialized(prevRebuildKey) ||
				shapeDiff === RESET_VALUE ||
				bindingDiff === RESET_VALUE ||
				rebuildKey.some((value, i) => value !== prevRebuildKey[i])
			) {
				// A new value without a diff clears the history, which readers see as RESET_VALUE.
				return rebuildKey
			}

			if (shapeDiff.length === 0 && bindingDiff.length === 0) return prevRebuildKey

			let changes: ShapesWithDirtyBounds | undefined
			return withDiff(rebuildKey, () => {
				// Without capture: the expansion would register a dependency per visited shape.
				changes ??= unsafe__withoutCapture(() =>
					getShapesWithDirtyBounds(editor, shapeDiff, bindingDiff)
				)
				return changes
			})
		},
		{ historyLength: HISTORY_LENGTH }
	)
}

/**
 * The shapes whose page-space bounds may have changed since a computed last ran: `undefined` if
 * none did, or `RESET_VALUE` if it must recheck every shape on the current page (its first run, a
 * page change, a theme change, a font load, or too many changes since it last ran).
 *
 * Call it inside the computed, passing on the arguments the computed was called with. It is the
 * only dependency the computed needs. Every reader gets all the changes since its own last run,
 * however the reads interleave, while each store change is expanded into dirty shapes (see
 * `getShapesWithDirtyBounds`) once per editor.
 *
 * The result is shared between readers, so don't mutate it.
 *
 * @internal
 */
export function getShapeBoundsChangesSince(
	editor: Editor,
	prevValue: unknown,
	lastComputedEpoch: number
): ShapesWithDirtyBounds | RESET_VALUE | undefined {
	const diffs = trackers.get(editor, createTracker).getDiffSince(lastComputedEpoch)
	if (isUninitialized(prevValue) || diffs === RESET_VALUE) return RESET_VALUE
	if (diffs.length === 0) return undefined
	if (diffs.length === 1) return diffs[0]()

	const dirty = new Set<TLShapeId>()
	const removed = new Set<TLShapeId>()
	for (const diff of diffs) {
		const changes = diff()
		for (const id of changes.dirty) dirty.add(id)
		for (const id of changes.removed) removed.add(id)
	}
	return { dirty, removed }
}
