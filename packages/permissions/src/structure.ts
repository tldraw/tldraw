import type { UnknownRecord } from '@tldraw/store'
import { getOwningPage } from './ownership'

/**
 * What {@link createStructureRule} needs from a push. A sync room's `authorize` arguments
 * fit as they are.
 *
 * @public
 */
export interface TLStructureRuleArgs {
	changes: ReadonlyArray<{
		type: 'create' | 'update' | 'delete'
		prev: UnknownRecord | null
		next: UnknownRecord | null
	}>
	after(id: string): UnknownRecord | undefined
}

/**
 * A rule that refuses a push which would break the document's structure: a shape whose parent is
 * missing, isn't a shape or page, or loops back on itself, and a binding whose shapes are missing
 * or on different pages.
 *
 * Only what the push changes is judged, so records that were already broken don't block edits,
 * and the push that repairs them is allowed. What a delete leaves behind (children of a deleted
 * frame, bindings to a deleted shape) is not checked yet: finding those needs a lookup of what
 * points at a record.
 *
 * Put it first in a room's `authorize`:
 *
 * @example
 * ```ts
 * new TLSocketRoom({ authorize: composeRules(createStructureRule(), myRule) })
 * ```
 *
 * @public
 */
export function createStructureRule(): (
	args: TLStructureRuleArgs
) => { reason: string; ids: string[] } | null {
	return ({ changes, after }) => {
		for (const { type, prev, next } of changes) {
			if (!next) continue
			if (next.typeName === 'shape') {
				if (type === 'update' && parentId(prev!) === parentId(next)) continue
				if (!getOwningPage(after, next).page) return refuse('dangling parent', next.id)
			} else if (next.typeName === 'binding') {
				if (type === 'update' && sameEnds(prev!, next)) continue
				const owning = getOwningPage(after, next)
				if (!owning.page) return refuse(`${owning.reason} binding`, next.id)
			}
		}
		return null
	}
}

const parentId = (record: UnknownRecord) =>
	(record as UnknownRecord & { parentId: string }).parentId

const sameEnds = (a: UnknownRecord, b: UnknownRecord) => {
	const x = a as UnknownRecord & { fromId: string; toId: string }
	const y = b as UnknownRecord & { fromId: string; toId: string }
	return x.fromId === y.fromId && x.toId === y.toId
}

const refuse = (reason: string, id: string) => ({ reason, ids: [id] })
