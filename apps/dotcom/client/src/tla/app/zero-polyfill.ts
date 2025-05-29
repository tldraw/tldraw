import { MakeEntityQueriesFromSchema } from '@rocicorp/zero'
import type { MakeCustomMutatorInterfaces } from '@rocicorp/zero/out/zero-client/src/client/custom'
import type { SchemaCRUD } from '@rocicorp/zero/out/zql/src/mutate/custom'
import {
	OptimisticAppStore,
	TlaMutators,
	TlaSchema,
	ZClientSentMessage,
	ZErrorCode,
	ZServerSentMessage,
	createMutators,
	schema,
} from '@tldraw/dotcom-shared'
import { ClientWebSocketAdapter, TLSyncErrorCloseEventReason } from '@tldraw/sync-core'
import {
	ExecutionQueue,
	assert,
	deferAsyncEffects,
	mapObjectMapValues,
	objectMapKeys,
	sleep,
	transact,
	uniqueId,
} from 'tldraw'
import { TLAppUiContextType } from '../utils/app-ui-events'
import { ClientCRUD } from './ClientCRUD'
import { ClientQuery } from './ClientQuery'

export class Zero {
	private socket: ClientWebSocketAdapter
	private store = new OptimisticAppStore()
	private pendingUpdates: ZClientSentMessage[] = []
	private timeout: NodeJS.Timeout | undefined = undefined
	private clientTooOld = false
	private didReceiveFirstMessage = false

	query: MakeEntityQueriesFromSchema<TlaSchema>

	constructor(
		private opts: {
			userId: string
			getUri(): Promise<string>
			onMutationRejected(errorCode: ZErrorCode): void
			onClientTooOld(): void
			trackEvent: TLAppUiContextType
		}
	) {
		this.query = this.makeQuery(new AbortController().signal) as any
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
		const mutationQueue = new ExecutionQueue()
		const mutatorWrapper = (name: string, mutatorFn: any) => {
			return async (props: any) => {
				await mutationQueue.push(async () => {
					if (this.clientTooOld) {
						this.opts.onMutationRejected('client_too_old')
						return
					}
					const controller = new AbortController()
					const mutationId = uniqueId()
					const mutate = this.makeCrud(controller.signal, mutationId)
					const query = this.makeQuery(controller.signal)
					try {
						await deferAsyncEffects(() => mutatorFn({ mutate, query, location: 'client' }, props))
					} finally {
						controller.abort()
					}
					this.pendingUpdates.push({
						type: 'mutator',
						mutationId,
						name,
						props,
					})
					if (!this.timeout) {
						this.timeout = setTimeout(() => {
							this.sendPendingUpdates()
						}, 50)
					}
				})
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

	private makeCrud(signal: AbortSignal, mutationId: string): SchemaCRUD<TlaSchema> {
		return mapObjectMapValues(
			schema.tables,
			(_, table) => new ClientCRUD(signal, this.store, table, mutationId)
		)
	}

	private makeQuery(signal: AbortSignal) {
		return mapObjectMapValues(
			schema.tables,
			(_, table) => new ClientQuery(signal, this.store, false, table.name)
		)
	}
}
