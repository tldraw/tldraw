import { Atom, atom, transact } from '@tldraw/state'
import { exhaustiveSwitchError, objectMapValues } from '@tldraw/utils'
import { nanoid } from 'nanoid'
import { IdOf, UnknownRecord } from '../BaseRecord'
import { ChangeSource } from '../Store'
import { SerializedSchema, StoreSchema } from '../StoreSchema'
import {
	ChangeOp,
	ChangeOpType,
	Changes,
	addDeleteChange,
	addSetChange,
	mergeChanges,
} from './changes'
import { NetworkDiff, RecordOpType, applyObjectDiff, diffRecord } from './diff'
import { GoingDownstreamPatchMessage, GoingDownstreamSocket, GoingUpstreamSocket } from './protocol'

export enum PushOpStatus {
	Unsent = 'unsent',
	Sent = 'sent',
}

export type PushOp<R extends UnknownRecord> = {
	pushId: string
	status: PushOpStatus.Unsent | PushOpStatus.Sent
	changes: Changes<R>
	downstreamPushes: Array<{ clientId: string; pushId: string }>
}

type ClockSnapshot = {
	id: string
	epoch: number
}

type RecordAtom<R extends UnknownRecord> = Atom<{ state: R; lastUpdatedAt: number }>

type ApplyStack<R extends UnknownRecord> = {
	changes: Changes<R>
	source: ChangeSource
	below: ApplyStack<R> | null
}

/**
 * A serialized snapshot of the record store's values.
 *
 * @public
 */
export type SyncStoreSnapshot<R extends UnknownRecord> = {
	synced: {
		upstreamClock: number
		records: Record<string, { state: R; lastUpdatedAt: number }>
		tombstones: Record<string, number>
	}
	pending?: Changes<R>
	clock: ClockSnapshot
}

/** @internal */
export type StoreRecord<S extends SyncStore<any>> = S extends SyncStore<infer R> ? R : never

export enum DownstreamSessionState {
	AWAITING_CONNECT_MESSAGE = 'awaiting-connect-message',
	AWAITING_REMOVAL = 'awaiting-removal',
	CONNECTED = 'connected',
}

export const SESSION_START_WAIT_TIME = 10000
export const SESSION_REMOVAL_WAIT_TIME = 10000
export const SESSION_IDLE_TIMEOUT = 20000

export type DownstreamSession<R extends UnknownRecord> =
	| {
			state: DownstreamSessionState.AWAITING_CONNECT_MESSAGE
			sessionKey: string
			presenceId: string
			socket: GoingDownstreamSocket<R>
			sessionStartTime: number
	  }
	| {
			state: DownstreamSessionState.AWAITING_REMOVAL
			sessionKey: string
			presenceId: string
			socket: GoingDownstreamSocket<R>
			cancellationTime: number
	  }
	| {
			state: DownstreamSessionState.CONNECTED
			sessionKey: string
			presenceId: string
			socket: GoingDownstreamSocket<R>
			serializedSchema: SerializedSchema
			lastInteractionTime: number
	  }

/**
 * A store of records.
 *
 * @public
 */
export class SyncStore<R extends UnknownRecord = UnknownRecord, P extends object = object> {
	readonly scopedTypes: {
		document: ReadonlySet<string>
		session: ReadonlySet<string>
		presence: ReadonlySet<string>
	}
	constructor(
		private readonly schema: StoreSchema<R>,
		private readonly upstream: GoingUpstreamSocket<R> | undefined,
		snapshot: SyncStoreSnapshot<R>
	) {
		if (snapshot) {
			// TODO: migrations
			this.prevSyncClock = snapshot.clock
		}

		this.scopedTypes = {
			document: new Set(
				objectMapValues(this.schema.types)
					.filter((t) => t.scope === 'document')
					.map((t) => t.typeName)
			),
			session: new Set(
				objectMapValues(this.schema.types)
					.filter((t) => t.scope === 'session')
					.map((t) => t.typeName)
			),
			presence: new Set(
				objectMapValues(this.schema.types)
					.filter((t) => t.scope === 'presence')
					.map((t) => t.typeName)
			),
		}
	}

