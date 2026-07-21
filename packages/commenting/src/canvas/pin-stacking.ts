import type { Editor, TLCommentThread } from 'tldraw'
import { anchorPagePoint } from './thread-state'

/** How far each successive pin in a stack of coincident pins steps sideways, in screen pixels.
 * @public */
export const PIN_STACK_STEP_PX = 12

/** Two anchors within this page-space distance (per axis) share a stack. Identical imprecise
 *  anchors on one shape resolve to the same point exactly; the tolerance only absorbs float noise. */
const PIN_STACK_QUANTUM = 0.1

/**
 * Index each thread whose pin lands on the same page point as another thread's — coincident pins
 * (typically several imprecise comments on one shape) that zooming can never separate. The overlay
 * spreads a stack sideways by a fixed screen offset per index, oldest thread at the anchor.
 *
 * Keyed by page-space anchor point, not screen position, so the result only changes when threads
 * or their anchors move — never on camera moves. Threads without an entry render unshifted.
 * @public
 */
export function computePinStacks(
	editor: Editor,
	threads: readonly TLCommentThread[],
	impreciseShapeAnchor?: { x: number; y: number }
): Map<string, number> {
	const pageId = editor.getCurrentPageId()
	const groups = new Map<string, TLCommentThread[]>()

	for (const thread of threads) {
		if (thread.pageId !== pageId) continue
		const point = anchorPagePoint(editor, thread.anchor, impreciseShapeAnchor)
		if (!point) continue
		const key = `${Math.round(point.x / PIN_STACK_QUANTUM)}:${Math.round(point.y / PIN_STACK_QUANTUM)}`
		const group = groups.get(key)
		if (group) {
			group.push(thread)
		} else {
			groups.set(key, [thread])
		}
	}

	const indexes = new Map<string, number>()
	for (const group of groups.values()) {
		if (group.length < 2) continue
		group.sort((a, b) => a.createdAt - b.createdAt || (a.id < b.id ? -1 : 1))
		for (let i = 0; i < group.length; i++) {
			indexes.set(group[i].id, i)
		}
	}
	return indexes
}
