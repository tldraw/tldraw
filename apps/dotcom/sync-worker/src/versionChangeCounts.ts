import { UnknownRecord } from '@tldraw/store'
import { NetworkDiff } from '@tldraw/sync-core'

export function countShapeChanges(diff: NetworkDiff<UnknownRecord> | null): {
	added: number
	updated: number
	removed: number
} {
	const counts = { added: 0, updated: 0, removed: 0 }
	if (!diff) return counts
	// Only `put` carries the record, so filter by id prefix rather than typeName.
	for (const [id, op] of Object.entries(diff)) {
		if (!id.startsWith('shape:')) continue
		if (op[0] === 'put') counts.added++
		else if (op[0] === 'patch') counts.updated++
		else counts.removed++
	}
	return counts
}
