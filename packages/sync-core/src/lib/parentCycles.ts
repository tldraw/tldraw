import { UnknownRecord } from '@tldraw/store'
import { NetworkDiff, RecordOpType, ValueOpType } from './diff'

type ParentChainRecord = UnknownRecord & { parentId?: unknown }

/**
 * Ids of the ops in `diff` that would leave a shape inside its own parent chain once the whole
 * diff is applied. Two concurrent reparents can each be valid alone and form a cycle together,
 * which overflows the stack on every client (#6152).
 *
 * Judged against the end state, not op by op: a diff that moves f2 out of f1 and then f1 into f2
 * is valid whichever op is applied first. Dropping an op can strand another one that depended on
 * it, so this repeats until no new ops are refused.
 *
 * Sync is otherwise record-type agnostic; tldraw shapes are the only records with a parent chain.
 */
export function getParentCycleOpIds<R extends UnknownRecord>(
	diff: NetworkDiff<R>,
	getStored: (id: string) => UnknownRecord | undefined
): Set<string> {
	const refused = new Set<string>()
	const proposed = new Map<string, unknown>()
	for (const [id, op] of Object.entries(diff)) {
		const parentId = getProposedParentId(op)
		if (parentId !== undefined) proposed.set(id, parentId)
	}
	if (proposed.size === 0) return refused

	const parentOf = (id: string): unknown => {
		if (proposed.has(id) && !refused.has(id)) return proposed.get(id)
		if (diff[id]?.[0] === RecordOpType.Remove && !refused.has(id)) return undefined
		const stored = getStored(id) as ParentChainRecord | undefined
		return stored?.typeName === 'shape' ? stored.parentId : undefined
	}

	// Flag a whole pass before refusing any of it, so every op of a cycle is refused together
	// rather than the first one found breaking it and leaving the rest pointing at it.
	while (true) {
		const inCycle = [...proposed.keys()].filter(
			(id) => !refused.has(id) && isOwnAncestor(id, parentOf)
		)
		if (inCycle.length === 0) return refused
		for (const id of inCycle) refused.add(id)
	}
}

/**
 * The parent an op sets, if any. Reads only the op, never storage, because this runs on every
 * push. Only shapes have a `parentId`, so a patch that sets one is a shape patch.
 */
function getProposedParentId(op: NetworkDiff<UnknownRecord>[string]): unknown {
	if (op[0] === RecordOpType.Put) {
		const next = op[1] as ParentChainRecord
		return next.typeName === 'shape' ? next.parentId : undefined
	}
	if (op[0] === RecordOpType.Patch) {
		const parentOp = op[1].parentId
		return parentOp?.[0] === ValueOpType.Put ? parentOp[1] : undefined
	}
	return undefined
}

function isOwnAncestor(id: string, parentOf: (id: string) => unknown): boolean {
	// `visited` ends the walk if the ancestors already loop without passing through `id`.
	const visited = new Set<string>()
	let current = parentOf(id)
	while (typeof current === 'string' && !visited.has(current)) {
		if (current === id) return true
		visited.add(current)
		current = parentOf(current)
	}
	return false
}
