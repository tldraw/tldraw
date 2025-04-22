import { MakeCustomMutatorInterfaces } from '@rocicorp/zero/out/zero-client/src/client/custom'
import {
	createMutators,
	OptimisticAppStore,
	TlaFile,
	TlaFilePartial,
	TlaFileState,
	TlaFileStatePartial,
	TlaMutators,
	TlaSchema,
	TlaUser,
	TlaUserPartial,
	ZClientSentMessage,
	ZErrorCode,
	ZRowUpdate,
	ZServerSentMessage,
} from '@tldraw/dotcom-shared'
import { ClientWebSocketAdapter, TLSyncErrorCloseEventReason } from '@tldraw/sync-core'
import { assert, computed, objectMapKeys, react, Signal, sleep, transact, uniqueId } from 'tldraw'
import { TLAppUiContextType } from '../utils/app-ui-events'

export class Zero {
	private socket: ClientWebSocketAdapter
	private store = new OptimisticAppStore()
	private pendingUpdates: ZRowUpdate[] = []
	private timeout: NodeJS.Timeout | undefined = undefined
	private currentMutationId = uniqueId()
	private clientTooOld = false
	private didReceiveFirstMessage = false

	constructor(
		private opts: {
			userId: string
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
		const mutatorWrapper = (mutatorFn: any) => {
			return (params: any) => {
				transact(() =>
					mutatorFn({ mutate: this.____mutators, query: this.query, location: 'client' }, params)
				)
			}
		}
		const mutators = createMutators(opts.userId) as any
		const tempMutate = (this.mutate = {} as any)
		for (const m of objectMapKeys(mutators)) {
			if (typeof mutators[m] === 'function') {
				tempMutate[m] = mutatorWrapper(mutators[m])
			} else if (typeof mutators[m] === 'object') {
				for (const k of objectMapKeys(mutators[m])) {
					if (!tempMutate[m]) {
						tempMutate[m] = {}
					}
					tempMutate[m][k] = mutatorWrapper(mutators[m][k])
				}
			}
		}
	}

	mutate: MakeCustomMutatorInterfaces<TlaSchema, TlaMutators>

	async __e2e__waitForMutationResolution() {
		let safety = 0
		while (this.store.getOptimisticUpdates().length && safety++ < 100) {
			await sleep(50)
		}
	}

	close() {
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
		const stuff = {
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
		}
		return {
			...stuff,
			where: (column: string, op: string, value: any) => {
				assert(op === '=', 'Only = operator is supported')
				return {
					...stuff,
					one() {
						return {
							...this,
							run: () => {
								return (data$.get() as any[]).find((d) => d[column] === value)
							},
						}
					},
					run: () => {
						return (data$.get() as any[]).filter((d) => d[column] === value)
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
			insert: (data: TlaFile) => {
				const store = this.store.getFullData()
				if (!store) throw new Error('store not initialized')
				if (store?.files.find((f) => f.id === data.id)) {
					throw new Error('file already exists')
				}
				this.makeOptimistic([{ table: 'file', event: 'insert', row: data }])
			},
			upsert: (data: TlaFile) => {
				const store = this.store.getFullData()
				if (!store) throw new Error('store not initialized')
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
			insert: (data: TlaFileState) => {
				const store = this.store.getFullData()
				if (!store) throw new Error('store not initialized')
				if (store?.fileStates.find((f) => f.fileId === data.fileId && f.userId === data.userId)) {
					throw new Error('file state already exists')
				}
				this.makeOptimistic([{ table: 'file_state', event: 'insert', row: data }])
			},
			upsert: (data: TlaFileState) => {
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
			insert: (data: TlaUser) => {
				if (this.store.getFullData()?.user) {
					throw new Error('user already exists')
				}
				this.makeOptimistic([{ table: 'user', event: 'insert', row: data as any }])
			},
			upsert: (data: TlaUser) => {
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
