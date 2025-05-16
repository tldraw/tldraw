import type { MakeCustomMutatorInterfaces } from '@rocicorp/zero/out/zero-client/src/client/custom'
import type { SchemaCRUD, TableCRUD } from '@rocicorp/zero/out/zql/src/mutate/custom'
import {
	OptimisticAppStore,
	TlaFileState,
	TlaMutators,
	TlaSchema,
	ZClientSentMessage,
	ZErrorCode,
	ZRowUpdate,
	ZServerSentMessage,
	createMutators,
	schema,
} from '@tldraw/dotcom-shared'
import { ClientWebSocketAdapter, TLSyncErrorCloseEventReason } from '@tldraw/sync-core'
import {
	Signal,
	assert,
	assertExists,
	computed,
	mapObjectMapValues,
	objectMapKeys,
	react,
	sleep,
	transact,
	uniqueId,
} from 'tldraw'
import { TLAppUiContextType } from '../utils/app-ui-events'

export class Zero {
	private socket: ClientWebSocketAdapter
	private store = new OptimisticAppStore()
	private pendingUpdates: ZClientSentMessage[] = []
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
		this.socket.onReceiveMessage((_msgs) => {
			if (!this.didReceiveFirstMessage) {
				this.didReceiveFirstMessage = true
			}
			if (this.clientTooOld) {
				// ignore incoming messages if the client is not supported
				return
			}
			transact(() => {
				for (const msg of _msgs as any as ZServerSentMessage) {
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
				}
			})
		})
		const mutatorWrapper = (key: string, mutatorFn: any) => {
			return async (params: any) => {
				if (this.clientTooOld) {
					this.opts.onMutationRejected('client_too_old')
					return
				}
				const signal = new AbortController().signal
				const mutate = this.makeCrud(signal)
				await mutatorFn({ mutate, query: this.query, location: 'client' }, params)
				this.pendingUpdates.push({
					type: 'mutator',
					mutationId: this.currentMutationId,
					mutation: [key as any, params],
				})
				this.currentMutationId = uniqueId()
				if (!this.timeout) {
					this.timeout = setTimeout(() => {
						this.sendPendingUpdates()
					}, 50)
				}
			}
		}
		const mutators = createMutators(opts.userId) as any
		const tempMutate = (this.mutate = {} as any)
		for (const m of objectMapKeys(mutators)) {
			if (typeof mutators[m] === 'function') {
				tempMutate[m] = mutatorWrapper(m, mutators[m])
			} else if (typeof mutators[m] === 'object') {
				for (const k of objectMapKeys(mutators[m])) {
					if (!tempMutate[m]) {
						tempMutate[m] = {}
					}
					tempMutate[m][k] = mutatorWrapper(`${m}.${k}`, mutators[m][k])
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
								const files = this.store.getFullData()?.file
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
			computed('files', () => this.store.getFullData()?.file.filter((f) => !f.isDeleted))
		),
		file_state: this.makeQuery(
			'file_state',
			computed('fileStates', () => this.store.getFullData()?.file_state)
		),
		user: {
			...this.makeQuery(
				'user',
				computed('user', () => this.store.getFullData()?.user)
			),
		},
	}

	private sendPendingUpdates() {
		if (this.socket.isDisposed) return

		const updates = this.pendingUpdates
		this.pendingUpdates = []
		for (const update of updates) {
			assert(update.type === 'mutator', 'do not do legacy updates')
			this.socket.sendMessage(update as any)
		}

		this.timeout = undefined
	}

	private makeCrud(signal: AbortSignal): SchemaCRUD<TlaSchema> {
		const getAllData = () => assertExists(this.store.getFullData(), 'store not initialized')
		return mapObjectMapValues(schema.tables, (tableName, table) => {
			const getExisting = (data: any) =>
				getAllData()[tableName].find((row: any) =>
					table.primaryKey.every((key) => row[key] === data[key])
				)
			const apply = (update: ZRowUpdate) =>
				this.store.updateOptimisticData([update], this.currentMutationId)
			return {
				insert: async (data: any) => {
					assert(!signal.aborted, 'missing await in mutator')
					assert(!getExisting(data), 'row already exists')
					apply({ event: 'insert', table: tableName, row: data })
				},
				upsert: async (data: any) => {
					assert(!signal.aborted, 'missing await in mutator')
					apply({ event: getExisting(data) ? 'update' : 'insert', table: tableName, row: data })
				},
				delete: async (data: any) => {
					assert(!signal.aborted, 'missing await in mutator')
					apply({ event: 'delete', table: tableName, row: data })
				},
				update: async (data: any) => {
					assert(!signal.aborted, 'missing await in mutator')
					assert(getExisting(data), 'row not found')
					apply({ event: 'update', table: tableName, row: data })
				},
			} satisfies TableCRUD<TlaSchema['tables'][keyof TlaSchema['tables']]>
		})
	}
}
