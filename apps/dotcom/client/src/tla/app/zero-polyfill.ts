import {
	OptimisticAppStore,
	TlaFile,
	TlaFilePartial,
	TlaFileState,
	TlaFileStatePartial,
	TlaUser,
	TlaUserPartial,
	ZClientSentMessage,
	ZErrorCode,
	ZRowUpdate,
	ZServerSentMessage,
} from '@tldraw/dotcom-shared'
import { ClientWebSocketAdapter, TLSyncErrorCloseEventReason } from '@tldraw/sync-core'
import { Signal, computed, react, sleep, transact, uniqueId } from 'tldraw'
import { TLAppUiContextType } from '../utils/app-ui-events'

export class Zero {
	private socket: ClientWebSocketAdapter
	private store = new OptimisticAppStore()
	private pendingUpdates: ZRowUpdate[] = []
	private timeout: NodeJS.Timeout | undefined = undefined
	private currentMutationId = uniqueId()
	private clientTooOld = false
	private instantiationTime = Date.now()
	private didReceiveFirstMessage = false

	constructor(
		private opts: {
			getUri(): Promise<string>
			onMutationRejected(errorCode: ZErrorCode): void
			onClientTooOld(): void
			trackEvent: TLAppUiContextType
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
			if (!this.didReceiveFirstMessage) {
				this.didReceiveFirstMessage = true
				const timeSinceInstantiation = Date.now() - this.instantiationTime
				this.opts.trackEvent('first-connect-duration', {
					duration: timeSinceInstantiation,
					source: 'app',
				})
			}
			if (this.clientTooOld) {
				// ignore incoming messages if the client is not supported
				return
			}
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

	async __e2e__waitForMutationResolution() {
		let safety = 0
		while (this.store.getOptimisticUpdates().length && safety++ < 100) {
			await sleep(50)
		}
		// console.log('Mutation resolved', JSON.stringify(this.store.getOptimisticUpdates()))
	}

	dispose() {
		clearTimeout(this.timeout)
		if (this.pendingUpdates.length) {
			this.sendPendingUpdates()
		}
		this.socket.close()
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
				this.makeOptimistic([{ table: 'file', event: 'insert', row: data }])
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
			// ignore incoming messages if the client is not supported
			this.opts.onMutationRejected('client_too_old')
			return
		}
		this.store.updateOptimisticData(updates, this.currentMutationId)

		this.pendingUpdates.push(...updates)
		if (!this.timeout) {
			this.timeout = setTimeout(() => {
				this.sendPendingUpdates()
			}, 50)
		}
	}
}
