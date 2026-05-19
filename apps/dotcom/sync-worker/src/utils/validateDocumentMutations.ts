import { TLSyncStorageTransaction } from '@tldraw/sync-core'
import { TLRecord } from '@tldraw/tlschema'
import { StatusError } from 'itty-router'

const MAX_PARENT_DEPTH = 200

/**
 * Walks document state in `txn` after RPC mutations have been applied. Enforces:
 *  - Every shape's `parentId` resolves to a page or shape that exists.
 *  - No cycles in the parent chain.
 *  - When a shape is deleted, also delete its descendant shapes and any bindings
 *    that reference it (cascade), mirroring Editor.deleteShapes semantics.
 *  - Refuse to delete the last page.
 *
 * Throws StatusError(422) if invariants cannot be satisfied.
 */
export function validateAndRepairDocumentMutations(
	txn: TLSyncStorageTransaction<TLRecord>,
	mutatedShapeIds: Set<string>,
	deletedShapeIds: Set<string>
): void {
	// Cascade-delete descendants of deleted shapes.
	if (deletedShapeIds.size > 0) {
		const allShapesByParent = new Map<string, string[]>()
		for (const record of txn.values()) {
			if (record.typeName !== 'shape') continue
			const parentId = (record as any).parentId as string
			const list = allShapesByParent.get(parentId)
			if (list) list.push(record.id)
			else allShapesByParent.set(parentId, [record.id])
		}

		const queue = Array.from(deletedShapeIds)
		while (queue.length > 0) {
			const id = queue.shift()!
			const children = allShapesByParent.get(id)
			if (!children) continue
			for (const childId of children) {
				if (deletedShapeIds.has(childId)) continue
				deletedShapeIds.add(childId)
				txn.delete(childId)
				queue.push(childId)
			}
		}

		// Cascade-delete bindings that reference any deleted shape.
		for (const record of txn.values()) {
			if (record.typeName !== 'binding') continue
			const b = record as any
			if (deletedShapeIds.has(b.fromId) || deletedShapeIds.has(b.toId)) {
				txn.delete(record.id)
			}
		}
	}

	// Refuse to delete the last page.
	let pageCount = 0
	for (const record of txn.values()) {
		if (record.typeName === 'page') pageCount++
	}
	if (pageCount === 0) {
		throw new StatusError(422, 'Cannot leave document without a page')
	}

	// Validate parent references and check for cycles on every shape that was
	// inserted/updated this transaction.
	for (const id of mutatedShapeIds) {
		if (deletedShapeIds.has(id)) continue
		const shape = txn.get(id)
		if (!shape || shape.typeName !== 'shape') continue
		const parentId = (shape as any).parentId as string

		const parent = txn.get(parentId)
		if (!parent || (parent.typeName !== 'page' && parent.typeName !== 'shape')) {
			throw new StatusError(422, `shape ${id} has invalid parentId ${parentId}`)
		}

		// Walk up the parent chain to detect cycles.
		const seen = new Set<string>([id])
		let cursor: TLRecord = parent
		for (let depth = 0; depth < MAX_PARENT_DEPTH; depth++) {
			if (cursor.typeName !== 'shape') break
			const cursorParentId = (cursor as any).parentId as string
			if (seen.has(cursor.id)) {
				throw new StatusError(422, `cycle detected in parent chain involving ${id}`)
			}
			seen.add(cursor.id)
			const next = txn.get(cursorParentId)
			if (!next) {
				throw new StatusError(422, `shape ${cursor.id} has invalid parentId ${cursorParentId}`)
			}
			cursor = next
		}
	}
}
