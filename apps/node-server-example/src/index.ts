import websocketPlugin from '@fastify/websocket'
import { TLSocketRoom } from '@tldraw/sync-core'
import fastify from 'fastify'
import { readFile, writeFile } from 'fs/promises'

const PORT = Number(process.env.PORT) || 5858

const app = fastify()

interface RoomState {
	room: TLSocketRoom<any, void>
	id: string
	needsPersist: boolean
}
const rooms = new Map<string, RoomState>()

async function readJSONFileIfExists(path: string) {
	try {
		const data = await readFile(path)
		return JSON.parse(data.toString()) ?? undefined
	} catch (e) {
		return undefined
	}
}

async function makeOrLoadRoom(roomId: string) {
	if (rooms.has(roomId)) {
		const roomState = rooms.get(roomId)!
		if (!roomState.room.isClosed()) {
			return roomState.room
		}
	}
	const initialSnapshot = await readJSONFileIfExists(`./.rooms/${roomId}`)
	const roomState: RoomState = {
		needsPersist: false,
		id: roomId,
		room: new TLSocketRoom({
			initialSnapshot,
			onSessionRemoved(room, args) {
				if (args.numSessionsRemaining === 0) {
					room.close()
				}
			},
			onDataChange() {
				roomState.needsPersist = true
			},
		}),
	}

	rooms.set(roomId, roomState)

	return roomState.room
}

app.register(websocketPlugin)
app.register(async (app) => {
	app.get('/connect/:roomId', { websocket: true }, async (socket, req) => {
		const roomId = (req.params as any).roomId as string
		const sessionKey = (req.query as any)?.['sessionKey'] as string | undefined
		if (typeof sessionKey !== 'string') {
			socket.close(4000, 'sessionKey must be a string')
			return
		}
		const room = await makeOrLoadRoom(roomId)
		room.handleSocketConnect(sessionKey, socket)
	})
})
app.listen({ port: PORT }, (err) => {
	if (err) {
		// eslint-disable-next-line no-console
		console.error(err)
		process.exit(1)
	}

	// eslint-disable-next-line no-console
	console.log(`Server started on port ${PORT}`)
})

// do persistence on an interval
setInterval(() => {
	for (const room of rooms.values()) {
		if (room.needsPersist) {
			// persist room
			room.needsPersist = false
			const snapshot = room.room.getCurrentSnapshot()
			writeFile(`./.rooms/${room.id}`, JSON.stringify(snapshot))
		}
		if (room.room.isClosed()) {
			rooms.delete(room.id)
		}
	}
}, 2000)
