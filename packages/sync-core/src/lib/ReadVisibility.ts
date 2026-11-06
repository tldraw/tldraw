import type { UnknownRecord } from '@tldraw/store'
import {
	accessCan,
	type TLAccess,
	type TLPermissionsConfig,
	type TLRecordReader,
} from '@tldraw/tlschema'

type CanRead<R extends UnknownRecord> = NonNullable<TLPermissionsConfig<R>['canRead']>

/** What changed for one access after a change to the room. */
export interface VisibilityChange {
	readonly shown: ReadonlySet<string>
	readonly hidden: ReadonlySet<string>
}

/**
 * What changed for each access, and the records that became visible to someone. Those records
 * are read while the storage transaction is open: the broadcast runs after it closes.
 */
export interface VisibilityUpdate<R extends UnknownRecord> {
	readonly changes: ReadonlyMap<string, VisibilityChange>
	readonly revealed: ReadonlyMap<string, R>
}

/** One key per distinct access, so sessions with the same access share one index. */
export function accessKey(access: TLAccess) {
	return JSON.stringify([access.userId, [...access.abilities].sort()])
}

/**
 * The records one access can see, kept up to date as records change.
 *
 * `canRead` gets a reader over the whole room, so a record's visibility can depend on other
 * records: a shape on a hidden page, a cursor on that page. The index remembers which records
 * each check read. When a record changes, it checks that record again and every record whose
 * last check read it. A check that scanned the whole room (`records.all()`) runs again on every
 * change. So the cost of a change is the records it touches and their readers, not the room.
 */
export class VisibilityIndex<R extends UnknownRecord> {
	readonly visible = new Set<string>()
	/** For each record, the ids its last check read. */
	private readonly readsOf = new Map<string, Set<string>>()
	/** For each id, the records whose last check read it. */
	private readonly readers = new Map<string, Set<string>>()
	/** Records whose last check scanned every record. */
	private readonly readsAll = new Set<string>()

	constructor(
		private readonly access: TLAccess,
		private readonly canRead: CanRead<R>
	) {}

	/** Check every record. */
	build(ids: Iterable<string>, records: TLRecordReader<R>) {
		for (const id of ids) this.check(id, records)
	}

	/** Check `ids` again, and every record whose last check read one of them. */
	update(ids: Iterable<string>, records: TLRecordReader<R>): VisibilityChange {
		const dirty = new Set<string>()
		for (const id of ids) {
			dirty.add(id)
			const readers = this.readers.get(id)
			if (readers) for (const reader of readers) dirty.add(reader)
		}
		for (const id of this.readsAll) dirty.add(id)

		const shown = new Set<string>()
		const hidden = new Set<string>()
		for (const id of dirty) {
			const was = this.visible.has(id)
			const is = this.check(id, records)
			if (is && !was) shown.add(id)
			else if (was && !is) hidden.add(id)
		}
		return { shown, hidden }
	}

	private check(id: string, records: TLRecordReader<R>): boolean {
		this.forgetReads(id)
		const record = records.get(id)
		if (!record) {
			this.visible.delete(id)
			return false
		}
		const reads = new Set<string>()
		const tracked: TLRecordReader<R> = {
			get: (readId) => {
				reads.add(readId)
				return records.get(readId)
			},
			all: () => {
				this.readsAll.add(id)
				return records.all()
			},
		}
		let visible: boolean
		try {
			visible = this.canRead(record, {
				access: this.access,
				can: (ability) => accessCan(this.access, ability),
				records: tracked,
			})
		} catch {
			// fail closed: a check that throws hides the record
			visible = false
		}
		reads.delete(id)
		if (reads.size) {
			this.readsOf.set(id, reads)
			for (const readId of reads) {
				let readers = this.readers.get(readId)
				if (!readers) this.readers.set(readId, (readers = new Set()))
				readers.add(id)
			}
		}
		if (visible) this.visible.add(id)
		else this.visible.delete(id)
		return visible
	}

	private forgetReads(id: string) {
		this.readsAll.delete(id)
		const reads = this.readsOf.get(id)
		if (!reads) return
		this.readsOf.delete(id)
		for (const readId of reads) {
			const readers = this.readers.get(readId)
			if (!readers) continue
			readers.delete(id)
			if (!readers.size) this.readers.delete(readId)
		}
	}
}

/** The visibility indexes of a room: one for each distinct access among its sessions. */
export class RoomVisibility<R extends UnknownRecord> {
	private readonly indexes = new Map<string, VisibilityIndex<R>>()

	constructor(private readonly canRead: CanRead<R>) {}

	/** The index for `access`. The first call for an access checks every record. */
	indexFor(access: TLAccess, ids: () => Iterable<string>, records: TLRecordReader<R>) {
		const key = accessKey(access)
		let index = this.indexes.get(key)
		if (!index) {
			index = new VisibilityIndex(access, this.canRead)
			index.build(ids(), records)
			this.indexes.set(key, index)
		}
		return index
	}

	/** Bring every index up to date after `ids` changed. */
	update(ids: Iterable<string>, records: TLRecordReader<R>): VisibilityUpdate<R> {
		const changed = [...ids]
		const changes = new Map<string, VisibilityChange>()
		const revealed = new Map<string, R>()
		for (const [key, index] of this.indexes) {
			const change = index.update(changed, records)
			if (!change.shown.size && !change.hidden.size) continue
			changes.set(key, change)
			for (const id of change.shown) {
				if (revealed.has(id)) continue
				const record = records.get(id)
				if (record) revealed.set(id, record)
			}
		}
		return { changes, revealed }
	}

	/** Drop the indexes of accesses that no session has any more. */
	retain(accesses: Iterable<TLAccess>) {
		const keep = new Set<string>()
		for (const access of accesses) keep.add(accessKey(access))
		for (const key of this.indexes.keys()) {
			if (!keep.has(key)) this.indexes.delete(key)
		}
	}
}
