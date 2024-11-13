import {
	OptimisticAppStore,
	TlaFile,
	TlaFileState,
	TlaUser,
	ZClientSentMessage,
	ZErrorCode,
	ZRowUpdate,
	ZServerSentMessage,
} from '@tldraw/dotcom-shared'
import { ClientWebSocketAdapter, TLPersistentClientSocketStatus } from '@tldraw/sync-core'
import { Signal, atom, computed, react, transact, uniqueId } from 'tldraw'

export class Zero {
	socket: ClientWebSocketAdapter
	store = new OptimisticAppStore()
	pendingUpdates: ZRowUpdate[] = []
	timeout: NodeJS.Timeout | undefined = undefined
	currentMutationId = uniqueId()

	private networkStatus = atom<TLPersistentClientSocketStatus>('newtwork status', 'offline')

	constructor(
		private opts: { getUri(): Promise<string>; onMutationRejected(errorCode: ZErrorCode): void }
	) {
		this.socket = new ClientWebSocketAdapter(opts.getUri)
		this.socket.onReceiveMessage((_msg) => {
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
		this.socket.onStatusChange((params) => {
			this.networkStatus.set(params.status)
			if (params.status === 'online') {
				this.sendPendingUpdates()
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

	getIsOffline() {
		return this.networkStatus.get() === 'offline'
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
			computed('files', () => this.store.getFullData()?.files)
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
				this.makeOptimistic([
					{ table: 'file', event: 'insert', row: data },
					{
						table: 'file_state',
						event: 'insert',
						row: { fileId: data.id, userId: store.user.id },
					},
				])
			},
			update: (data: Partial<TlaFile> & { id: TlaFile['id'] }) => {
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
			update: (
				data: Partial<TlaFileState> & {
					fileId: TlaFileState['fileId']
					userId: TlaFileState['userId']
				}
			) => {
				const existing = this.store
					.getFullData()
					?.fileStates.find((f) => f.fileId === data.fileId && f.userId === data.userId)
				if (!existing) throw new Error('file state not found')
				this.makeOptimistic([{ table: 'file_state', event: 'update', row: data }])
			},
			delete: (data: { fileId: TlaFileState['fileId']; userId: TlaFileState['userId'] }) => {
				this.makeOptimistic([{ table: 'file_state', event: 'delete', row: data }])
			},
		},
		user: {
			create: (data: TlaUser) => {
				this.makeOptimistic([{ table: 'user', event: 'insert', row: data }])
			},
			update: (data: Partial<TlaUser>) => {
				this.makeOptimistic([{ table: 'user', event: 'update', row: data }])
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
		if (
			this.socket.isDisposed ||
			this.socket.connectionStatus === 'offline' ||
			this.pendingUpdates.length === 0
		)
			return

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
		this.store.updateOptimisticData(updates, this.currentMutationId)

		this.pendingUpdates.push(...updates)
		if (!this.timeout) {
			this.timeout = setTimeout(() => {
				this.sendPendingUpdates()
			}, 50)
		}
	}
}