	private readonly prevSyncClock: ClockSnapshot | undefined

	private readonly synced = {
		upstreamClock: atom('store.synced.clock', 0),
		records: atom('store.synced.records', {} as Record<string, RecordAtom<R>>),
		tombstones: atom('synced.tombstones', {} as Record<string, number>), // todo: this should be a cheap sorted map
		clock: atom('store.clock', 0),
		clockId: nanoid(),
	}
	private readonly pending = {
		records: atom('store.pending.records', {} as Record<string, Atom<R>>),
		tombstones: atom('store.pending.tombstones', {} as Record<string, true>), // todo: this should be a cheap sorted map
		pushes: atom('store.pending.pushes', [] as PushOp<R>[]),
	}
	private readonly upstreamPresences = atom('store.upstreamPresences', {} as Record<string, P>)
	private readonly downstreamPresences = atom('store.downstreamPresences', {} as Record<string, P>)
	private readonly downstreamClients = [] as number[]

	private readonly incomingPatchBuffer = atom(
		'store.incomingPatchBuffer',
		[] as GoingDownstreamPatchMessage<R>[]
	)

	private readonly outgoingPatchBuffer = atom<{
		changes: Changes<R>
		satisfiedPushes: { [clientId: string]: string[] }
	}>('store.outgoingPatchBuffer', { changes: {}, satisfiedPushes: {} })

	get(key: IdOf<R>): R | undefined {
		if (!this.upstream) {
			return this.synced.records.value[key]?.value.state
		}
		const pendingRecord = this.pending.records.value[key]?.value
		if (pendingRecord) return pendingRecord
		const hasPendingDeletion = !!this.pending.tombstones.value[key]
		if (hasPendingDeletion) return undefined

		return this.synced.records.value[key]?.value.state
	}

	private setSynced(record: R, nextClock: number) {
		const id = record.id
		const existingAtom = this.synced.records.value[id]
		if (existingAtom) {
			existingAtom.set({ state: record, lastUpdatedAt: nextClock })
		} else {
			const newAtom = atom('synced.records.' + id, { state: record, lastUpdatedAt: nextClock })
			this.synced.records.set({ ...this.synced.records.value, [id]: newAtom })
			if (this.synced.tombstones.value[id]) {
				this.synced.tombstones.update(({ [id]: _, ...tombstones }) => tombstones)
			}
		}
		if (this.downstreamClients.length) {
			const prevRecord = existingAtom?.value.state as R | undefined
			this.outgoingPatchBuffer.update((prev) => {
				return {
					changes: addSetChange(prev.changes, prevRecord, record),
					satisfiedPushes: prev.satisfiedPushes,
				}
			})
		}
	}

	private addPushOp(
		cb: (changes: Changes<R>) => Changes<R>,
		downstreamPushes: { clientId: string; pushId: string }[]
	) {
		this.pending.pushes.update((prev) => {
			const prevOp = prev[prev.length - 1]
			const ops = prev.slice(0)
			if (prevOp?.status === PushOpStatus.Unsent) {
				ops[ops.length - 1] = {
					pushId: prevOp.pushId,
					changes: cb(prevOp.changes),
					status: PushOpStatus.Unsent,
					downstreamPushes: [...prevOp.downstreamPushes, ...downstreamPushes],
				}
			} else {
				ops.push({
					pushId: nanoid(),
					changes: cb({}),
					status: PushOpStatus.Unsent,
					downstreamPushes,
				})
			}

			return ops
		})

		this.schedulePush()
	}

	private setPending(record: R, push: boolean) {
		const id = record.id
		const existingAtom = this.pending.records.value[id]
		const prevState = existingAtom?.value as R | undefined
		if (existingAtom) {
			existingAtom.set(record)
		} else {
			const newAtom = atom('pending.records.' + id, record)
			this.pending.records.set({ ...this.pending.records.value, [id]: newAtom })
			if (this.pending.tombstones.value[id]) {
				this.pending.tombstones.update(({ [id]: _, ...tombstones }) => tombstones)
			}
		}
		if (!push) return

		this.addPushOp((changes) => addSetChange(changes, prevState, record), [])
	}

