import type { MakeCustomMutatorInterfaces, SchemaQuery } from '@rocicorp/zero'
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
	promiseWithResolve,
	react,
	sleep,
	transact,
	uniqueId,
} from 'tldraw'
import type { SchemaCRUD } from '../../../../../../node_modules/@rocicorp/zero/out/zql/src/mutate/crud'
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

	query: SchemaQuery<TlaSchema>

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
			return (props: any) => {
				const server = promiseWithResolve()
				const client = mutationQueue.push(async () => {
					if (this.clientTooOld) {
						this.opts.onMutationRejected('client_too_old')
						return
					}
					const controller = new AbortController()
					const mutationId = uniqueId()
					const mutate = this.makeCrud(controller.signal, mutationId)
					const query = this.makeQuery(controller.signal)
					const run = this.makeRun(controller.signal)
					try {
						await deferAsyncEffects(() =>
							mutatorFn({ mutate, query, location: 'client', run }, props)
						)
					} catch (e) {
						console.error(e)
						throw e
					} finally {
						controller.abort()
					}
					let didResolve = false
					const unlisten = react('resolve server promise', () => {
						if (
							!didResolve &&
							this.store.getOptimisticUpdates().filter((u) => u.mutationId === mutationId)
								.length === 0
						) {
							didResolve = true
							server.resolve(null)
							queueMicrotask(() => unlisten?.())
						}
					})
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
				return { client, server }
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

	mutate: MakeCustomMutatorInterfaces<TlaSchema, TlaMutators, unknown>

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

	// New Zero API methods that take queries created by createBuilder(schema)
	// Using 'any' type for query to be compatible with Zero's Query types which use getters
	materialize<T>(query: any): {
		data: T
		addListener(listener: (data: T) => void): void
		destroy(): void
	} {
		const clientQuery = this.queryFromAst(query)
		return clientQuery.materialize()
	}

	preload(query: any): { complete: Promise<void> } {
		const clientQuery = this.queryFromAst(query)
		return clientQuery.preload()
	}

	async run<T>(query: any): Promise<T> {
		const clientQuery = this.queryFromAst(query)
		return (await clientQuery.run()) as T
	}

	private queryFromAst(query: any): ClientQuery<any, boolean> {
		const ast = query.ast
		const tableName = ast.table as keyof TlaSchema['tables']
		const isSingular = query.format?.singular ?? false
		const signal = new AbortController().signal

		// Build a ClientQuery from the Zero query AST
		let clientQuery: ClientQuery<any, boolean> = new ClientQuery(
			signal,
			this.store,
			false,
			tableName
		)

		// Apply where conditions from AST
		if (ast.where) {
			const conditions = this.extractWhereConditions(ast.where)
			for (const [key, value] of conditions) {
				clientQuery = clientQuery.where(key, '=', value)
			}
		}

		// Apply one() if singular
		if (isSingular) {
			clientQuery = clientQuery.one()
		}

		return clientQuery
	}

	private extractWhereConditionsForQuery(where: any): [string, any][] {
		return this.extractWhereConditions(where)
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

	private makeRun(signal: AbortSignal) {
		return async <T>(query: any): Promise<T> => {
			assert(!signal.aborted, 'Query usage outside of mutator scope')
			const ast = query.ast
			const tableName = ast.table as keyof TlaSchema['tables']
			const isSingular = query.format?.singular ?? false

			// Build a ClientQuery from the Zero query AST
			let clientQuery: ClientQuery<any, boolean> = new ClientQuery(
				signal,
				this.store,
				false,
				tableName
			)

			// Apply where conditions from AST
			if (ast.where) {
				const conditions = this.extractWhereConditions(ast.where)
				for (const [key, value] of conditions) {
					clientQuery = clientQuery.where(key, '=', value)
				}
			}

			// Apply one() if singular
			if (isSingular) {
				clientQuery = clientQuery.one()
			}

			return (await clientQuery.run()) as T
		}
	}

	private extractWhereConditions(where: any): [string, any][] {
		const conditions: [string, any][] = []

		if (where.type === 'simple') {
			// Simple condition: { type: 'simple', left: { type: 'column', name: 'id' }, op: '=', right: { type: 'literal', value: '...' } }
			if (where.left?.type === 'column' && where.right?.type === 'literal') {
				conditions.push([where.left.name, where.right.value])
			}
		} else if (where.type === 'and') {
			// AND condition: { type: 'and', conditions: [...] }
			for (const cond of where.conditions || []) {
				conditions.push(...this.extractWhereConditions(cond))
			}
		}

		return conditions
	}
}
