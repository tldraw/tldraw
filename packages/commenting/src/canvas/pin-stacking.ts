import type { Editor, TLCommentThread } from 'tldraw'
import { anchorPagePoint } from './thread-state'

/** Two anchors within this page-space distance (per axis) share a stack. Identical imprecise
 *  anchors on one shape resolve to the same point exactly; the tolerance only absorbs float noise. */
const PIN_STACK_QUANTUM = 0.1

/**
 * The key a page point stacks under. Threads sharing a key are coincident. Stable identity for a
 * stack itself: it survives losing any member (the survivors keep the same key), unlike keying by
 * a particular thread id, so open-stack state stays put when the stack's oldest thread is deleted.
 */
export function pinStackKey(point: { x: number; y: number }): string {
	return `${Math.round(point.x / PIN_STACK_QUANTUM)}:${Math.round(point.y / PIN_STACK_QUANTUM)}`
}

/**
 * Group threads whose pins land on the same page point — coincident pins (typically several
 * imprecise comments on one shape) that zooming can never separate. The overlay renders each
 * group as a single count-badge pin that opens the threads as a list. Every member id maps to
 * its group's ordered member ids (oldest first); threads without an entry pin individually.
 *
 * Keyed by page-space anchor point, not screen position, so the result only changes when threads
 * or their anchors move — never on camera moves.
 * @internal
 */
export function computePinStacks(
	editor: Editor,
	threads: readonly TLCommentThread[]
): Map<string, readonly string[]> {
	const pageId = editor.getCurrentPageId()
	const groups = new Map<string, TLCommentThread[]>()

	for (const thread of threads) {
		if (thread.pageId !== pageId) continue
		const point = anchorPagePoint(editor, thread.anchor)
		if (!point) continue
		const key = pinStackKey(point)
		const group = groups.get(key)
		if (group) {
			group.push(thread)
		} else {
			groups.set(key, [thread])
		}
	}

	const stacks = new Map<string, readonly string[]>()
	for (const group of groups.values()) {
		if (group.length < 2) continue
		group.sort((a, b) => a.createdAt - b.createdAt || (a.id < b.id ? -1 : 1))
		const ids = group.map((thread) => thread.id)
		for (const id of ids) {
			stacks.set(id, ids)
		}
	}
	return stacks
}

/**
 * Value equality for pin-stack maps, so the overlay can hold the map's identity across a recompute
 * that changed no grouping. Membership only: two equal maps can describe stacks at different page
 * points, so anything keyed on a stack's *point* must read the anchors itself, as
 * {@link isOpenStackKeyLive} does.
 * @internal
 */
export function pinStacksEqual(
	a: ReadonlyMap<string, readonly string[]>,
	b: ReadonlyMap<string, readonly string[]>
): boolean {
	if (a === b) return true
	if (a.size !== b.size) return false
	for (const [id, group] of b) {
		const prevGroup = a.get(id)
		if (!prevGroup) return false
		if (prevGroup === group) continue
		if (prevGroup.length !== group.length) return false
		for (let i = 0; i < group.length; i++) {
			if (prevGroup[i] !== group[i]) return false
		}
	}
	return true
}

/**
 * Whether an open-stack key still names a stack on the canvas — false once that stack is emptied,
 * moved, or off the page, at which point the caller must clear the key. Reads the anchors, so a
 * reactive caller re-evaluates on a move that {@link pinStacksEqual} can't see.
 * @internal
 */
export function isOpenStackKeyLive(
	editor: Editor,
	key: string,
	stacks: ReadonlyMap<string, readonly string[]>,
	threadsById: ReadonlyMap<string, TLCommentThread>
): boolean {
	for (const id of stacks.keys()) {
		const thread = threadsById.get(id)
		if (!thread) continue
		const point = anchorPagePoint(editor, thread.anchor)
		if (point && pinStackKey(point) === key) return true
	}
	return false
}
