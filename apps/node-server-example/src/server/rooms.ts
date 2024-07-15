import { RoomSnapshot, TLSocketRoom } from '@tldraw/sync-core'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'

const DIR = './.rooms'

interface RoomState {
	room: TLSocketRoom<any, void>
	id: string
	needsPersist: boolean
}
const rooms = new Map<string, Promise<RoomState>>()
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

export async function makeOrLoadRoom(roomId: string) {
	if (rooms.has(roomId)) {
		const roomState = await rooms.get(roomId)!
		if (!roomState.room.isClosed()) {
			return roomState.room
		}
	}
	log('loading room', roomId)

	rooms.set(
		roomId,
		readSnapshotIfExists(roomId).then((initialSnapshot) => {
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
			return roomState
		})
	)

	return (await rooms.get(roomId))!.room
}

// do persistence on an interval
setInterval(async () => {
	for (const _roomState of rooms.values()) {
		const roomState = await _roomState
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
