import {
	ASClientMessage,
	ASLoadServerMessage,
	ASServerMessage,
	ASUpdateServerMessage,
} from '@tldraw/dotcom-shared'
import isDeepEqual from 'fast-deep-equal/es6'
import { nanoid } from 'nanoid'
import { WebSocket } from 'partysocket'
import { useEffect, useState } from 'react'
import {
	RecordsDiff,
	TLRecord,
	TLStore,
	assert,
	exhaustiveSwitchError,
	filterEntries,
	isRecordsDiffEmpty,
	reverseRecordsDiff,
	squashRecordDiffs,
	useTLStore,
} from 'tldraw'
import { RemoteTLStoreWithStatus } from './hooks/useRemoteSyncClient'

export function useAlexSyncClient({ uri }: { uri: string }): RemoteTLStoreWithStatus {
	const [state, setState] = useState<RemoteTLStoreWithStatus>({ status: 'loading' })

	const store = useTLStore({})

	const error: NonNullable<typeof state>['error'] = state?.error ?? undefined
	if (error) throw error

	useEffect(() => {
		let isDisposed = false
		const client = new AlexSyncClient(store, uri, (update) => {
			if (isDisposed) return
			setState(update)
		})
		return () => {
			isDisposed = true
			client.close()
		}
	}, [store, uri])

	return state
}

class AlexSyncClient {
	private readonly clientId = nanoid()
	private clientVersion = 0
	private readonly socket: WebSocket
	private readonly disposes: (() => void)[] = []
	private isSynced = false
	constructor(
		private readonly store: TLStore,
		private readonly uri: string,
		private readonly onStatusChange: (update: RemoteTLStoreWithStatus) => void
	) {
		this.socket = new WebSocket(uri)
		this.disposes.push(() => this.socket.close())
		this.socket.addEventListener('open', () => {
			this.send({ type: 'load' })
			this.isSynced = false
		})
		this.socket.addEventListener('close', () => {
			this.onStatusChange({ status: 'loading' })
			this.isSynced = false
		})
		this.socket.addEventListener('error', (event) => {
			this.onStatusChange({
				status: 'error',
				error: event.error,
			})
			this.isSynced = false
		})
		this.socket.addEventListener('message', (event) => {
			const data: ASServerMessage = JSON.parse(event.data)
			this.handleMessage(data)
		})

		this.disposes.push(
			store.listen(
				(changes) => {
					if (changes.source === 'remote') return
					this.handleUpdateFromClient(changes.changes)
				},
				{ scope: 'document' }
			)
		)
	}

	close() {
		for (const dispose of this.disposes) {
			dispose()
		}
	}

	private send(message: ASClientMessage) {
		this.socket.send(JSON.stringify(message))
	}

	private handleMessage(data: ASServerMessage) {
		switch (data.type) {
			case 'load': {
				this.handleLoadFromServer(data)
				break
			}
			case 'update': {
				this.handleUpdateFromServer(data)
				break
			}
			default:
				exhaustiveSwitchError(data, 'type')
		}
	}

	private pendingUpdateQueue: {
		version: number
		changes: RecordsDiff<TLRecord>
	}[] = []

	private handleLoadFromServer({ snapshot }: ASLoadServerMessage) {
		this.store.mergeRemoteChanges(() => {
			this.store.loadStoreSnapshot({ schema: this.store.schema.serialize(), store: snapshot })
		})
		this.onStatusChange({ status: 'synced-remote', store: this.store, connectionStatus: 'online' })
		this.pendingUpdateQueue = []
		this.isSynced = true
	}

	private handleUpdateFromClient(changes: RecordsDiff<TLRecord>) {
		if (!this.isSynced) return
		const version = this.clientVersion++
		this.pendingUpdateQueue.push({ version, changes })
		this.send({
			type: 'update',
			clientId: this.clientId,
			clientVersion: version,
			changes,
		})
	}
	private handleUpdateFromServer({ clientId, clientVersion, changes }: ASUpdateServerMessage) {
		try {
			if (!this.isSynced) return

			this.store._flushHistory()

			let appliedUpdate = null

			if (clientId === this.clientId) {
				assert(this.pendingUpdateQueue.length > 0, 'update from server with no pending updates')
				assert(
					this.pendingUpdateQueue[0].version === clientVersion,
					'update from server with wrong version'
				)
				appliedUpdate = this.pendingUpdateQueue.shift()!
			}

			const toRollForward = squashRecordDiffs(this.pendingUpdateQueue.map((u) => u.changes))
			const toRollBack = reverseRecordsDiff(
				appliedUpdate ? squashRecordDiffs([appliedUpdate.changes, toRollForward]) : toRollForward
			)

			const totalDiff = mergeNoOpUpdates(
				squashRecordDiffs([
					// roll back...
					toRollBack,
					// ...then apply the server update...
					changes,
					// ...then apply our outstanding optimistic updates
					toRollForward,
				])
			)

			if (totalDiff) {
				this.store.mergeRemoteChanges(() => {
					this.store.applyDiff(totalDiff, { runCallbacks: false })
				})
			}
		} catch (e: any) {
			// eslint-disable-next-line no-console
			console.log(e)
			this.onStatusChange({
				status: 'error',
				error: e,
			})
		}
	}
}

function mergeNoOpUpdates(diff: RecordsDiff<TLRecord>) {
	const merged = {
		added: diff.added,
		removed: diff.removed,
		updated: filterEntries(diff.updated, (_, [from, to]) => {
			return !isDeepEqual(from, to)
		}),
	}

	if (isRecordsDiffEmpty(merged)) return null

	return merged
}