	set(record: R): void {
		transact(() => {
			if (!this.upstream || this.scopedTypes.session.has(record.typeName)) {
				const nextClock = this.synced.clock.value + 1
				this.synced.clock.set(nextClock)
				this.setSynced(record, nextClock)
				return
			}

			this.setPending(record, true)
		})
	}

	schedulePush() {
		// do the thing
	}

	private deleteSynced(id: string, nextClock: number) {
		const existingAtom = this.synced.records.value[id]
		if (!existingAtom) return

		this.synced.records.update(({ [id]: _, ...records }) => records)
		this.synced.tombstones.set({ ...this.synced.tombstones.value, [id]: nextClock })

		if (this.downstreamClients.length) {
			const prevRecord = existingAtom.value.state
			this.outgoingPatchBuffer.update((prev) => {
				return {
					changes: addDeleteChange(prev.changes, prevRecord),
					satisfiedPushes: prev.satisfiedPushes,
				}
			})
		}
	}

	private deletePending(id: string, push: boolean) {
		const pendingRecordAtom = this.pending.records.value[id]
		const syncedRecordAtom = this.synced.records.value[id]
		// check whether there is anything to delete
		if (!pendingRecordAtom && !syncedRecordAtom) return

		const record = pendingRecordAtom?.value || syncedRecordAtom?.value.state

		if (pendingRecordAtom) {
			// remove the pending atom
			this.pending.records.update(({ [id]: _, ...recordAtoms }) => recordAtoms)
		}
		if (syncedRecordAtom) {
			// add a pending tombstone if there is a synced atom so we know it has been deleted
			this.pending.tombstones.set({ ...this.pending.tombstones.value, [id]: true })
		}

		if (!push) return

		this.addPushOp((changes) => addDeleteChange(changes, record), [])
	}

	delete(id: IdOf<R>): void {
		const typeName = id.slice(0, id.indexOf(':'))
		transact(() => {
			if (!this.upstream || this.scopedTypes.session.has(typeName)) {
				const nextClock = this.synced.clock.value + 1
				this.synced.clock.set(nextClock)
				this.deleteSynced(id, nextClock)
				return
			}

			this.deletePending(id, true)
		})
	}

	getSnapshot(): SyncStoreSnapshot<R> {
		return {
			synced: {
				upstreamClock: this.synced.upstreamClock.value,
				records: Object.fromEntries(
					Object.entries(this.synced.records.value).map(([key, atom]) => [key, atom.value])
				),
				tombstones: this.synced.tombstones.value,
			},
			pending: this.upstream
				? this.pending.pushes.value.reduce(
						(changes, op) => mergeChanges(changes, op.changes, true),
						{}
				  )
				: undefined,
			clock: {
				id: this.synced.clockId,
				epoch: this.synced.clock.value,
			},
		}
	}

	scheduleRebase() {
		// do the thing
	}

	// private applyPatch(diff: NetworkDiff<R>) {
	// 	const changes: Changes<R> = {}
	// 	for (const [id, op] of Object.entries(diff)) {
	// 		const existingRecord = this.synced.records.value[id]?.value.state as R | undefined
	// 		switch (op[0]) {
	// 			case RecordOpType.Set: {
	// 				changes[id] = existingRecord
	// 					? [ChangeOpType.Update, existingRecord, op[1]]
	// 					: [ChangeOpType.Create, op[1]]
	// 				break
	// 			}
	// 			case RecordOpType.Patch: {
	// 				const existing = this.synced.records.value[id]?.value.state
	// 				if (!existing) throw new Error(`Cannot patch non-existent record ${id}`)
	// 				changes[id] = [ChangeOpType.Update, existing, applyObjectDiff(existing, op[1])]
	// 				break
	// 			}
	// 			case RecordOpType.Delete: {
	// 				if (!existingRecord) throw new Error(`Cannot delete non-existent record ${id}`)
	// 				changes[id] = [ChangeOpType.Delete, existingRecord]
	// 				break
	// 			}
	// 			default:
	// 				exhaustiveSwitchError(op)
	// 		}
	// 	}
	// 	this.applyChanges(changes, 'remote')
	// }

