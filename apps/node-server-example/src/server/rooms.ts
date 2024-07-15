import { RoomSnapshot, TLSocketRoom } from '@tldraw/sync-core'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'

const DIR = './.rooms'

interface RoomState {
	room: TLSocketRoom<any, void>
	id: string
	needsPersist: boolean
}
const rooms = new Map<string, RoomState>()
// eslint-disable-next-line no-console
const log = console.log

async function readSnapshotIfExists(roomId: string) {
	try {
		const data = await readFile(join(DIR, roomId))
		return JSON.parse(data.toString()) ?? undefined
	} catch (e) {
		return undefined
	}
}
async function saveSnapshot(roomId: string, snapshot: RoomSnapshot) {
	await mkdir(DIR, { recursive: true })
	await writeFile(join(DIR, roomId), JSON.stringify(snapshot))
}

let roomsMutex = Promise.resolve()

export async function makeOrLoadRoom(roomId: string) {
	roomsMutex = roomsMutex.then(async () => {
		if (rooms.has(roomId)) {
			const roomState = await rooms.get(roomId)!
			if (!roomState.room.isClosed()) {
				return
			}
		}
		log('loading room', roomId)
		const initialSnapshot = await readSnapshotIfExists(roomId)

		const roomState: RoomState = {
			needsPersist: false,
			id: roomId,
			room: new TLSocketRoom({
				initialSnapshot,
				onSessionRemoved(room, args) {
					log('client disconnected', args.sessionKey, roomId)
					if (args.numSessionsRemaining === 0) {
						log('closing room', roomId)
						room.close()
					}
				},
				onDataChange() {
					roomState.needsPersist = true
				},
			}),
		}
		rooms.set(roomId, roomState)
	})

	await roomsMutex
	return rooms.get(roomId)!.room
}

// do persistence on a regular interval
setInterval(() => {
	for (const roomState of rooms.values()) {
		if (roomState.needsPersist) {
			// persist room
			roomState.needsPersist = false
			log('saving snapshot', roomState.id)
			saveSnapshot(roomState.id, roomState.room.getCurrentSnapshot())
		}
		if (roomState.room.isClosed()) {
			log('deleting room', roomState.id)
			rooms.delete(roomState.id)
		}
	}
}, 2000)
