import { Editor, TLShapeId } from '@tldraw/editor'

/**
 * Tracks changes made to a gesture's shapes from outside the gesture itself.
 *
 * Snapshot-based gestures (translate, resize, rotate) recompute their shapes'
 * positions from a snapshot taken at the start of the gesture, recomputed every
 * frame as `snapshot + gesture delta`. That math reads nothing live, so a change
 * made to those shapes by something other than the gesture mid-interaction (e.g.
 * a `rotateShapesBy` or `nudgeShapes` keyboard shortcut) is stomped by the next
 * frame.
 *
 * This tracker lets a gesture notice such a change cheaply so it can re-anchor
 * its snapshot onto the current shapes:
 *
 * - wrap the gesture's own writes in {@link GestureShapeChangeTracker.ignoreChanges}
 *   so they aren't mistaken for external changes. This is the per-frame common
 *   case and costs O(1), which keeps detection off the hot path,
 * - check {@link GestureShapeChangeTracker.getAndClearChanged} at the top of each
 *   update; when it returns true, the gesture re-anchors its snapshot.
 *
 * @internal
 */
export class GestureShapeChangeTracker {
	private isApplyingOwnChange = false
	private changed = false
	private dispose?: () => void

	constructor(
		private readonly editor: Editor,
		/** Whether a changed shape is one this gesture is manipulating. */
		private readonly isTrackedShape: (id: TLShapeId) => boolean
	) {}

	start() {
		this.changed = false
		this.dispose = this.editor.sideEffects.registerAfterChangeHandler('shape', (_prev, next) => {
			// Our own writes are wrapped in `ignoreChanges`, so anything that lands
			// while that flag is set is the gesture moving its shapes.
			if (this.isApplyingOwnChange || this.changed) return
			if (this.isTrackedShape(next.id)) this.changed = true
		})
	}

	stop() {
		this.dispose?.()
		this.dispose = undefined
	}

	/** Forget any pending external change, e.g. after bailing to a mark. */
	clear() {
		this.changed = false
	}

	/** Returns whether an external change has happened since the last call, and resets the flag. */
	getAndClearChanged() {
		const { changed } = this
		this.changed = false
		return changed
	}

	/** Run the gesture's own writes so the tracker doesn't treat them as external. */
	ignoreChanges<T>(fn: () => T): T {
		const wasApplyingOwnChange = this.isApplyingOwnChange
		this.isApplyingOwnChange = true
		try {
			return fn()
		} finally {
			this.isApplyingOwnChange = wasApplyingOwnChange
		}
	}
}
