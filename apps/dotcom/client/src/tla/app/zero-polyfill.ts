import type { AST, TableMutator, TableSchema, TypedView } from '@rocicorp/zero'
import {
	OptimisticAppStore,
	TlaFile,
	TlaFileState,
	TlaGroup,
	TlaGroupFile,
	TlaGroupUser,
	TlaSchema,
	TlaUser,
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
	compact,
	computed,
	deferAsyncEffects,
	mapObjectMapValues,
	objectMapKeys,
	promiseWithResolve,
	react,
	sleep,
	transact,
	uniqueId,
} from 'tldraw'
import { TLAppUiContextType } from '../utils/app-ui-events'
import { ClientCRUD } from './ClientCRUD'

export class Zero {
	private socket: ClientWebSocketAdapter
	private store = new OptimisticAppStore()
	private pendingUpdates: ZClientSentMessage[] = []
	private timeout: NodeJS.Timeout | undefined = undefined
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
					const query = this.makeMutatorQuery(controller.signal)
					const run = (q: unknown) => {
						assert(!controller.signal.aborted, 'run() usage outside of mutator scope')
						return this.executeAST((q as { ast: AST }).ast, false)
					}
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

	mutate: ReturnType<typeof createMutators>

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

	/**
	 * Materialize a query built with createBuilder(schema).
	 * Extracts the AST and creates a reactive view over the internal store.
	 * Also handles QueryRequest from synced queries by evaluating with context.
	 */
	materialize<T>(query: unknown) {
		// Handle QueryRequest from synced queries - extract the actual query
		let actualQuery = query
		const maybeQueryRequest = query as {
			query?: { fn?(opts: unknown): unknown }
			args?: unknown
		}
		if (maybeQueryRequest.query?.fn) {
			// This is a QueryRequest - call fn with context to get the actual Query
			actualQuery = maybeQueryRequest.query.fn({
				args: maybeQueryRequest.args,
				ctx: { userId: this.opts.userId },
			})
		}
		const ast = (actualQuery as { ast: AST }).ast
		const data$ = computed(`${ast.table} materialize`, () => this.executeAST(ast))
		let unlisten = () => {}
		return {
			get data() {
				return data$.__unsafe__getWithoutCapture() as T
			},
			addListener: (
				listener: (data: T, resultType: 'unknown' | 'complete' | 'error', error?: unknown) => void
			) => {
				unlisten = react(`${ast.table} listener`, () => {
					const data = data$.get()
					if (data === undefined) return
					listener(data as T, 'complete', undefined)
				})
				return unlisten
			},
			updateTTL() {},
			destroy() {
				unlisten()
				unlisten = () => {}
			},
		} as TypedView<T>
	}

	/**
	 * Preload a query - waits for initial data to be available.
	 */
	preload(query: unknown): { cleanup(): void; complete: Promise<void> } {
		// Handle QueryRequest from synced queries - extract the actual query
		let actualQuery = query
		const maybeQueryRequest = query as {
			query?: { fn?(opts: unknown): unknown }
			args?: unknown
		}
		if (maybeQueryRequest.query?.fn) {
			actualQuery = maybeQueryRequest.query.fn({
				args: maybeQueryRequest.args,
				ctx: { userId: this.opts.userId },
			})
		}
		// Validate it's a proper query with AST
		const _ = (actualQuery as { ast: AST }).ast

		if (this.store.getFullData()) {
			return { cleanup: () => {}, complete: Promise.resolve() }
		}

		let interval: ReturnType<typeof setInterval> | null = null
		const load = new Promise<void>((resolve) => {
			interval = setInterval(() => {
				if (this.store.getFullData()) {
					clearInterval(interval!)
					interval = null
					resolve()
				}
			}, 10)
		})

		const timeout = sleep(10_000).then(() => {
			throw new Error('Timed out waiting for data')
		})

		return {
			cleanup: () => {
				if (interval) clearInterval(interval)
			},
			complete: Promise.race([load, timeout]),
		}
	}

