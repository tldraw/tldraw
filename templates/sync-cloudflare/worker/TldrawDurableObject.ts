import { DurableObjectSqliteSyncWrapper, SQLiteSyncStorage, TLSocketRoom } from '@tldraw/sync-core'
import {
	createTLSchema,
	// defaultBindingSchemas,
	defaultShapeSchemas,
	TLRecord,
} from '@tldraw/tlschema'
import { DurableObject } from 'cloudflare:workers'
import { AutoRouter, error, IRequest } from 'itty-router'

// add custom shapes and bindings here if needed:
const schema = createTLSchema({
	shapes: { ...defaultShapeSchemas },
	// bindings: { ...defaultBindingSchemas },
})

// Each whiteboard room is hosted in a Durable Object.
// https://developers.cloudflare.com/durable-objects/
//
// There's only ever one durable object instance per room. Room state is
// persisted automatically to SQLite via ctx.storage.
export class TldrawDurableObject extends DurableObject {
	private room: TLSocketRoom<TLRecord, void>

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env)
		// Create SQLite-backed storage - persists automatically to Durable Object storage
		const sql = new DurableObjectSqliteSyncWrapper(ctx.storage)
		const storage = new SQLiteSyncStorage<TLRecord>({ sql })

		// Create the room that handles sync protocol
		this.room = new TLSocketRoom<TLRecord, void>({ schema, storage })
	}

	private readonly router = AutoRouter({ catch: (e) => error(e) }).get(
		'/api/connect/:roomId',
		(request) => this.handleConnect(request)
	)

	// Entry point for all requests to the Durable Object
	fetch(request: Request): Response | Promise<Response> {
		return this.router.fetch(request)
	}

	// Handle new WebSocket connection requests
	async handleConnect(request: IRequest) {
		const sessionId = request.query.sessionId as string
		if (!sessionId) return error(400, 'Missing sessionId')

		// Create the websocket pair for the client
		const { 0: clientWebSocket, 1: serverWebSocket } = new WebSocketPair()
		serverWebSocket.accept()

		// Connect to the room
		this.room.handleSocketConnect({ sessionId, socket: serverWebSocket })

		return new Response(null, { status: 101, webSocket: clientWebSocket })
	}
}
