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
