import { Signal, computed, react, transact } from '@tldraw/state'
import { ClientWebSocketAdapter, TLSyncErrorCloseEventReason } from '@tldraw/sync-core'
import { assert, uniqueId } from '@tldraw/utils'
import { OptimisticAppStore } from './OptimisticAppStore'
import {
	TlaFile,
	TlaFilePartial,
	TlaFileState,
	TlaFileStatePartial,
	TlaUser,
	TlaUserPartial,
} from './tlaSchema'
import { ZClientSentMessage, ZErrorCode, ZRowUpdate, ZServerSentMessage } from './types'

export class Zero {
	private socket: ClientWebSocketAdapter
	store = new OptimisticAppStore()
	private pendingUpdates: ZRowUpdate[] = []
	private timeout: NodeJS.Timeout | undefined = undefined
	private currentMutationId = uniqueId()
	private clientTooOld = false

	userId?: string

	constructor(
		private opts: {
			getUri(): Promise<string>
			onMutationRejected(errorCode: ZErrorCode): void
			onClientTooOld(): void
		}
	) {
		this.socket = new ClientWebSocketAdapter(opts.getUri)
		this.socket.onStatusChange((e) => {
			if (e.status === 'error') {
				if (e.reason === TLSyncErrorCloseEventReason.CLIENT_TOO_OLD) {
					this.clientTooOld = true
					this.opts.onClientTooOld()
					this.socket.close()
				}
				// todo: handle other well known errors if we add any
			}
		})
		this.socket.onReceiveMessage((_msg) => {
			if (this.clientTooOld) {
				// ignore incoming messages if the client is not supported
				return
			}
			// console.log('got msg', this.userId, _msg)
			const msg = _msg as any as ZServerSentMessage
			switch (msg.type) {
				case 'initial_data':
					this.store.initialize(msg.initialData)
					break
				case 'update':
					this.store.updateCommittedData(msg.update)
					break
				case 'commit':
					{
						const mutationIds = msg.mutationIds
						this.store.commitMutations(mutationIds)
					}
					break
				case 'reject': {
					const mutationId = msg.mutationId
					this.store.rejectMutation(mutationId)
					this.opts.onMutationRejected(msg.errorCode)
					break
				}
			}
		})
	}

	dispose() {
		clearTimeout(this.timeout)
		if (this.pendingUpdates.length) {
			this.sendPendingUpdates()
		}
		this.socket.close()
	}

	async sneakyTransaction(fn: () => Promise<void>): Promise<void> {
		await fn()
		assert(this.pendingUpdates.length > 0, 'no updates to send')
		if (this.pendingUpdates.length === 0) {
			return
		}
		const mutationId = this.currentMutationId

		return new Promise((resolve, reject) => {
			const unsubCommit = this.store.events.on('commit', (ids: string[]) => {
				if (ids.includes(mutationId)) {
					resolve()
					unsubCommit()
					unsubReject()
				}
			})

			const unsubReject = this.store.events.on('reject', (id: string) => {
				if (id === mutationId) {
					reject()
					unsubCommit()
					unsubReject()
				}
			})
		})
	}

	// eslint-disable-next-line local/prefer-class-methods
	private preload = () => {
		if (this.store.getFullData()) {
			return { complete: Promise.resolve(null) }
		}
		return {
			complete: new Promise((resolve) => {
				const unsub = react('wait for initial data', () => {
					const store = this.store.getFullData()
					if (store) {
						unsub()
						return resolve(null)
					}
					// TODO: handle error
				})
			}),
		}
	}

	private makeQuery<T>(table: string, data$: Signal<T>) {
		return {
			where: (column: string, _ownerId: string) => {
				return {
					one() {
						return this
					},
					preload: this.preload,
					related(_x: any, _y: any) {
						return this
					},
					materialize: () => {
						let _data = data$.get() as any
						let unsub = () => {}
						return {
							get data() {
								return _data
							},
							addListener: (listener: (data: T) => void) => {
								unsub = react('file listener', () => {
									_data = data$.get()
									if (!_data) return
									if (table === 'file_state') {
										const files = this.store.getFullData()?.files
										if (!files) return
										_data = (_data as TlaFileState[]).map((d) => ({
											...d,
											file: files.find((f) => f.id === d.fileId),
										}))
									}
									return listener(_data)
								})
							},
							destroy() {
								unsub()
								unsub = () => {}
							},
						}
					},
					toString() {
						return column
					},
				}
			},
		}
	}

