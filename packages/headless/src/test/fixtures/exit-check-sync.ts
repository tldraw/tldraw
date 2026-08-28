import { TLGeoShape, createShapeId } from '@tldraw/editor'
import { TLSocketRoom } from '@tldraw/sync-core'
import { TLRecord, createTLSchema } from '@tldraw/tlschema'
import { WebSocketServer } from 'ws'
import { connectHeadlessEditor } from '../../lib/connectHeadlessEditor'
import { createHeadlessEditor } from '../../lib/createHeadlessEditor'

// A full sync session over a real websocket, then a clean shutdown. Guards the
// prune-timer race: a session's close handshake landing after room.close() used to
// schedule a 5s timer that kept the process alive past this point.
const room = new TLSocketRoom<TLRecord, void>({ schema: createTLSchema() })
const wss = new WebSocketServer({ port: 0 })
wss.on('connection', (ws, req) => {
	const url = new URL(req.url!, 'http://localhost')
	room.handleSocketConnect({
		sessionId: url.searchParams.get('sessionId') ?? 'exit-check',
		socket: ws,
	})
})
await new Promise<void>((resolve) => wss.on('listening', () => resolve()))
const address = wss.address()
if (typeof address === 'string' || address === null) throw new Error('expected a port')

const editor = createHeadlessEditor()
const connection = await connectHeadlessEditor(editor, {
	uri: `ws://127.0.0.1:${address.port}`,
	connectTimeout: 5000,
})
editor.createShape<TLGeoShape>({
	id: createShapeId(),
	type: 'geo',
	x: 0,
	y: 0,
	props: { w: 100, h: 100 },
})
await connection.flush()
connection.close()
editor.dispose()
room.close()
await new Promise<void>((resolve) => wss.close(() => resolve()))
// eslint-disable-next-line no-console
console.log('SYNC_CLOSED_OK', Date.now())