	/**
	 * Execute an AST query against the internal store.
	 * Handles table queries with where clauses and relations.
	 */
	private executeAST(ast: AST, tolerateUnsetData = true): unknown {
		const data = this.store.getFullData()
		if (!data) {
			assert(tolerateUnsetData, 'Data is not set yet')
			return ast.limit === 1 ? undefined : []
		}

		const tableName = ast.table as keyof typeof data
		let rows = data[tableName] as unknown[]

		// Apply where conditions
		if (ast.where) {
			rows = rows.filter((row) =>
				this.evaluateCondition(ast.where!, row as Record<string, unknown>)
			)
		}

		// Handle table-specific relation expansion
		if (tableName === 'user') {
			rows = rows.map((row) => {
				const user = row as TlaUser
				const userFairies = data.user_fairies.find((uf) => uf.userId === user.id)
				return {
					...user,
					fairies: userFairies?.fairies || null,
					fairyAccessExpiresAt: userFairies?.fairyAccessExpiresAt ?? null,
					fairyLimit: userFairies?.fairyLimit ?? null,
				}
			})
		}

		if (tableName === 'file_state' && ast.related?.length) {
			rows = compact(
				rows.map((row) => {
					const fileState = row as TlaFileState
					const file = data.file.find((f) => f.id === fileState.fileId)
					if (!file) return null
					return {
						...fileState,
						file,
						fairyState:
							data.file_fairies.find((ff) => ff.fileId === fileState.fileId)?.fairyState || null,
					}
				})
			)
		}

		if (tableName === 'group_user' && ast.related?.length) {
			rows = rows.map((row) => {
				const groupUser = row as TlaGroupUser
				const group = data.group.find((g: TlaGroup) => g.id === groupUser.groupId)
				const groupFiles = compact(
					data.group_file
						.filter((gf: TlaGroupFile) => gf.groupId === groupUser.groupId)
						.map((gf: TlaGroupFile) => {
							const file = data.file.find((f: TlaFile) => f.id === gf.fileId)
							if (!file) return null
							return { ...gf, file }
						})
				)
				const groupMembers = data.group_user.filter(
					(gu: TlaGroupUser) => gu.groupId === groupUser.groupId
				)
				return {
					...groupUser,
					group,
					groupFiles,
					groupMembers,
				}
			})
		}

		// Apply limit (one() sets limit to 1)
		if (ast.limit === 1) {
			return rows[0]
		}

		return rows
	}

	/**
	 * Evaluate a where condition against a row.
	 */
	private evaluateCondition(
		condition: NonNullable<AST['where']>,
		row: Record<string, unknown>
	): boolean {
		if ('type' in condition) {
			if (condition.type === 'and') {
				return condition.conditions.every((c) => this.evaluateCondition(c, row))
			}
			if (condition.type === 'or') {
				return condition.conditions.some((c) => this.evaluateCondition(c, row))
			}
		}

		// Simple condition: { left, op, right }
		const simpleCondition = condition as {
			left: { name: string }
			op: string
			right: { value: unknown }
		}
		const fieldName = simpleCondition.left?.name
		const op = simpleCondition.op
		const value = simpleCondition.right?.value

		if (!fieldName || !op) return true

		const rowValue = row[fieldName]

		switch (op) {
			case '=':
				return rowValue === value
			case '!=':
				return rowValue !== value
			case '>':
				return (rowValue as number) > (value as number)
			case '<':
				return (rowValue as number) < (value as number)
			case '>=':
				return (rowValue as number) >= (value as number)
			case '<=':
				return (rowValue as number) <= (value as number)
			default:
				return true
		}
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

	private makeCrud(signal: AbortSignal, mutationId: string) {
		return mapObjectMapValues(
			schema.tables,
			(_, table) => new ClientCRUD(signal, this.store, table, mutationId)
		) as { [K in keyof TlaSchema['tables']]: TableMutator<TlaSchema['tables'][K] & TableSchema> }
	}

	/** Query builder for mutator context only */
	private makeMutatorQuery(signal: AbortSignal) {
		return mapObjectMapValues(schema.tables, (_, table) => ({
			where: () => ({
				one: async () => {
					assert(!signal.aborted, 'Query usage outside of mutator scope')
					const data = this.store.getFullData()
					return data?.[table.name as keyof typeof data]?.[0]
				},
				run: async () => {
					assert(!signal.aborted, 'Query usage outside of mutator scope')
					const data = this.store.getFullData()
					return data?.[table.name as keyof typeof data] ?? []
				},
			}),
		}))
	}
}