	private syncUpstreamPatch(diff: NetworkDiff<R>) {
		transact(() => {
			const nextClock = this.synced.clock.value + 1
			this.synced.clock.set(nextClock)

			for (const [id, op] of Object.entries(diff)) {
				const existingRecord = this.synced.records.value[id]?.value.state as R | undefined
				switch (op[0]) {
					case RecordOpType.Set: {
						this.setSynced(op[1], nextClock)
						break
					}
					case RecordOpType.Patch: {
						if (!existingRecord) throw new Error(`Cannot patch non-existent record ${id}`)
						this.setSynced(applyObjectDiff(existingRecord, op[1]), nextClock)
						break
					}
					case RecordOpType.Delete: {
						if (!existingRecord) throw new Error(`Cannot delete non-existent record ${id}`)
						this.deleteSynced(id, nextClock)
						break
					}
					default:
						exhaustiveSwitchError(op)
				}
			}
		})
	}

	applyStack = null as null | ApplyStack<R>

	private consumePendingOp(id: string) {
		let stack = this.applyStack
		while (stack) {
			const op = stack.changes[id]
			if (op) {
				delete stack.changes[id]
				return this.applyOp(op)
			}
			stack = stack.below
		}
		return null
	}

	private applyOp(op: ChangeOp<R>) {
		switch (op.op) {
			case ChangeOpType.Set:
				this.set(op.record)
				break
			case ChangeOpType.Delete:
				this.delete(op.record.id)
				break
			default:
				exhaustiveSwitchError(op)
		}
	}

	private applyChanges(changes: Changes<R>, source: ChangeSource) {
		try {
			this.applyStack = { changes, source, below: this.applyStack }
			const changedIds = Object.keys(changes)
			transact(() => {
				for (const id of changedIds) {
					this.consumePendingOp(id)
				}
			})
		} finally {
			this.applyStack = this.applyStack?.below ?? null
		}
	}

	private reapplyPendingChanges(changes: Changes<R>) {
		for (const change of Object.values(changes)) {
			switch (change.op) {
				case ChangeOpType.Set: {
					let record = change.record
					if (change.prev) {
						const diff = diffRecord(change.prev, change.record)
						if (diff) {
							record = applyObjectDiff(this.get(record.id) ?? change.prev, diff)
						}
					}
					this.setPending(record, false)
					break
				}
				case ChangeOpType.Delete:
					this.deletePending(change.record.id, false)
					break
				default:
					exhaustiveSwitchError(change)
			}
		}
	}

	private rebase() {
		const incomingPatches = this.incomingPatchBuffer.value
		if (incomingPatches.length === 0) return

		transact(() => {
			let lastServerClock = this.synced.upstreamClock.value
			this.incomingPatchBuffer.set([])

			let pendingPushOps = null as null | PushOp<R>[]

			for (const msg of incomingPatches) {
				this.syncUpstreamPatch(msg.diff)
				if (!msg.satisfiedPushIds) continue

				if (!pendingPushOps) {
					pendingPushOps = [...this.pending.pushes.value]
				}
				for (const pushId of msg.satisfiedPushIds) {
					const nextOp = pendingPushOps.shift()
					if (!nextOp) {
						throw new Error('Unexpected push result.')
					}
					if (pushId !== nextOp.pushId) {
						throw new Error('pushId mismatch while rebasing.')
					}
					if (nextOp.status === PushOpStatus.Unsent) {
						throw new Error('Unexpected upstream push result while rebasing.')
					}
					// all good
				}

				lastServerClock = msg.serverClock
			}

			this.synced.upstreamClock.set(lastServerClock)

			// if pending push ops didn't change we don't need to update the pending doc state
			if (!pendingPushOps) return

			this.pending.pushes.set(pendingPushOps)
			this.pending.records.set({})
			this.pending.tombstones.set({})

			for (const pushOp of pendingPushOps) {
				this.reapplyPendingChanges(pushOp.changes)
			}
		})
	}
}
