import { RoomSnapshot, TLSocketRoom } from '@tldraw/sync-core'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'

// For this example we're just saving data to the local filesystem
const DIR = './.rooms'
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

// We'll keep an in-memory map of rooms and their data
interface RoomState {
	room: TLSocketRoom<any, void>
	id: string
	needsPersist: boolean
}
const rooms = new Map<string, RoomState>()

// Very simple mutex using promise chaining, to avoid race conditions
// when loading rooms. In production you probably want one mutex per room
// to avoid unnecessary blocking!
let mutex = Promise.resolve<null | Error>(null)

export async function makeOrLoadRoom(roomId: string) {
	mutex = mutex
		.then(async () => {
			if (rooms.has(roomId)) {
				const roomState = await rooms.get(roomId)!
				if (!roomState.room.isClosed()) {
					return null // all good
				}
			}
			console.log('loading room', roomId)
			const initialSnapshot = await readSnapshotIfExists(roomId)

			const roomState: RoomState = {
				needsPersist: false,
				id: roomId,
				room: new TLSocketRoom({
					initialSnapshot,
					onSessionRemoved(room, args) {
						console.log('client disconnected', args.sessionId, roomId)
						if (args.numSessionsRemaining === 0) {
							console.log('closing room', roomId)
							room.close()
						}
					},
					onDataChange() {
						roomState.needsPersist = true
					},
				}),
			}
			rooms.set(roomId, roomState)
			return null // all good
		})
		.catch((error) => {
			// return errors as normal values to avoid stopping the mutex chain
			return error
		})

	const err = await mutex
	if (err) throw err
	return rooms.get(roomId)!.room
}

// Do persistence on a regular interval.
// In production you probably want a smarter system with throttling.
setInterval(() => {
	for (const roomState of rooms.values()) {
		if (roomState.needsPersist) {
			// persist room
			roomState.needsPersist = false
			console.log('saving snapshot', roomState.id)
			saveSnapshot(roomState.id, roomState.room.getCurrentSnapshot())
		}
		if (roomState.room.isClosed()) {
			console.log('deleting room', roomState.id)
			rooms.delete(roomState.id)
		}
	}
}, 2000)
