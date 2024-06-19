/* eslint-disable no-console */
import { ASClientMessage, ASServerMessage } from '@tldraw/dotcom-shared'
import { DurableObject } from 'cloudflare:workers'
import { Router } from 'itty-router'
import {
	Editor,
	RecordsDiff,
	TLRecord,
	TLStore,
	createEmptyRecordsDiff,
	createTLStore,
	defaultBindingUtils,
	defaultShapeUtils,
	exhaustiveSwitchError,
	squashRecordDiffsMutable,
} from 'tldraw'
import { Environment } from './types'
;(globalThis as any).requestAnimationFrame = (cb: () => void) => setTimeout(cb, 16)
;(globalThis as any).cancelAnimationFrame = clearTimeout

export class AlexSyncDO extends DurableObject<Environment> {
	private readonly editor: Editor
	private readonly store: TLStore

	constructor(state: DurableObjectState, env: Environment) {
		super(state, env)
		console.log('CTOR')

		try {
			this.store = createTLStore()
			this.editor = new Editor({
				store: this.store,
				shapeUtils: defaultShapeUtils,
				bindingUtils: defaultBindingUtils,
				tools: [],
				getContainer: () => null,
			})
		} catch (err) {
			console.log(err)
			throw err
		}

		this.load()
	}

	private loadPromise: Promise<void> | null = null
	async load() {
		if (this.loadPromise) {
			await this.loadPromise
			return
		}

		this.loadPromise = (async () => {
			const records = await this.ctx.storage.list<TLRecord>()
			this.store.mergeRemoteChanges(() => {
				this.store.atomic(() => {
					this.store.put(Array.from(records.values()), 'initialize')
				}, false)
			})
			console.log(`Loaded ${records.size} records`)

			this.store.listen(
				(history) => {
					const toPut = [
						...Object.values(history.changes.added),
						...Object.values(history.changes.updated).map(([_, to]) => to),
					]
					const toDelete = Object.keys(history.changes.removed)

					for (const b of batch(toPut, 128)) {
						this.ctx.storage.put(Object.fromEntries(b.map((r) => [r.id, r])), {
							allowUnconfirmed: true,
						})
					}
					for (const b of batch(toDelete, 128)) {
						this.ctx.storage.delete(b, {
							allowUnconfirmed: true,
						})
					}

					console.log(`Saved ${toPut.length} records, deleted ${toDelete.length} records`)
				},
				{ scope: 'document' }
			)

			this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'))
		})()
	}

	readonly router = Router().get('/alex-sync/:roomId', async () => {
		const { 0: clientWebSocket, 1: serverWebSocket } = new WebSocketPair()

		this.ctx.acceptWebSocket(serverWebSocket)

		return new Response(null, {
			status: 101,
			webSocket: clientWebSocket,
		})
	})

	override async fetch(request: Request): Promise<Response> {
		console.log('FETCH', request.url)
		await this.load()
		try {
			return await this.router.handle(request)
		} catch (err) {
			console.error(err)
			return new Response('Something went wrong', { status: 500 })
		}
	}

	override async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
		await this.load()
		const data: ASClientMessage = JSON.parse(message.toString())

		switch (data.type) {
			case 'load':
				this.sendTo(ws, {
					type: 'load',
					snapshot: { ...this.store.serialize('document'), ...this.store.serialize('presence') },
				})
				break
			case 'update': {
				const actualChanges = this.store.extractingChanges(() => {
					this.store.mergeRemoteChanges(() => {
						this.store.applyDiff(data.changes)
					})
				})

				const filteredChanges: RecordsDiff<TLRecord> =
					this.store.filterChangesByScope(actualChanges, 'document') ?? createEmptyRecordsDiff()

				squashRecordDiffsMutable(filteredChanges, [
					this.store.filterChangesByScope(actualChanges, 'presence') ?? createEmptyRecordsDiff(),
				])

				this.broadcast({
					type: 'update',
					clientId: data.clientId,
					clientVersion: data.clientVersion,
					changes: filteredChanges,
				})
				break
			}
			default:
				exhaustiveSwitchError(data, 'type')
		}
	}

	sendTo(ws: WebSocket, message: ASServerMessage) {
		ws.send(JSON.stringify(message))
	}

	broadcast(message: ASServerMessage) {
		const serialized = JSON.stringify(message)
		for (const ws of this.ctx.getWebSockets()) {
			ws.send(serialized)
		}
	}
}

function batch<T>(arr: readonly T[], size: number) {
	const batches: T[][] = []
	for (let i = 0; i < arr.length; i += size) {
		batches.push(arr.slice(i, i + size))
	}
	return batches
}