	query = {
		file: this.makeQuery(
			'file',
			computed('files', () => this.store.getFullData()?.files.filter((f) => !f.isDeleted))
		),
		file_state: this.makeQuery(
			'file_state',
			computed('fileStates', () => this.store.getFullData()?.fileStates)
		),
		user: {
			...this.makeQuery(
				'user',
				computed('user', () => this.store.getFullData()?.user)
			),
		},
	}
	readonly ____mutators = {
		file: {
			create: (data: TlaFile) => {
				const store = this.store.getFullData()
				if (!store) throw new Error('store not initialized')
				if (store?.files.find((f) => f.id === data.id)) {
					throw new Error('file already exists')
				}
				assert(store.user !== null, 'user not initialized')
				this.makeOptimistic([
					{ table: 'file', event: 'insert', row: data },
					{
						table: 'file_state',
						event: 'insert',
						row: { fileId: data.id, userId: data.ownerId, firstVisitAt: Date.now() } as any,
					},
				])
			},
			update: (data: TlaFilePartial) => {
				const existing = this.store.getFullData()?.files.find((f) => f.id === data.id)
				if (!existing) throw new Error('file not found')
				this.makeOptimistic([{ table: 'file', event: 'update', row: data }])
			},
			delete: (data: { id: TlaFile['id'] }) => {
				this.makeOptimistic([{ table: 'file', event: 'delete', row: data }])
			},
		},
		file_state: {
			create: (data: TlaFileState) => {
				const store = this.store.getFullData()
				if (!store) throw new Error('store not initialized')
				this.makeOptimistic([{ table: 'file_state', event: 'insert', row: data }])
			},
			update: (data: TlaFileStatePartial) => {
				const existing = this.store
					.getFullData()
					?.fileStates.find((f) => f.fileId === data.fileId && f.userId === data.userId)
				if (!existing) throw new Error('file state not found')
				this.makeOptimistic([{ table: 'file_state', event: 'update', row: data }])
			},
			delete: (data: { fileId: TlaFileState['fileId']; userId: TlaFileState['userId'] }) => {
				this.makeOptimistic([{ table: 'file_state', event: 'delete', row: data as any }])
			},
		},
		user: {
			create: (data: TlaUser) => {
				this.makeOptimistic([{ table: 'user', event: 'insert', row: data as any }])
			},
			update: (data: TlaUserPartial) => {
				this.makeOptimistic([{ table: 'user', event: 'update', row: data as any }])
			},
			delete: () => {
				throw new Error('no')
			},
		},
	}
	mutate = Object.assign((fn: (txn: Zero['____mutators']) => void) => {
		transact(() => {
			fn(this.____mutators)
		})
	}, this.____mutators)

	private sendPendingUpdates() {
		if (this.socket.isDisposed) return

		this.socket.sendMessage({
			type: 'mutate',
			mutationId: this.currentMutationId,
			updates: this.pendingUpdates,
		} satisfies ZClientSentMessage as any)

		this.pendingUpdates = []
		this.currentMutationId = uniqueId()
		this.timeout = undefined
	}

	makeOptimistic(updates: ZRowUpdate[]) {
		if (this.clientTooOld) {
			console.log('client too old')
			// ignore incoming messages if the client is not supported
			this.opts.onMutationRejected('client_too_old')
			return
		}
		this.store.updateOptimisticData(updates, this.currentMutationId)

		this.pendingUpdates.push(...updates)
		clearTimeout(this.timeout)
		this.timeout = setTimeout(() => {
			this.sendPendingUpdates()
		}, 50)
	}
}
